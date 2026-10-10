#include <Arduino.h>
#include <string.h>

#include "config.h"
#include "protocolo_alutal.h"
#include "sensores.h"

// ============================================================
// MOSTRA FRAME EM HEX (Apenas para Debug/Log via Serial)
// Imprime cada byte do array de resposta como Hexadecimal.
// ============================================================
static void dumpHex(const byte* p, size_t n) {
  for (size_t i = 0; i < n; i++) {
    // Adiciona um zero à esquerda para números menores que 16 (ex: '0F' em vez de 'F')
    if (p[i] < 0x10) {
      Serial.print('0');
    }
    Serial.print(p[i], HEX);
    Serial.print(' ');
  }
  Serial.println();
}

// ============================================================
// EXTRAI O ID DO MODULO
//
// FORMATO OBSERVADO NO SEU EQUIPAMENTO:
//
// 3C 32 ID 04 72 ...
//  ↑  ↑  ↑
//  <  2  ID
//
// EXEMPLOS:
//
// MODULO 1: 3C 32 31 04 ... (31 = 1 na tabela Alutal)
// MODULO 10: 3C 32 3A 04 ... (3A = 10)
// MODULO 31: 3C 32 4F 04 ... (4F = 31)
//
// Portanto, a regra de cálculo usada pela Alutal para o ID é:
// modulo = ID_Recebido - 0x30
// ============================================================
static bool ExtrairId(const byte* pacote, size_t tamanho, uint8_t moduloEsperado, uint8_t &idOut) {
  idOut = 0;

  // Proteção básica contra ponteiros nulos ou quadros muito curtos
  if (pacote == nullptr || tamanho < 3) {
    return false;
  }

  // ==========================================================
  // PROCURA PELO CABEÇALHO PADRÃO "3C 32" e extrai o byte seguinte
  // ==========================================================
  for (size_t i = 0; i + 2 < tamanho; i++) {
    
    if (pacote[i] != 0x3C || pacote[i + 1] != 0x32) {
      continue; // Não achou, continua procurando no array
    }

    // Achou o cabeçalho. Pega o byte de ID.
    byte idByte = pacote[i + 2];

    // ==========================================================
    // VALIDAÇÃO DE FAIXA DO ID
    // 31 = Módulo 1
    // 4F = Módulo 31
    // ==========================================================
    if (idByte < 0x31 || idByte > 0x4F) {
      continue;
    }

    uint8_t modulo = idByte - 0x30; // Converte do byte cifrado para o ID real (1-31)

    // Dupla checagem para evitar problemas caso o cálculo estoure a faixa suportada
    if (modulo < 1 || modulo > 31) {
      continue;
    }

    idOut = modulo;

    // ==========================================================
    // Se o solicitante mandou procurar um módulo específico (ex: poll no ID 5),
    // rejeita se o módulo que respondeu for diferente (evita conflitos na rede)
    // ==========================================================
    if (moduloEsperado >= 1 && moduloEsperado <= 31) {
      if (modulo != moduloEsperado) {
        return false;
      }
    }

    return true; // Encontrou e validou um ID com sucesso
  }

  return false;
}

// ============================================================
// PROCESSA FRAME ALUTAL PRINCIPAL
// Decodifica a temperatura de dentro do payload
// ============================================================
bool processarFrameAlutal(const byte* pacote, size_t tamanho, uint8_t moduloEsperado) {
  
  // Quadro deve ter no mínimo 8 bytes para caber o cabeçalho, ID, marcador 72 e 4 bytes de temperatura.
  if (pacote == nullptr || tamanho < 8) {
    return false;
  }

  // ==========================================================
  // LOG DE DEPURAÇÃO
  // ==========================================================
  Serial.print(F("<< Resposta Recebida (HEX): "));
  dumpHex(pacote, tamanho);

  // ==========================================================
  // EXTRAI E VALIDA ID
  // ==========================================================
  uint8_t idModulo = 0;
  bool idOK = ExtrairId(pacote, tamanho, moduloEsperado, idModulo);

  if (!idOK) {
    Serial.print(F("[PROTOCOLO] ID invalido. Esperado MODULO "));
    Serial.println(moduloEsperado);
    Serial.print(F("[PROTOCOLO] Frame rejeitado: "));
    dumpHex(pacote, tamanho);
    return false;
  }

  // ==========================================================
  // PROCURA MARCADOR DE CARGA ÚTIL (0x72)
  // Após o byte 0x72 começam os dados de temperatura (2 bytes por canal).
  //
  // FORMATO: 72 XX XX YY YY
  // XX XX = Canal 1 (High Byte, Low Byte)
  // YY YY = Canal 2 (High Byte, Low Byte)
  // ==========================================================
  size_t posR = tamanho;

  for (size_t i = 0; i + 4 < tamanho; i++) {
    if (pacote[i] == 0x72) {
      posR = i; // Posição do marcador
      break;
    }
  }

  if (posR == tamanho) {
    Serial.println(F("[PROTOCOLO] Marcador 0x72 nao encontrado."));
    return false;
  }

  // Se não sobrar 4 bytes para frente do 72, o pacote está cortado pela metade
  if (posR + 4 >= tamanho) {
    Serial.println(F("[PROTOCOLO] Payload incompleto."));
    return false;
  }

  // ==========================================================
  // DECODIFICAÇÃO DOS VALORES DE TEMPERATURA
  // Junta o byte alto com o byte baixo usando Shift Left (<< 8)
  // ==========================================================
  
  uint16_t rawCh1 = ((uint16_t)pacote[posR + 1] << 8) | pacote[posR + 2];
  uint16_t rawCh2 = ((uint16_t)pacote[posR + 3] << 8) | pacote[posR + 4];

  // O valor lido é convertido de unsigned (uint16_t) para signed (int16_t)
  // pois a temperatura pode ser negativa.
  int16_t canal1 = (int16_t)rawCh1;
  int16_t canal2 = (int16_t)rawCh2;

  // ==========================================================
  // IMPRIME O RESULTADO NO MONITOR SERIAL
  // ==========================================================
  Serial.println();
  Serial.println(F("======================================"));
  Serial.print(F("[MODULO "));
  Serial.print(idModulo);
  Serial.println(F("]"));
  Serial.print(F("  Canal 1 (Sup.): "));
  Serial.print(canal1);
  Serial.println(F(" °C"));
  Serial.print(F("  Canal 2 (Inf.): "));
  Serial.print(canal2);
  Serial.println(F(" °C"));
  Serial.println(F("===================================================="));

  // ==========================================================
  // ATUALIZA AS VARIÁVEIS DO ESTADO GLOBAL NO MÓDULO DE SENSORES
  // ==========================================================
  sensoresAtualizar(idModulo, canal1, canal2);

  return true;
}

// ============================================================
// FUNÇÃO DE SOBRECARGA SEM MÓDULO ESPERADO
// Utilizada se o sistema estivesse escutando passivamente.
// ============================================================
bool processarFrameAlutal(const byte* pacote, size_t tamanho) {
  return processarFrameAlutal(pacote, tamanho, 0);
}