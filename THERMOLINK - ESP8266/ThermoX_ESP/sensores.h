#ifndef SENSORES_H
#define SENSORES_H

#include <Arduino.h>

// ==============================================================================
// MÓDULO DE SENSORES (Gerenciamento de Leituras de Temperatura)
// Atua como uma "camada de buffer" entre a camada de comunicação RS485
// e a camada de envio para a API.
//
// FLUXO:
//   RS485 recebe dados -> sensoresAtualizar() armazena em tabela e marca pendente
//   -> sensoresLoop() detecta pendência -> apiEnviarLeitura() envia para o Supabase
//
// IMPORTANTE: O envio HTTP NÃO ocorre dentro do rs485Loop() para evitar
// travamentos. Ele é desacoplado e feito no sensoresLoop().
// ==============================================================================

// Estrutura que representa uma leitura de temperatura de um módulo
struct Leitura {
  uint8_t modulo;  // ID do módulo Alutal (1 a 31)
  int16_t canal1;  // Temperatura do Canal 1 (Termopar Superior), em graus Celsius inteiros
  int16_t canal2;  // Temperatura do Canal 2 (Termopar Inferior), em graus Celsius inteiros
  bool valida;     // 'true' = dados preenchidos; 'false' = ainda sem dados válidos
};

// Inicializa a tabela de leituras, marcando todas como inválidas.
void sensoresInit();

// Loop não-bloqueante. Procura leituras pendentes e envia uma por vez para a API.
void sensoresLoop();

// Armazena os dados recebidos do módulo e marca como pendente para envio.
// Chamado pelo protocolo RS485, NÃO faz chamada HTTP diretamente.
void sensoresAtualizar(uint8_t modulo, int16_t c1, int16_t c2);

// Reseta a tabela inteira, marcando todas as leituras como inválidas.
void sensoresInvalidarTodos();

// Retorna a última leitura armazenada para um módulo específico.
Leitura sensoresObter(uint8_t modulo);

// Retorna a primeira leitura válida encontrada na tabela (qualquer módulo).
bool sensoresObterUltimaLeitura(Leitura& leitura);

// Marca todas as leituras válidas como pendentes para um ciclo ordenado de envio.
void sensoresEnviarCicloOrdenado();

#endif
