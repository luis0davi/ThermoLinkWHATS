/**
 * ==============================================================================
 * PROJETO: ThermoX ESP8266 - Modular
 * DESCRIÇÃO: Arquivo principal de inicialização e loop do sistema.
 * Ele orquestra os diferentes módulos de controle, como WiFi, RS485, LEDs, etc.
 * ==============================================================================
 */

#include "config.h"
#include "sistema.h"
#include "wifi_manager.h"
#include "rs485.h"
#include "sensores.h"
#include "api.h"
#include "ota.h"
#include "leds.h"
#include "identidade.h"
#include "relogio.h"

// ==============================================================================
// FUNÇÃO DE CONFIGURAÇÃO (Executada 1 vez ao ligar o ESP8266)
// ==============================================================================
void setup() {
  // Inicia a comunicação serial para debug em 115200 bps
  Serial.begin(115200);
  delay(50); // Pequeno atraso para estabilização do monitor serial

  // Inicializa cada módulo individualmente na ordem correta:
  sistemaInit();       // Inicia componentes globais do sistema (se houver)
  identidadeInit();    // Carrega o número de série e IDs da EEPROM
  ledsInit();          // Configura os pinos dos LEDs de status como saída
  wifiInit();          // Conecta no Wi-Fi ou sobe o portal cativo (WiFiManager)
  relogioInit();       // Inicia sincronização NTP de data e hora (fuso GMT-3)
  rs485Init();         // Configura os pinos de comunicação serial RS485 para os módulos Modbus
  sensoresInit();      // Inicializa variáveis e contadores de controle de sensores/temperatura
  apiInit();           // Prepara as estruturas para envio HTTP para o Supabase
  otaInit();           // Configura o cliente de atualização via GitHub e verifica novas versões

  // Imprime informações de boot no console serial
  Serial.println();
  Serial.println(F("=============================================="));
  Serial.println(F("          THERMOX ESP8266 - MODULAR           "));
  Serial.println(F("=============================================="));
  Serial.print(F("Firmware: "));
  Serial.println(FIRMWARE_VERSION);
  
  // Imprime a identidade atual gravada na EEPROM
  identidadeImprimir();
}

// ==============================================================================
// FUNÇÃO DE LOOP (Executada repetidamente)
// ==============================================================================
void loop() {
  // 1. VERIFICAÇÃO DE COMANDOS SERIAIS (Debug/Configuração)
  // Checa se chegou alguma mensagem pelo monitor serial do PC
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n'); // Lê a linha completa
    cmd.trim();                                // Remove espaços e quebras em branco
    
    // Se o comando iniciar com "SETID ", tenta gravar a nova identidade
    if (cmd.startsWith("SETID ")) {
      String newId = cmd.substring(6); // Extrai o ID após o espaço
      
      // Tenta gravar na EEPROM
      if (identidadeDefinirManualmente(newId.c_str())) {
        Serial.println(F("[Info] Identidade atualizada para: ") + newId);
        identidadeImprimir();
      } else {
        Serial.println(F("[Error] ID invalido ou formato incorreto. Use: SETID THX-00001"));
      }
    } 
    else if (cmd.equalsIgnoreCase("OTA")) {
      otaVerificarAgora();
    }
    else if (cmd.equalsIgnoreCase("RESET") || cmd.equalsIgnoreCase("REBOOT")) {
      sistemaReiniciar("Comando via Monitor Serial");
    }
    else if (cmd.equalsIgnoreCase("UPTIME")) {
      uint32_t s = sistemaUptimeSegundos();
      uint32_t horas = s / 3600;
      uint32_t min = (s % 3600) / 60;
      uint32_t seg = s % 60;
      Serial.printf("[SISTEMA] Uptime atual: %lu h, %lu min, %lu s | Heap livre: %u bytes\n", horas, min, seg, ESP.getFreeHeap());
    }
    else if (cmd.equalsIgnoreCase("STATUS")) {
      Serial.println(F("[COMANDO] Reportando versao e telemetria ao Supabase..."));
      sistemaReportarStatusAgora();
    }
  }


  // Captura o tempo atual em milissegundos para uso nos loops que precisam de delay não-bloqueante
  unsigned long agora = millis();

  // 2. CHAMADAS DOS LOOPS DOS MÓDULOS
  // Cada módulo verifica se é o seu momento de agir usando millis(), evitando o uso de delay() e mantendo o sistema responsivo.
  
  ledsLoop();       // Atualiza o piscar ou estado fixo dos LEDs com base no status do sistema
  wifiLoop();       // Mantém a conexão Wi-Fi ativa. Reconecta se cair.
  relogioLoop();    // Mantém estado/sincronização do relógio NTP
  otaLoop();        // Verifica periodicamente se há nova atualização no GitHub (ex: a cada 1h)
  rs485Loop();      // Processa o envio e recebimento de quadros da rede RS485
  sensoresLoop();   // Lê os valores recebidos e prepara o envio para a API quando necessário
  
  sistemaLoop();    // Rotinas gerais de background (Watchdog feed, se aplicável, etc.)
}

