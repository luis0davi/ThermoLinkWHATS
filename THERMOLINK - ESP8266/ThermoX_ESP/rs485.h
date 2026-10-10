#ifndef RS485_H
#define RS485_H

#include <Arduino.h>

// ==============================================================================
// MÓDULO DE COMUNICAÇÃO RS485 (Protocolo Modbus / Alutal)
// Responsável pelo polling (varredura cíclica) de todos os módulos Alutal
// conectados ao barramento RS485.
//
// FLUXO PRINCIPAL:
//   1. A cada RS485_INTERVAL_MS, envia uma consulta para o próximo módulo.
//   2. Aguarda a resposta em modo não-bloqueante (usando millis()).
//   3. Quando o frame chega completo, passa para processarFrameAlutal().
//   4. Em caso de timeout, avança para o próximo módulo automaticamente.
// ==============================================================================

// Configura os pinos, inicializa o SoftwareSerial e coloca o bus em modo recepção.
void rs485Init();

// Loop não-bloqueante. Controla o disparo das consultas e o recebimento dos frames.
// Deve ser chamado continuamente no loop() principal.
void rs485Loop();

// Envia uma consulta manual para um módulo específico (para uso externo se necessário).
bool rs485EnviarConsulta(uint8_t modulo);

#endif
