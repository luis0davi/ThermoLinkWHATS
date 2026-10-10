#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>   // Necessário para HTTPS (SSL/TLS)

#include "credentials.h"
#include "wifi_manager.h"
#include "api.h"
#include "leds.h"
#include "identidade.h"
#include "relogio.h"
#include "config.h"
#include "sistema.h"

// NOTA TÉCNICA IMPORTANTE:
// Não usar WiFiClientSecure como variável global.
// A implementação do mbedTLS no ESP8266 pode corromper o estado SSL após o primeiro uso.
// A solução é criar uma instância local em cada chamada — igual ao código V1 que funciona.

void apiInit() {
  Serial.println(F("[API] Inicializada."));
}

// ==============================================================================
// apiEnviarLeitura — Envio de dados para o Supabase via HTTPS/REST
// ==============================================================================
bool apiEnviarLeitura(const Leitura& leitura) {
  
  // Não envia dados inválidos
  if (!leitura.valida) {
    Serial.println(F("[API] Leitura invalida."));
    return false;
  }

  // Não envia sem Wi-Fi conectado
  if (!wifiConectado()) {
    Serial.println(F("[API] Sem Wi-Fi. Envio adiado."));
    return false;
  }

  // === DIAGNÓSTICO DE REDE (útil para debug de conectividade) ===
  Serial.print(F("[API] IP: ")); Serial.println(WiFi.localIP());
  Serial.print(F("[API] Heap livre: ")); Serial.println(ESP.getFreeHeap());
  // Modo WiFi: 1 = STA (conectado ao roteador), 3 = AP+STA (portal ainda ativo ou encerrado)
  Serial.print(F("[API] Modo WiFi: ")); Serial.println(WiFi.getMode());
  
  // Resolução DNS: verifica se o ESP consegue transformar o hostname em IP
  // Isso é fundamental para HTTPS funcionar. Se falhar, provavelmente há problema de DNS ou heap baixo.
  IPAddress serverIP;
  if (!WiFi.hostByName("zawnluboujbovpgrgdcx.supabase.co", serverIP)) {
    Serial.println(F("[API] ERRO: DNS falhou! Servidor nao encontrado."));
    return false;
  }
  Serial.print(F("[API] DNS OK: ")); Serial.println(serverIP);
  // ==============================================================

  // Cria uma instância local de cliente HTTPS (SSL/TLS)
  WiFiClientSecure client;
  // setInsecure() desabilita a verificação do certificado SSL.
  // Isso é uma solução prática para ESP8266 (sem espaço de armazenamento para CAs),
  // mas significa que a conexão não valida autenticidade do servidor.
  client.setInsecure();

  HTTPClient http;
  // URL completa do endpoint REST do Supabase para inserção na tabela 'leituras'
  String url = String(SUPABASE_URL) + "/rest/v1/leituras";

  if (!http.begin(client, url)) {
    Serial.println(F("[API] ERRO ao iniciar HTTP."));
    return false;
  }

  // Headers obrigatórios para a API do Supabase (PostgREST)
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);                                 // Chave de acesso à API
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);     // Autorização (mesmo valor)
  http.addHeader("Prefer", "return=minimal");                             // Não retorna o registro inserido (economiza banda)

  // Monta o JSON manualmente (sem biblioteca, para economizar RAM)
  // Os campos 'dispositivo_id', 'forno_id' e 'numero_serie' vêm da identidade gravada na EEPROM.
  String json = "{";
  json += "\"dispositivo_id\":" + String(identidadeDispositivoId());
  json += ",\"forno_id\":"      + String(identidadeFornoId());
  json += ",\"modulo_alutal\":" + String(leitura.modulo);
  json += ",\"canal_1\":"       + String(leitura.canal1);
  json += ",\"canal_2\":"       + String(leitura.canal2);
  json += ",\"numero_serie\":\"" + String(identidadeNumeroSerie()) + "\"";

  // Se o relógio NTP estiver sincronizado, envia o timestamp com fuso local
  String dataHora = relogioObterDataHoraISO();
  if (dataHora.length() > 0) {
    json += ",\"data_hora\":\"" + dataHora + "\"";
  }

  json += "}";

  Serial.println(F("[API] JSON:"));
  Serial.println(json);

  // Executa o POST e obtém o código de retorno HTTP
  int codigoHTTP = http.POST(json);

  Serial.print(F("[API] HTTP: "));
  Serial.print(codigoHTTP);

  if (codigoHTTP < 0) {
    // Código negativo significa erro na camada de comunicação (ex: timeout, SSL failure)
    Serial.print(F(" ("));
    Serial.print(http.errorToString(codigoHTTP)); // Converte o código de erro em texto legível
    Serial.println(F(")"));
  } else {
    Serial.println();
  }

  // Exibe a resposta do servidor (geralmente vazia com Prefer: return=minimal)
  String resposta = http.getString();
  if (resposta.length() > 0) {
    Serial.println(F("[API] Resposta:"));
    Serial.println(resposta);
  }

  http.end(); // Libera os recursos da conexão HTTP

  // Códigos 2xx = sucesso (200 OK, 201 Created, 204 No Content)
  if (codigoHTTP >= 200 && codigoHTTP < 300) {
    ledPiscarAPI(); // Acende o LED da API brevemente como feedback visual
    Serial.println(F("[API] ENVIO REALIZADO."));
    return true;
  }

  Serial.println(F("[API] ERRO NO ENVIO."));
  return false;
}

// ==============================================================================
// apiReportarStatusDispositivo — Envio de versão de firmware e telemetria
// Executa um PATCH na tabela 'dispositivos' para registrar que o hardware
// está online, qual versão está executando, RSSI do Wi-Fi, IP e Uptime.
// ==============================================================================
bool apiReportarStatusDispositivo() {
  if (!wifiConectado()) {
    Serial.println(F("[API-STATUS] Sem Wi-Fi. Reporte adiado."));
    return false;
  }

  const char* numSerie = identidadeNumeroSerie();
  int dispId = identidadeDispositivoId();

  if ((!numSerie || strlen(numSerie) == 0) && dispId <= 0) {
    Serial.println(F("[API-STATUS] Identidade nao configurada. Abortando reporte."));
    return false;
  }

  IPAddress serverIP;
  if (!WiFi.hostByName("zawnluboujbovpgrgdcx.supabase.co", serverIP)) {
    Serial.println(F("[API-STATUS] ERRO DNS. Servidor nao encontrado."));
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  
  // Constrói URL apontando para o registro deste dispositivo específico
  String query = "";
  if (numSerie && strlen(numSerie) > 0) {
    query = "numero_serie=eq." + String(numSerie);
  } else {
    query = "id=eq." + String(dispId);
  }
  String url = String(SUPABASE_URL) + "/rest/v1/dispositivos?" + query;

  if (!http.begin(client, url)) {
    Serial.println(F("[API-STATUS] ERRO ao iniciar HTTP."));
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  // Formata o tempo de uptime amigável (ex: "1d 2h 15m" ou "0h 5m")
  uint32_t seg = sistemaUptimeSegundos();
  uint32_t dias = seg / 86400;
  uint32_t horas = (seg % 86400) / 3600;
  uint32_t minutos = (seg % 3600) / 60;
  String uptimeStr = "";
  if (dias > 0) uptimeStr += String(dias) + "d ";
  uptimeStr += String(horas) + "h " + String(minutos) + "m";

  // Monta JSON com versão de firmware e status de rede
  String json = "{";
  json += "\"firmware_version\":\"" + String(FIRMWARE_VERSION) + "\"";
  json += ",\"firmware\":\"" + String(FIRMWARE_VERSION) + "\"";
  json += ",\"ip\":\"" + WiFi.localIP().toString() + "\"";
  json += ",\"rssi\":" + String(WiFi.RSSI());
  json += ",\"wifi_rssi\":" + String(WiFi.RSSI());
  json += ",\"uptime\":\"" + uptimeStr + "\"";
  json += ",\"status\":\"Online\"";

  String dataHora = relogioObterDataHoraISO();
  if (dataHora.length() > 0) {
    json += ",\"ultimo_acesso\":\"" + dataHora + "\"";
    json += ",\"ultimo_contato\":\"" + dataHora + "\"";
  }
  json += "}";

  Serial.println(F("----------------------------------------------"));
  Serial.print(F("[API-STATUS] Reportando status do dispositivo: "));
  Serial.println(numSerie ? numSerie : String(dispId).c_str());
  Serial.print(F("[API-STATUS] Versao Firmware: "));
  Serial.println(FIRMWARE_VERSION);
  Serial.print(F("[API-STATUS] Uptime: "));
  Serial.println(uptimeStr);
  Serial.println(F("----------------------------------------------"));

  int codigoHTTP = http.sendRequest("PATCH", (uint8_t*)json.c_str(), json.length());

  Serial.print(F("[API-STATUS] Resposta HTTP: "));
  Serial.println(codigoHTTP);

  http.end();

  if (codigoHTTP >= 200 && codigoHTTP < 300) {
    ledPiscarAPI();
    Serial.println(F("[API-STATUS] SUCESSO: Versao e status atualizados no Supabase!"));
    return true;
  }

  Serial.println(F("[API-STATUS] Falha ao atualizar status no Supabase."));
  return false;
}

