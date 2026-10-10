#include <Arduino.h>
#include <EEPROM.h>
#include "identidade.h"
#include "credentials.h"

// Namespace anônimo: essas variáveis e funções só são visíveis dentro deste arquivo (.cpp)
namespace {

const uint16_t EEPROM_SIZE = 256;          // Tamanho alocado na EEPROM simulada na flash
const uint16_t IDENTIDADE_OFFSET = 144;    // Endereço (offset) onde os dados começam a ser gravados

// 'Carimbo' mágico (Magic Number) estruturado em "THD2" 
// Serve para sabermos rapidamente se a área de memória contém dados válidos do ThermoX.
const uint32_t IDENTIDADE_MAGIC = 0x54484431UL; 

// Estrutura que define como os dados são armazenados fisicamente na EEPROM
struct IdentidadeConfig {
  uint32_t magic;           // Deve bater com IDENTIDADE_MAGIC
  uint32_t dispositivoId;   // ID numérico
  uint32_t fornoId;         // ID do forno atrelado
  char numeroSerie[31];     // Serial em string (ex: "THX-00001")
  uint32_t checksum;        // Soma de verificação para garantir integridade dos dados
};

// Instância em RAM da identidade
IdentidadeConfig identidade;
bool identidadeDisponivel = false; // Flag indicando se a identidade foi carregada com sucesso

// Calcula um FNV-1a Hash simples da estrutura (exceto do próprio checksum no final)
uint32_t calcularChecksum(const IdentidadeConfig& cfg) {
  const uint8_t* p = reinterpret_cast<const uint8_t*>(&cfg);
  uint32_t soma = 2166136261UL; // Valor inicial do FNV offset basis

  for (size_t i = 0; i < sizeof(IdentidadeConfig) - sizeof(uint32_t); i++) {
    soma ^= p[i];
    soma *= 16777619UL; // FNV prime
  }

  return soma;
}

// Verifica se a estrutura em RAM contém dados válidos e íntegros
bool identidadeValida() {
  if (identidade.magic != IDENTIDADE_MAGIC) return false;
  if (identidade.dispositivoId == 0) return false;
  if (identidade.fornoId == 0) return false;
  if (identidade.numeroSerie[0] == '\0') return false;

  // Se tudo passou, verifica se os dados não foram corrompidos
  return identidade.checksum == calcularChecksum(identidade);
}

// Grava a configuração de fábrica, baseada no que está em 'credentials.h'
void gravarIdentidadeInicial() {
  memset(&identidade, 0, sizeof(identidade)); // Limpa a estrutura em RAM

  identidade.magic = IDENTIDADE_MAGIC;
  identidade.dispositivoId = DISPOSITIVO_ID_INICIAL;
  identidade.fornoId = FORNO_ID_INICIAL;

  // Copia o texto do #define de forma segura (evita buffer overflow)
  strncpy(
    identidade.numeroSerie,
    NUMERO_SERIE_INICIAL,
    sizeof(identidade.numeroSerie) - 1
  );
  identidade.numeroSerie[sizeof(identidade.numeroSerie) - 1] = '\0'; // Garante terminação nula

  // Calcula e insere o checksum antes de salvar
  identidade.checksum = calcularChecksum(identidade);

  // Escreve na EEPROM (ainda em memória) e executa commit (grava na flash real)
  EEPROM.put(IDENTIDADE_OFFSET, identidade);
  EEPROM.commit();

  Serial.println(F("[IDENTIDADE] Identidade inicial gravada na EEPROM."));
}

} // Fecha o namespace anônimo

// ==============================================================================
// FUNÇÕES PÚBLICAS
// ==============================================================================

// Inicializa a EEPROM, lê os dados salvos, valida o checksum.
void identidadeInit() {
  EEPROM.begin(EEPROM_SIZE);
  EEPROM.get(IDENTIDADE_OFFSET, identidade); // Puxa dados da Flash para a RAM

  // Se for válida, tudo OK
  if (identidadeValida()) {
    identidadeDisponivel = true;
    Serial.println(F("[IDENTIDADE] Identidade valida recuperada da EEPROM."));
    return;
  }

  // Proteção contra sobrescrita indevida:
  // Se o MAGIC está correto mas o CHECKSUM está errado, os dados corromperam 
  // fisicamente. É melhor travar do que sobrescrever e perder quem era o dispositivo.
  if (identidade.magic == IDENTIDADE_MAGIC) {
    Serial.println(F("[IDENTIDADE] ERRO: estrutura invalida ou corrompida detectada."));
    Serial.println(F("[IDENTIDADE] Identidade NAO sera sobrescrita automaticamente."));
    return;
  }

  // Se chegou aqui, a área da EEPROM estava limpa (ou com outro MAGIC). 
  // Grava pela primeira vez usando credentials.h
  gravarIdentidadeInicial();
  identidadeDisponivel = true;
}

// Getters (Acessores de dados)
uint32_t identidadeDispositivoId() { return identidade.dispositivoId; }
uint32_t identidadeFornoId() { return identidade.fornoId; }
const char* identidadeNumeroSerie() { return identidade.numeroSerie; }

void identidadeImprimir() {
  Serial.print(F("[IDENTIDADE] Numero de serie: "));
  Serial.println(identidade.numeroSerie);

  Serial.print(F("[IDENTIDADE] Dispositivo ID: "));
  Serial.println(identidade.dispositivoId);

  Serial.print(F("[IDENTIDADE] Forno ID: "));
  Serial.println(identidade.fornoId);
}

// Gravação manual via entrada no Monitor Serial (ex: comando "SETID THX-00002")
bool identidadeDefinirManualmente(const char* novoID) {
  int idNum = 0;
  
  // Extrai o número da string, considerando o formato "THX-XXXXX"
  if (strncmp(novoID, "THX-", 4) == 0) {
    idNum = atoi(novoID + 4);
  } else {
    // Caso contrário (ex: usuário digitou só "2"), a lógica atual ignora
    // Se quiser permitir a digitação apenas do número, 
    // descomente a linha abaixo:
    // idNum = atoi(novoID);
  }

  // Falha na validação do novo ID
  if (idNum <= 0) {
    return false; // Formato inválido ou ID zero
  }

  // Monta a nova estrutura em RAM
  identidade.magic = 0x54484431UL; // IDENTIDADE_MAGIC
  identidade.dispositivoId = idNum;
  identidade.fornoId = FORNO_ID_INICIAL; // O forno continua sendo puxado da fábrica
  
  strncpy(identidade.numeroSerie, novoID, sizeof(identidade.numeroSerie) - 1);
  identidade.numeroSerie[sizeof(identidade.numeroSerie) - 1] = '\0';

  // Recalcula manualmente o checksum.
  // Observação: calcularChecksum() poderia ser chamada aqui, já que está no
  // mesmo arquivo, o que tornaria o código mais limpo.
  const uint8_t* p = reinterpret_cast<const uint8_t*>(&identidade);
  uint32_t soma = 2166136261UL;
  for (size_t i = 0; i < sizeof(identidade) - sizeof(uint32_t); i++) {
    soma ^= p[i];
    soma *= 16777619UL;
  }
  identidade.checksum = soma;

  // Salva permanentemente na flash
  EEPROM.put(144, identidade); // 144 = IDENTIDADE_OFFSET
  EEPROM.commit();
  
  identidadeDisponivel = true;
  return true;
}

