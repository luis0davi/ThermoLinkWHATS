/**
 * ==============================================================================
 * PROJETO: ThermoX ESP - Monitoramento Térmico
 * ARQUIVO: rs485.cpp
 * DESCRIÇÃO: Implementação da comunicação serial RS485 (Half-Duplex) com os
 *            módulos de sensores industriais (protocolo proprietário Alutal).
 * ==============================================================================
 */

#include <Arduino.h>
#include <SoftwareSerial.h>  // Biblioteca para emular serial nos pinos digitais do ESP8266

#include "config.h"
#include "rs485.h"
#include "protocolo_alutal.h"
#include "sensores.h"
#include "leds.h"

// Garante um valor padrão para a quantidade de módulos escaneados se não definido
#ifndef NUM_MODULOS_TESTE
#define NUM_MODULOS_TESTE 31
#endif

// ==============================================================================
// Namespace anônimo: variáveis e funções locais e privadas deste arquivo (.cpp)
// ==============================================================================
namespace {

// Instância da serial por software usando os pinos definidos em config.h (RX e TX)
SoftwareSerial rs485Serial(RS485_RX_PIN, RS485_TX_PIN);

// Controle de qual módulo está sendo consultado no momento no ciclo de varredura
uint8_t indiceModulo = 0;       // Índice dentro do array de módulos
uint8_t moduloAguardado = 0;    // Endereço ID (1..31) do módulo cuja resposta é aguardada

// Temporizadores para controle de fluxo não bloqueante (máquina de estados com millis())
unsigned long ultimaConsulta = 0;       // Registra quando enviamos a última solicitação
unsigned long inicioConsulta = 0;       // Registra o instante exato do disparo para cálculo de timeout geral
unsigned long ultimoByteRecebido = 0;   // Registra o tempo do último caractere recebido (detecta fim do frame)

// Flag que indica se estamos atualmente esperando resposta de um módulo
bool aguardandoResposta = false;

// Buffer de recepção para acumular os bytes que chegam do barramento RS485
byte bufferResposta[RS485_BUFFER_SIZE];
size_t indiceBuffer = 0;                // Quantidade atual de bytes gravados no buffer

// Lista padrão de módulos de 1 a 31 caso não seja injetada outra via config.h
const uint8_t LOCAL_MODULOS_TESTE[31] = {
   1,  2,  3,  4,  5,
   6,  7,  8,  9, 10,
  11, 12, 13, 14, 15,
  16, 17, 18, 19, 20,
  21, 22, 23, 24, 25,
  26, 27, 28, 29, 30,
  31
};

/**
 * @brief Limpa o buffer de recepção da serial e zera o índice do buffer interno.
 */
void limparRecepcao() {
  while (rs485Serial.available() > 0) {
    rs485Serial.read();
  }
  indiceBuffer = 0;
}

/**
 * @brief Avança o ponteiro circular de varredura para o próximo módulo da lista.
 */
void avancarProximoModulo() {
  indiceModulo++;
  if (indiceModulo >= NUM_MODULOS_TESTE) {
    indiceModulo = 0; // Retorna ao primeiro módulo após completar o ciclo
  }
}

/**
 * @brief Monta o frame de comando e transmite pelo transceiver RS485.
 * @param modulo ID numérico do módulo (1 a 31).
 * @return true se enviado com sucesso, false se módulo inválido.
 */
bool enviarComando(uint8_t modulo) {
  if (modulo < 1 || modulo > RS485_MAX_MODULOS) {
    return false;
  }

  // O protocolo transmite o ID do módulo como caractere ASCII (ex: ID 1 vira '1' -> 0x31)
  byte idModulo = (byte)('0' + modulo);

  // Formato do comando de leitura Alutal: "< [ID] 2 3 R >/"
  byte comando[] = {
    0x3C, 0x20, idModulo, 0x20,
    0x32, 0x20, 0x33, 0x20,
    0x52, 0x20, 0x3E, 0x2F
  };

  const size_t tamanhoComando = sizeof(comando);

  // Descarta dados residuais na fila antes de enviar nova consulta
  limparRecepcao();

  Serial.println();
  Serial.print(F(">> Solicitando dados ao MODULO "));
  Serial.println(modulo);

  Serial.print(F("[TX HEX]: "));
  for (size_t i = 0; i < tamanhoComando; i++) {
    if (comando[i] < 0x10) Serial.print('0');
    Serial.print(comando[i], HEX);
    Serial.print(' ');
  }
  Serial.println();

  // Chaveia o transceptor RS485 (MAX485/SN75176) para modo TRANSMISSÃO (DE/RE = HIGH)
  digitalWrite(RS485_DE_RE_PIN, HIGH);
  delayMicroseconds(200); // Tempo de estabilização do driver de linha

  rs485Serial.write(comando, tamanhoComando);
  rs485Serial.flush(); // Aguarda a transmissão de todos os bytes sair fisicamente do pino

  delayMicroseconds(800); // Garante que o bit de parada (stop bit) foi totalmente enviado
  digitalWrite(RS485_DE_RE_PIN, LOW); // Retorna transceptor para modo RECEPÇÃO (DE/RE = LOW)

  // Prepara as variáveis de controle da resposta
  indiceBuffer = 0;
  inicioConsulta = millis();
  ultimoByteRecebido = millis();
  aguardandoResposta = true;

  return true;
}

} // namespace

// ==============================================================================
// Implementação das Funções Públicas da Interface rs485.h
// ==============================================================================

/**
 * @brief Inicializa o barramento RS485, pinos de controle e taxa de transmissão.
 */
void rs485Init() {
  pinMode(RS485_DE_RE_PIN, OUTPUT);
  digitalWrite(RS485_DE_RE_PIN, LOW); // Inicia sempre em modo escuta (recepção)

  rs485Serial.begin(RS485_BAUD);      // Inicializa a SoftwareSerial na velocidade configurada (ex: 9600)
  limparRecepcao();

  indiceModulo = 0;
  moduloAguardado = 0;
  aguardandoResposta = false;
  ultimaConsulta = millis();

  Serial.println(F("[RS485] Inicializado."));
}

/**
 * @brief Envia comando de consulta individual para um módulo específico.
 * @param modulo ID numérico do módulo (1 a 31).
 */
bool rs485EnviarConsulta(uint8_t modulo) {
  return enviarComando(modulo);
}

/**
 * @brief Executa o ciclo de polling, recepção e timeout de comunicação RS485.
 *        Deve ser chamada repetidamente dentro do loop() principal.
 */
void rs485Loop() {
  unsigned long agora = millis();

  // --------------------------------------------------------------------------
  // 1. DISPARO DE NOVA CONSULTA (quando não estivermos aguardando resposta)
  // --------------------------------------------------------------------------
  if (!aguardandoResposta) {
    if (agora - ultimaConsulta >= RS485_INTERVAL_MS) {
      ultimaConsulta = agora;

      #ifdef MODULOS_TESTE
        moduloAguardado = MODULOS_TESTE[indiceModulo];
      #else
        moduloAguardado = LOCAL_MODULOS_TESTE[indiceModulo];
      #endif

      if (enviarComando(moduloAguardado)) {
        avancarProximoModulo();
      }
    }
  }

  // --------------------------------------------------------------------------
  // 2. RECEPÇÃO DE DADOS CHEGANDO PELA SERIAL RS485
  // --------------------------------------------------------------------------
  while (rs485Serial.available() > 0) {
    byte c = rs485Serial.read();
    ultimoByteRecebido = millis();

    // Descarta ruído elétrico inicial comum na linha RS485 quando o barramento flutua
    if (indiceBuffer == 0 && (c == 0x00 || c == 0xFF)) {
      continue;
    }

    // Salva o byte no buffer de resposta caso haja espaço
    if (indiceBuffer < RS485_BUFFER_SIZE) {
      bufferResposta[indiceBuffer] = c;
      indiceBuffer++;
    } else {
      // Buffer estourou - descarta por segurança contra buffer overflow
      Serial.println(F("[RS485] BUFFER CHEIO!"));
      aguardandoResposta = false;
      indiceBuffer = 0;
      return;
    }
  }

  // --------------------------------------------------------------------------
  // 3. DETECÇÃO DE FIM DE PACOTE POR SILÊNCIO (Gap Timeout)
  // --------------------------------------------------------------------------
  // Se passaram RS485_FRAME_TIMEOUT_MS desde o último byte recebido, o frame terminou
  if (aguardandoResposta &&
      indiceBuffer > 0 &&
      (millis() - ultimoByteRecebido) >= RS485_FRAME_TIMEOUT_MS) {
    
    aguardandoResposta = false;

    // Processa os bytes recebidos através do decodificador do protocolo Alutal
    bool ok = processarFrameAlutal(bufferResposta, indiceBuffer, moduloAguardado);

    if (ok) {
      ledPiscarModulo(); // Feedback visual de pacote válido recebido
    } else {
      Serial.print(F("[RS485] Pacote invalido do MODULO "));
      Serial.print(moduloAguardado);
      Serial.print(F(" ("));
      Serial.print(indiceBuffer);
      Serial.println(F(" bytes)"));
    }

    indiceBuffer = 0; // Prepara para a próxima mensagem
  }

  // --------------------------------------------------------------------------
  // 4. TIMEOUT GERAL DE CONSULTA (Módulo não respondeu)
  // --------------------------------------------------------------------------
  if (aguardandoResposta && (millis() - inicioConsulta) >= 1000) {
    Serial.print(F("[RS485] TIMEOUT - MODULO "));
    Serial.print(moduloAguardado);
    Serial.println(F(" nao respondeu."));

    aguardandoResposta = false;
    indiceBuffer = 0;
  }
}