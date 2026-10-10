#include <Arduino.h>
#include "sistema.h"
#include "config.h"
#include "api.h"
#include "wifi_manager.h"

namespace {
unsigned long inicioBoot = 0;
unsigned long ultimoAvisoUptime = 0;
unsigned long ultimoReporteStatus = 0;
bool primeiroReporteFeito = false;
const unsigned long INTERVALO_REPORTE_STATUS_MS = 1800000UL; // A cada 30 minutos
}

// Inicializa módulos ou parâmetros que afetam o sistema como um todo.
void sistemaInit() {
  inicioBoot = millis();
  ultimoAvisoUptime = millis();
  ultimoReporteStatus = millis();
  primeiroReporteFeito = false;
  
  Serial.println(F("[SISTEMA] Modulo de sistema inicializado."));
  
#if SISTEMA_RESET_DIARIO_HABILITADO
  Serial.println(F("[SISTEMA] Auto-reset diario ATIVO: o dispositivo reiniciara preventivamente a cada 24 horas."));
#else
  Serial.println(F("[SISTEMA] Auto-reset diario DESATIVADO."));
#endif
}

// Retorna o tempo decorrido desde o boot em segundos
uint32_t sistemaUptimeSegundos() {
  return (millis() - inicioBoot) / 1000UL;
}

// Dispara o reporte de status/firmware manualmente
void sistemaReportarStatusAgora() {
  Serial.println(F("[SISTEMA] Disparando reporte manual de status ao Supabase..."));
  if (apiReportarStatusDispositivo()) {
    ultimoReporteStatus = millis();
    primeiroReporteFeito = true;
  }
}

// Reinicia o ESP8266 de forma limpa e rápida
void sistemaReiniciar(const char* motivo) {
  Serial.println();
  Serial.println(F("=============================================="));
  Serial.print(F("[SISTEMA] REINICIANDO ESP8266: "));
  if (motivo) Serial.println(motivo);
  else Serial.println(F("Comando manual"));
  Serial.println(F("=============================================="));
  Serial.flush();
  delay(150);
  ESP.restart();
}

// Tarefas periódicas de background e manutenção preventiva
void sistemaLoop() {
  unsigned long agora = millis();

  // Emite relatório de diagnóstico a cada 6 horas no Serial Monitor
  if (agora - ultimoAvisoUptime >= (6UL * 60UL * 60UL * 1000UL)) {
    ultimoAvisoUptime = agora;
    uint32_t seg = sistemaUptimeSegundos();
    uint32_t horas = seg / 3600;
    uint32_t min = (seg % 3600) / 60;
    Serial.printf("[SISTEMA] Diagnostico -> Uptime: %lu h %lu min | Heap Livre: %u bytes\n", horas, min, ESP.getFreeHeap());
  }

  // Reporte automático de firmware/telemetria para o Supabase
  if (wifiConectado()) {
    if (!primeiroReporteFeito && (agora - inicioBoot >= 5000UL)) {
      // 5 segundos após o boot, com Wi-Fi estável, reporta status inicial ao Supabase
      Serial.println(F("[SISTEMA] Enviando reporte inicial de versao/status para a nuvem..."));
      if (apiReportarStatusDispositivo()) {
        primeiroReporteFeito = true;
        ultimoReporteStatus = agora;
      }
    } else if (primeiroReporteFeito && (agora - ultimoReporteStatus >= INTERVALO_REPORTE_STATUS_MS)) {
      // Repete a cada 30 minutos
      ultimoReporteStatus = agora;
      apiReportarStatusDispositivo();
    }
  }

#if SISTEMA_RESET_DIARIO_HABILITADO
  // Verifica se o tempo de operação contínua atingiu o limite de 24 horas
  if (agora - inicioBoot >= SISTEMA_RESET_INTERVALO_MS) {
    Serial.println();
    Serial.println(F("=========================================================="));
    Serial.println(F("[SISTEMA] AUTO-RESET DIARIO ATINGIDO (24 HORAS DE OPERACAO)"));
    Serial.println(F("[SISTEMA] Reiniciando preventivamente para renovar RAM/heap..."));
    Serial.println(F("=========================================================="));
    sistemaReiniciar("Ciclo diario de 24h preventivo");
  }
#endif
}

