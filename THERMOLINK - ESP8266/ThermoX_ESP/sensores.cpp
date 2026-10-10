#include "sensores.h"
#include "config.h"
#include "api.h"

// ==============================================================================
// TABELAS INTERNAS (alocadas em RAM estática)
// ==============================================================================

// Tabela indexada por ID do módulo (0 não usado, 1 a RS485_MAX_MODULOS)
// Guarda a última leitura de temperatura de cada módulo
static Leitura tabelaLeituras[RS485_MAX_MODULOS + 1];

// Fila de envio pendente: indica quais módulos têm dados novos ainda não enviados para a API.
// O envio acontece em sensoresLoop() (dentro do loop() principal), 
// e NÃO dentro do rs485Loop() para evitar travamentos de conexão HTTP.
static bool leiturasPendentes[RS485_MAX_MODULOS + 1];
static uint8_t indicePendente = 1; // Próximo módulo pendente para enviar (auxiliar)

// ==============================================================================
// FUNÇÕES PÚBLICAS
// ==============================================================================

// Chama invalidarTodos para garantir estado limpo ao iniciar
void sensoresInit() {
  sensoresInvalidarTodos();
}

// ==============================================================================
// sensoresLoop — Despacho de dados para a API
//
// É chamado diretamente pelo loop() principal, onde é seguro fazer
// chamadas HTTP sem interferir no timing do RS485.
//
// Estratégia: Envia UM módulo por vez por execução do loop().
// Isso evita travar o ESP por vários segundos enviando todos de uma vez.
// ==============================================================================
void sensoresLoop() {
  // Percorre a tabela de módulos procurando o próximo com pendência
  for (uint8_t i = 1; i <= RS485_MAX_MODULOS; i++) {
    if (leiturasPendentes[i]) {
      leiturasPendentes[i] = false; // Marca como processado imediatamente (evita duplo envio)
      Leitura& l = tabelaLeituras[i];
      Serial.print(F("\n[SENSORES] Enviando Modulo "));
      Serial.println(i);
      apiEnviarLeitura(l); // Faz o POST HTTP para o Supabase
      return; // Retorna após enviar UM módulo para não travar o loop
    }
  }
}

// ==============================================================================
// sensoresInvalidarTodos — Reseta toda a tabela
// ==============================================================================
void sensoresInvalidarTodos() {
  for (int i = 0; i <= RS485_MAX_MODULOS; i++) {
    tabelaLeituras[i].modulo = i;
    tabelaLeituras[i].canal1 = 0;
    tabelaLeituras[i].canal2 = 0;
    tabelaLeituras[i].valida = false;   // Sem dados
    leiturasPendentes[i] = false;       // Nada para enviar
  }
}

// ==============================================================================
// sensoresAtualizar — Chamado pelo protocolo RS485
//
// IMPORTANTE: Esta função apenas ARMAZENA os dados e marca como pendente.
// NÃO faz chamada HTTP aqui! Isso causava "connection failed" porque
// o rs485Loop() não é um lugar seguro para operações de rede.
// ==============================================================================
void sensoresAtualizar(uint8_t modulo, int16_t c1, int16_t c2) {
  if (modulo >= 1 && modulo <= RS485_MAX_MODULOS) {
    tabelaLeituras[modulo].modulo = modulo;
    tabelaLeituras[modulo].canal1 = c1;
    tabelaLeituras[modulo].canal2 = c2;
    tabelaLeituras[modulo].valida = true;
    leiturasPendentes[modulo] = true; // Será enviado em sensoresLoop() no próximo ciclo
  }
}

// Retorna a leitura armazenada para um módulo específico, ou uma leitura vazia/inválida
Leitura sensoresObter(uint8_t modulo) {
  if (modulo >= 1 && modulo <= RS485_MAX_MODULOS) {
    return tabelaLeituras[modulo];
  }
  Leitura lVazia = {modulo, 0, 0, false}; // Retorno seguro para IDs inválidos
  return lVazia;
}

// Retorna a PRIMEIRA leitura válida encontrada na tabela (independente do módulo)
// Útil para diagnóstico ou para saber se pelo menos um módulo está respondendo.
bool sensoresObterUltimaLeitura(Leitura& leitura) {
  for (uint8_t i = 1; i <= RS485_MAX_MODULOS; i++) {
    if (tabelaLeituras[i].valida) {
      leitura = tabelaLeituras[i];
      return true;
    }
  }
  return false; // Nenhum módulo teve dado válido ainda
}

// Força o reenvio de todos os módulos que têm leituras válidas.
// Pode ser útil após reconexão com o Supabase.
void sensoresEnviarCicloOrdenado() {
  // Limpa as pendências atuais
  for (uint8_t i = 1; i <= RS485_MAX_MODULOS; i++) {
    leiturasPendentes[i] = false;
  }
  indicePendente = 1;
  // Marca todos como pendentes (mesmo os que ainda não têm dados novos)
  for (uint8_t i = 1; i <= RS485_MAX_MODULOS; i++) {
    leiturasPendentes[i] = true;
  }
}
