#ifndef PROTOCOLO_ALUTAL_H
#define PROTOCOLO_ALUTAL_H

#include <Arduino.h>

// ==============================================================================
// MÓDULO DE PROTOCOLO ALUTAL
// Decodifica a resposta serial (RS485) crua vinda dos módulos Alutal.
// A função extrai o ID do módulo e converte os bytes de payload em inteiros
// representando a temperatura dos canais 1 e 2.
// ==============================================================================

// Analisa um quadro recebido sem validar se veio de um módulo específico
bool processarFrameAlutal(const byte* pacote, size_t tamanho);

// Analisa um quadro recebido garantindo que o ID de resposta bata com o 'moduloEsperado'
bool processarFrameAlutal(const byte* pacote, size_t tamanho, uint8_t moduloEsperado);

#endif
