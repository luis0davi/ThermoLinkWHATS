#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <DNSServer.h>
#include <EEPROM.h>

#include "wifi_manager.h"

// ==============================================================================
// Namespace Anônimo: encapsula dados internos para não vazar para outros módulos
// ==============================================================================
namespace {

const uint16_t EEPROM_SIZE = 256;           // Tamanho total alocado na Flash para emular EEPROM
const uint32_t EEPROM_MAGIC = 0x54485831UL; // "THX1" (Magic Number) para validação da área Wi-Fi

const byte DNS_PORT = 53;                   // Porta padrão de servidor DNS para o Portal Captive
const char* AP_SSID = "ThermoLink";         // Nome da rede gerada pelo ESP quando sem Wi-Fi
const char* AP_PASSWORD = "12345678";       // Senha da rede gerada pelo ESP

// Ponteiros para o Servidor Web e DNS. 
// Alocados dinamicamente: só existem na RAM quando o portal está ativo.
// Quando deletados, liberam ~10KB de memória Heap, cruciais para a comunicação HTTPS (Supabase) funcionar.
ESP8266WebServer* server = nullptr;
DNSServer* dnsServer = nullptr;

// Estrutura para salvar o SSID e Senha do usuário na EEPROM
struct WifiConfig {
  uint32_t magic;
  char ssid[64];
  char password[64];
};

WifiConfig wifiConfig;

// Variáveis de controle de estado do Wi-Fi
bool portalAtivo = false;
unsigned long ultimaTentativa = 0;
unsigned long inicioConexao = 0;

// Constantes de temporização (Timeout)
const unsigned long WIFI_TIMEOUT_MS = 15000;         // Desiste após 15s tentando conectar e sobe portal
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;  // Tenta novamente a cada 10s se perder conexão

// Função auxiliar para evitar falhas de injeção HTML/XSS básicas na exibição do portal
String htmlEscapar(const String& texto) {
  String s = texto;
  s.replace("&", "&");
  s.replace("<", "<");
  s.replace(">", ">");
  return s;
}

// Carrega os dados da EEPROM. (Offset 0, pois a identidade começa no Offset 144)
void carregarConfig() {
  EEPROM.begin(EEPROM_SIZE);
  EEPROM.get(0, wifiConfig);

  // Se o magic não bater, a memória está vazia ou corrompida. Inicializa limpo.
  if (wifiConfig.magic != EEPROM_MAGIC) {
    memset(&wifiConfig, 0, sizeof(wifiConfig));
    wifiConfig.magic = EEPROM_MAGIC;
  }
}

// Salva o SSID e Senha digitados pelo usuário na EEPROM (Offset 0)
void salvarConfig(const String& ssid, const String& senha) {
  memset(&wifiConfig, 0, sizeof(wifiConfig));

  wifiConfig.magic = EEPROM_MAGIC;
  ssid.toCharArray(wifiConfig.ssid, sizeof(wifiConfig.ssid));
  senha.toCharArray(wifiConfig.password, sizeof(wifiConfig.password));

  EEPROM.put(0, wifiConfig);
  EEPROM.commit();
}

// Verifica se há alguma configuração prévia válida guardada
bool possuiConfig() {
  return wifiConfig.ssid[0] != '\0';
}

// Gera a página HTML dinâmica para o Portal Captive, escaneando redes ao redor
String paginaPortal() {
  int quantidade = WiFi.scanNetworks();

  String html;
  html.reserve(6000); // Pré-aloca espaço para não fragmentar a memória RAM

  html += "<!DOCTYPE html><html><head>";
  html += "<meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<title>ThermoX Wi-Fi</title>";
  html += "<style>";
  html += "body{font-family:Arial;margin:20px;max-width:600px}";
  html += "input,button{width:100%;padding:12px;margin:7px 0;box-sizing:border-box}";
  html += "button{font-weight:bold}";
  html += ".net{padding:10px;border:1px solid #ccc;margin:5px 0}";
  html += "</style></head><body>";

  html += "<h2>ThermoX - Configuração Wi-Fi</h2>";
  html += "<p>Escolha a rede Wi-Fi e informe a senha.</p>";

  // Formulário que aponta para a rota "/salvar" usando POST
  html += "<form method='POST' action='/salvar'>";
  html += "<label>Rede Wi-Fi</label>";
  html += "<input id='ssid' name='ssid' required>";

  html += "<label>Senha</label>";
  html += "<input name='password' type='password'>";

  html += "<button type='submit'>Salvar e conectar</button>";
  html += "</form>";

  html += "<h3>Redes encontradas</h3>";

  if (quantidade <= 0) {
    html += "<p>Nenhuma rede encontrada.</p>";
  } else {
    // Lista todas as redes escaneadas e cria botões clicáveis
    for (int i = 0; i < quantidade; i++) {
      html += "<div class='net' onclick=\"document.getElementById('ssid').value='";
      html += htmlEscapar(WiFi.SSID(i));
      html += "'\">";
      html += htmlEscapar(WiFi.SSID(i));
      html += " (" + String(WiFi.RSSI(i)) + " dBm)";
      html += "</div>";
    }
  }

  html += "<hr>";
  html += "<p><b>IP do portal:</b> 192.168.4.1</p>";
  html += "</body></html>";

  WiFi.scanDelete(); // Libera a lista de redes da memória
  return html;
}

// Inicia o Ponto de Acesso (AP) e os servidores DNS/Web do Portal Captive
void iniciarPortal() {
  if (portalAtivo) return;

  Serial.println();
  Serial.println("==============================================");
  Serial.println("[WIFI] MODO CONFIGURACAO");
  Serial.println("==============================================");

  WiFi.disconnect();
  delay(200);

  // Coloca em modo Misto: AP (Access Point) e STA (Station/Cliente)
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(AP_SSID, AP_PASSWORD);

  IPAddress ip = WiFi.softAPIP();

  // Aloca os objetos na Heap APENAS agora que o portal vai ser usado
  // (Quando o portal desligar, nós damos "delete" e devolvemos essa RAM pro sistema)
  if (!dnsServer) dnsServer = new DNSServer();
  if (!server)    server    = new ESP8266WebServer(80);

  // Redireciona tudo (*) para o IP do ESP (captive portal feature)
  dnsServer->start(DNS_PORT, "*", ip);

  // Rota principal: mostra a página HTML
  server->on("/", HTTP_GET, []() {
    server->send(200, "text/html; charset=utf-8", paginaPortal());
  });

  // Rota de recebimento de dados do formulário
  server->on("/salvar", HTTP_POST, []() {
    String ssid = server->arg("ssid");
    String senha = server->arg("password");

    if (ssid.length() == 0) {
      server->send(400, "text/plain; charset=utf-8", "SSID vazio.");
      return;
    }

    // Salva na EEPROM
    salvarConfig(ssid, senha);

    String resposta;
    resposta += "<html><body><h2>Wi-Fi salvo!</h2>";
    resposta += "<p>O ThermoX vai reiniciar e tentar conectar em <b>";
    resposta += htmlEscapar(ssid);
    resposta += "</b>.</p></body></html>";

    server->send(200, "text/html; charset=utf-8", resposta);

    delay(1500);
    ESP.restart(); // Reinicia o ESP para carregar as configurações do zero
  });

  // Rota Not Found: captura qualquer coisa e manda para a raiz (Redirecionamento Captive Portal para Android/iOS)
  server->onNotFound([]() {
    server->sendHeader("Location", "http://192.168.4.1/", true);
    server->send(302, "text/plain", "");
  });

  server->begin();

  portalAtivo = true;

  Serial.print("[WIFI] Rede: ");
  Serial.println(AP_SSID);
  Serial.print("[WIFI] Senha: ");
  Serial.println(AP_PASSWORD);
  Serial.print("[WIFI] Abra: http://");
  Serial.println(ip);
}

// Inicializa a tentativa de conexão com os dados da EEPROM
void tentarConectar() {
  if (!possuiConfig()) {
    iniciarPortal();
    return;
  }

  Serial.print("[WIFI] Conectando em: ");
  Serial.println(wifiConfig.ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiConfig.ssid, wifiConfig.password);

  inicioConexao = millis();
  ultimaTentativa = millis();
}

} // Fim namespace anônimo

// ==============================================================================
// FUNÇÕES PÚBLICAS
// ==============================================================================

void wifiInit() {
  carregarConfig();

  if (!possuiConfig()) {
    iniciarPortal(); // Sem credenciais, já abre o portal
    return;
  }

  tentarConectar(); // Tenta conectar na rede gravada
}

// Função rodando continuamente no loop
void wifiLoop() {
  // 1. COMPORTAMENTO QUANDO O PORTAL ESTÁ ATIVO
  if (portalAtivo) {
    if (dnsServer) dnsServer->processNextRequest(); // Responde chamadas DNS
    if (server)    server->handleClient();          // Responde chamadas HTTP HTTP (Servidor web do Portal)

    // Estratégia de "cura": Se conectou "do nada", ou um STA pegou carona e
    // conectou via código antigo sem reiniciar, nós matamos o portal pra liberar RAM.
    if (WiFi.status() == WL_CONNECTED) {
      portalAtivo = false;

      // DELETA os objetos dinâmicos. Isso libera Heap suficiente para o SSL (HTTPS) funcionar depois.
      if (dnsServer) { dnsServer->stop(); delete dnsServer; dnsServer = nullptr; }
      if (server)    { server->stop();    delete server;    server    = nullptr; }

      Serial.println("[WIFI] Conectado. Portal encerrado.");
      Serial.print("[WIFI] Heap apos fechar portal: ");
      Serial.println(ESP.getFreeHeap());
      Serial.print("[WIFI] IP: ");
      Serial.println(WiFi.localIP());
    }

    return; // Não executa o resto do loop se estiver no modo portal
  }

  // 2. COMPORTAMENTO QUANDO O PORTAL ESTÁ DESATIVADO
  if (WiFi.status() == WL_CONNECTED) {
    return; // Tudo OK. Sai fora pra economizar ciclos de CPU.
  }

  // 3. SE PERDEU CONEXÃO OU AINDA ESTÁ TENTANDO CONECTAR
  
  // Timeout: Passaram-se WIFI_TIMEOUT_MS (ex: 15 seg) e não conectou. Aborta e sobe o portal de emergência.
  if (millis() - inicioConexao >= WIFI_TIMEOUT_MS) {
    Serial.println("[WIFI] Falha ao conectar. Subindo portal.");
    iniciarPortal();
    return;
  }

  // Se não deu o Timeout, continua tentando em intervalos.
  if (millis() - ultimaTentativa >= WIFI_RETRY_INTERVAL_MS) {
    tentarConectar();
  }
}

bool wifiConectado() {
  return WiFi.status() == WL_CONNECTED;
}

String wifiIP() {
  if (!wifiConectado()) return String("0.0.0.0");
  return WiFi.localIP().toString();
}
