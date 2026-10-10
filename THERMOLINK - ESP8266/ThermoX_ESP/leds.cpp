#include "config.h"
#include "leds.h"
#include <ESP8266WiFi.h>

// Variáveis para controlar temporização não-bloqueante (usando millis)
static unsigned long ultimoPingTime = 0; // Controle do piscar lento do LED de Internet
static unsigned long tempoLedModulo = 0; // Marca o instante em que o LED RS485 acendeu
static unsigned long tempoLedAPI = 0;    // Marca o instante em que o LED da API acendeu

// Armazena o estado atual do LED de Internet para poder alternar (piscar)
static bool estadoLedInternet = LOW;

// ==============================================================================
// FUNÇÕES DE INICIALIZAÇÃO
// ==============================================================================
void ledsInit() {
  // Configura os pinos mapeados no config.h como saída
  pinMode(LED_INTERNET_PIN, OUTPUT);
  pinMode(LED_MODULO_PIN, OUTPUT);
  pinMode(LED_API_PIN, OUTPUT);

  // Inicia todos os LEDs apagados
  digitalWrite(LED_INTERNET_PIN, LOW);
  digitalWrite(LED_MODULO_PIN, LOW);
  digitalWrite(LED_API_PIN, LOW);
}

// ==============================================================================
// FUNÇÕES DE ACIONAMENTO MOMENTÂNEO (EVENTOS)
// ==============================================================================

// Chamada quando o ESP envia ou recebe algo via RS485
void ledPiscarModulo() {
  digitalWrite(LED_MODULO_PIN, HIGH);
  tempoLedModulo = millis(); // Registra quando acendeu para apagar depois
}

// Chamada quando o ESP envia dados com sucesso para a API do Supabase
void ledPiscarAPI() {
  digitalWrite(LED_API_PIN, HIGH);
  tempoLedAPI = millis(); // Registra quando acendeu para apagar depois
}

// ==============================================================================
// LOOP DE CONTROLE DOS LEDs
// ==============================================================================
void ledsLoop() {
  unsigned long agora = millis();

  // 1. Controle do LED de Internet (Wi-Fi)
  if (WiFi.status() == WL_CONNECTED) {
    // Se conectado, o LED pisca a cada 1000ms (1 segundo)
    if (agora - ultimoPingTime >= 1000) {
      ultimoPingTime = agora;
      estadoLedInternet = !estadoLedInternet; // Inverte o estado atual
      digitalWrite(LED_INTERNET_PIN, estadoLedInternet);
    }
  } else {
    // Se não estiver conectado, o LED fica apagado
    digitalWrite(LED_INTERNET_PIN, LOW);
  }

  // 2. Controle de "desligamento" do LED de Módulos (RS485)
  // Se ele estiver aceso e já passou 100ms desde que acendeu, apaga.
  if (digitalRead(LED_MODULO_PIN) == HIGH && (agora - tempoLedModulo >= 100)) {
    digitalWrite(LED_MODULO_PIN, LOW);
  }

  // 3. Controle de "desligamento" do LED da API
  // Se ele estiver aceso e já passou 200ms desde que acendeu, apaga.
  // (Fica aceso um pouquinho mais que o do módulo para ser mais visível)
  if (digitalRead(LED_API_PIN) == HIGH && (agora - tempoLedAPI >= 200)) {
    digitalWrite(LED_API_PIN, LOW);
  }
}
