#include "relogio.h"
#include "wifi_manager.h"
#include <time.h>
#include <coredecls.h> // Para settimeofday_cb() (callback do sistema)

// ==============================================================================
// VARIÁVEIS INTERNAS
// ==============================================================================
static bool horaSincronizada = false;
static unsigned long ultimoCheck = 0; // Usado para debouncing ou timeouts (se aplicável futuramente)

// ==============================================================================
// CALLBACK DO SISTEMA
// ==============================================================================
// Esta função é chamada automaticamente pelo sistema do ESP8266 sempre que 
// a sincronização NTP é concluída com sucesso no background.
void timeisSet() {
  horaSincronizada = true;
  Serial.println(F("[NTP] Hora sincronizada com a Internet!"));
}

// ==============================================================================
// FUNÇÕES PÚBLICAS
// ==============================================================================

// Inicializa a configuração do NTP. Requer conexão com a internet ativa.
void relogioInit() {
  Serial.println(F("[NTP] Inicializando relogio..."));
  
  // configTime(timezone_offset_seconds, daylight_offset_seconds, server1, server2)
  // Configura o fuso horário para GMT-3 (Brasil/Brasília): -3 * 3600 segundos
  // e define dois servidores NTP públicos confiáveis.
  configTime(-3 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  
  // Registra o callback para sermos avisados quando a hora estiver correta.
  settimeofday_cb(timeisSet);
}

// Mantém o estado. O ESP8266 lida com renovação NTP por baixo dos panos (na pilha de rede)
void relogioLoop() {
  // O core do ESP8266 gerencia o NTP automaticamente em background.
}

// Retorna se o relógio é confiável para gerar timestamps.
bool relogioSincronizado() {
  if (horaSincronizada) return true;
  
  // Fallback: às vezes o callback 'timeisSet' pode falhar em ser chamado no boot,
  // então nós checamos manualmente a hora atual do sistema Unix Epoch.
  time_t now = time(nullptr);
  // Se o Timestamp unix passou de 1,6 Bilhões (Ano ~2020), significa que pegou a hora certa,
  // visto que a data inicial do ESP se não estiver na rede é de 1970 (Ano Epoch = 0).
  if (now > 1600000000) { 
    horaSincronizada = true;
    return true;
  }
  return false;
}

// Formata a hora atual para o padrão String (ISO8601 com timezone offset)
String relogioObterDataHoraISO() {
  // Se não estiver sincronizado, retorna vazio em vez de mandar "1970" para o banco de dados.
  if (!relogioSincronizado()) {
    return ""; 
  }

  time_t now;
  struct tm timeinfo;
  time(&now);
  localtime_r(&now, &timeinfo); // Converte de Unix Timestamp para estrutura legível

  char buffer[30];
  // Formata os dados preenchendo com zeros à esquerda quando necessário (%02d).
  // tm_year é contado a partir de 1900.
  // tm_mon é de 0 a 11, por isso +1.
  // O final "-03:00" é o timezone fixo no formato ISO8601 (conforme configurado no configTime).
  snprintf(buffer, sizeof(buffer), "%04d-%02d-%02dT%02d:%02d:%02d-03:00",
           timeinfo.tm_year + 1900,
           timeinfo.tm_mon + 1,
           timeinfo.tm_mday,
           timeinfo.tm_hour,
           timeinfo.tm_min,
           timeinfo.tm_sec);
           
  return String(buffer);
}
