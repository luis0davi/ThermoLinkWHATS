#include <Arduino.h>
#include <ArduinoOTA.h>          // OTA local via rede (IDE Arduino ou espota.py)
#include <ESP8266HTTPClient.h>   // Para requisições HTTP/HTTPS
#include <WiFiClientSecure.h>    // Para HTTPS com o GitHub
#include <Updater.h>             // Biblioteca de baixo nível para gravar firmware na flash
#include <ArduinoJson.h>         // Parsing da resposta JSON da API do GitHub

#include "config.h"
#include "wifi_manager.h"
#include "ota.h"

// ==============================================================================
// Namespace anônimo: variáveis e funções privadas do módulo
// ==============================================================================
namespace {

enum StatusVerificacaoOTA {
  OTA_STATUS_ATUALIZADO,        // Verificou com sucesso e já está na versão mais recente
  OTA_STATUS_NOVA_VERSAO,       // Verificou com sucesso e há nova versão disponível para download
  OTA_STATUS_FALHA_CONEXAO      // Falha ao conectar/parsear (erro de rede ou DNS)
};

unsigned long ultimaVerificacaoGitHub = 0; // Timestamp da última checagem bem-sucedida ao GitHub
bool atualizacaoEmAndamento = false;       // Flag para evitar checagens simultâneas
bool otaLocalIniciado = false;             // Flag para iniciar ArduinoOTA local apenas uma vez
bool checagemInicialConcluida = false;     // Flag para garantir a checagem imediata no boot/reinício
unsigned long ultimaTentativaFalha = 0;    // Timestamp de retry caso a checagem de boot falhe
unsigned long wifiEstavelTimestamp = 0;    // Tempo em que o Wi-Fi conectou para dar respiro de DNS

// Normaliza strings de versão removendo 'v'/'V', espaços e convertendo para minúsculas
String normalizarVersao(const String& v) {
  String s = v;
  s.trim();
  s.toLowerCase();
  while (s.startsWith("v")) {
    s = s.substring(1);
    s.trim();
  }
  return s;
}

// ==============================================================================
// verificarAtualizacaoGitHub
// Consulta a API do GitHub para obter a última release e comparar com a versão atual.
// Retorna StatusVerificacaoOTA indicando o resultado detalhado.
// ==============================================================================
StatusVerificacaoOTA verificarAtualizacaoGitHub(String &downloadUrl, String &novaVersao) {
  WiFiClientSecure secureClient;
  secureClient.setInsecure(); // Aceita qualquer certificado (prático para ESP8266)
  secureClient.setTimeout(15000);
  HTTPClient https;
  https.setTimeout(15000);

  // Monta a URL da API de releases do GitHub
  String url = String("https://api.github.com/repos/") + GITHUB_REPO + "/releases/latest";

  Serial.printf("[OTA-GITHUB] Consultando API: %s\n", url.c_str());

  if (!https.begin(secureClient, url)) {
    Serial.println(F("[OTA-GITHUB] Falha ao iniciar conexao HTTPS"));
    return OTA_STATUS_FALHA_CONEXAO;
  }

  // Headers necessários pela API do GitHub
  https.addHeader("User-Agent", "ESP8266-OTA-Client");
  https.addHeader("Accept", "application/vnd.github+json");

  // Se o repositório for privado, usa o token de acesso
  if (strlen(GITHUB_TOKEN) > 0) {
    https.addHeader("Authorization", String("Bearer ") + GITHUB_TOKEN);
  }

  int httpCode = https.GET();

  // Tratamento específico de Rate Limit da API do GitHub (HTTP 403)
  if (httpCode == 403) {
    Serial.println(F("[OTA-GITHUB] AVISO: Limite de requisicoes da API do GitHub atingido (HTTP 403 Rate Limit)."));
    Serial.println(F("[OTA-GITHUB] O ESP mantera o firmware atual e tentara novamente no proximo ciclo."));
    https.end();
    return OTA_STATUS_ATUALIZADO; // Evita loop frenético de retries a cada 30 segundos
  }

  if (httpCode != HTTP_CODE_OK) {
    Serial.printf("[OTA-GITHUB] Erro na requisicao GitHub: %d\n", httpCode);
    https.end();
    return OTA_STATUS_FALHA_CONEXAO;
  }

  // Filtro de parsing JSON: só extrai os campos que nos interessam para poupar RAM
  JsonDocument filter;
  filter["tag_name"] = true;
  filter["assets"][0]["name"] = true;
  filter["assets"][0]["browser_download_url"] = true;

  JsonDocument doc;
  // Faz o parsing direto do stream HTTP para evitar carregar tudo na RAM
  DeserializationError err = deserializeJson(
      doc, https.getStream(), DeserializationOption::Filter(filter));

  https.end();

  if (err) {
    Serial.printf("[OTA-GITHUB] Falha ao parsear JSON: %s\n", err.c_str());
    return OTA_STATUS_FALHA_CONEXAO;
  }

  // Extrai a tag da release (ex: "v4.5.6" ou "V4.5.6")
  const char* tag = doc["tag_name"];
  if (!tag) {
    Serial.println(F("[OTA-GITHUB] Nao encontrei tag_name na resposta do GitHub"));
    return OTA_STATUS_FALHA_CONEXAO;
  }

  Serial.printf("[OTA-GITHUB] Versao local: %s | Versao mais recente no GitHub: %s\n", FIRMWARE_VERSION, tag);

  // Compara a tag do GitHub com a versão atual normalizada (ignora maiúsculas/minúsculas e 'v')
  if (normalizarVersao(tag) == normalizarVersao(FIRMWARE_VERSION)) {
    Serial.printf("[OTA-GITHUB] Firmware local ja esta na versao mais recente (%s)!\n", tag);
    return OTA_STATUS_ATUALIZADO;
  }

  // Procura o arquivo de firmware (ex: "firmware.bin") nos assets da release
  for (JsonObject asset : doc["assets"].as<JsonArray>()) {
    const char* nome = asset["name"];
    if (nome && String(nome).equalsIgnoreCase(FIRMWARE_ASSET_NAME)) {
      downloadUrl = asset["browser_download_url"].as<String>();
      novaVersao = String(tag);
      return OTA_STATUS_NOVA_VERSAO;
    }
  }

  Serial.printf("[OTA-GITHUB] Asset '%s' nao encontrado na release %s\n", FIRMWARE_ASSET_NAME, tag);
  return OTA_STATUS_ATUALIZADO;
}

// ==============================================================================
// baixarEAtualizar
// Faz o download do firmware.bin e o grava diretamente na flash do ESP8266.
// Utiliza streaming em blocos com buffer e timeout para garantir recepção total.
// ==============================================================================
bool baixarEAtualizar(const String &url) {
  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  secureClient.setTimeout(25000); // 25s timeout

  HTTPClient https;
  https.setTimeout(25000);

  Serial.printf("[OTA-GITHUB] Baixando firmware de: %s\n", url.c_str());

  // Segue redirecionamentos HTTPS automaticamente (GitHub redireciona para release-assets)
  https.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

  if (!https.begin(secureClient, url)) {
    Serial.println(F("[OTA-GITHUB] Falha ao iniciar download"));
    return false;
  }

  https.addHeader("User-Agent", "ESP8266-OTA-Client");

  int httpCode = https.GET();
  if (httpCode != HTTP_CODE_OK) {
    Serial.printf("[OTA-GITHUB] Erro no download: %d\n", httpCode);
    https.end();
    return false;
  }

  // Pega o tamanho do arquivo para reservar espaço na flash
  int tamanho = https.getSize();
  if (tamanho <= 0) {
    Serial.println(F("[OTA-GITHUB] Tamanho do arquivo invalido"));
    https.end();
    return false;
  }

  // Verifica se há espaço suficiente na flash para o novo firmware
  if (!Update.begin(tamanho)) {
    Serial.printf("[OTA-GITHUB] Nao ha espaco suficiente para OTA: %s\n", Update.getErrorString().c_str());
    https.end();
    return false;
  }

  // Grava o firmware em streaming com buffer e timeout seguro
  Serial.println(F("[OTA-GITHUB] Gravando firmware no ESP8266..."));
  WiFiClient *stream = https.getStreamPtr();

  uint8_t buff[1024];
  size_t escrito = 0;
  size_t ultimoProgresso = 0;
  unsigned long timeoutInicio = millis();

  while (https.connected() && (escrito < (size_t)tamanho)) {
    size_t disponivel = stream->available();
    if (disponivel > 0) {
      size_t ler = (disponivel > sizeof(buff)) ? sizeof(buff) : disponivel;
      int lidos = stream->readBytes(buff, ler);
      if (lidos > 0) {
        Update.write(buff, lidos);
        escrito += lidos;
        timeoutInicio = millis(); // Reset do timeout a cada bloco gravado

        // Log de progresso a cada ~64 KB ou no fim
        if (escrito - ultimoProgresso >= 65536 || escrito == (size_t)tamanho) {
          ultimoProgresso = escrito;
          Serial.printf("[OTA-GITHUB] Progresso: %u de %d bytes (%u%%)\n", 
                        (unsigned int)escrito, tamanho, (unsigned int)((escrito * 100) / tamanho));
        }
      }
    } else {
      delay(5);
      yield();
      ESP.wdtFeed();
      // Timeout de 20 segundos se não receber nenhum dado
      if (millis() - timeoutInicio > 20000UL) {
        Serial.println(F("[OTA-GITHUB] TIMEOUT: Servidor parou de enviar dados."));
        break;
      }
    }
    yield();
  }

  // Verifica se todos os bytes foram gravados
  if (escrito != (size_t)tamanho) {
    Serial.printf("[OTA-GITHUB] Escrita incompleta: %u de %d bytes\n", (unsigned int)escrito, tamanho);
    Update.end(false); // Cancela o update
    https.end();
    return false;
  }

  // Finaliza e verifica a integridade da gravação
  if (!Update.end()) {
    Serial.printf("[OTA-GITHUB] Erro ao finalizar update: %s\n", Update.getErrorString().c_str());
    https.end();
    return false;
  }

  if (!Update.isFinished()) {
    Serial.println(F("[OTA-GITHUB] Update nao finalizou corretamente"));
    https.end();
    return false;
  }

  Serial.println(F("[OTA-GITHUB] OTA concluido com sucesso! Reiniciando o ESP8266..."));
  https.end();
  return true;
}


// ==============================================================================
// processarOTA
// Orquestra a verificação e aplicação da atualização.
// Retorna true em caso de verificação com sucesso ou atualização aplicada;
// retorna false em caso de falha de conexão.
// ==============================================================================
bool processarOTA() {
  if (atualizacaoEmAndamento || !wifiConectado()) return false;

  Serial.println();
  Serial.println(F("=============================================="));
  Serial.println(F("[OTA-GITHUB] INICIANDO VERIFICACAO DE FIRMWARE"));
  Serial.println(F("=============================================="));

  String downloadUrl, novaVersao;
  StatusVerificacaoOTA status = verificarAtualizacaoGitHub(downloadUrl, novaVersao);

  if (status == OTA_STATUS_NOVA_VERSAO) {
    Serial.printf("[OTA-GITHUB] >> NOVA VERSAO DISPONIVEL: %s! <<\n", novaVersao.c_str());
    atualizacaoEmAndamento = true;
    
    if (baixarEAtualizar(downloadUrl)) {
      delay(1000);
      ESP.restart(); // Reinicia para carregar o novo firmware gravado na flash
      return true;
    } else {
      Serial.println(F("[OTA-GITHUB] Falha na atualizacao, mantendo firmware atual."));
      atualizacaoEmAndamento = false;
      return false;
    }
  } else if (status == OTA_STATUS_ATUALIZADO) {
    Serial.println(F("[OTA-GITHUB] Sistema atualizado. Nenhuma acao necessaria."));
    Serial.println(F("==============================================\n"));
    return true;
  } else {
    Serial.println(F("[OTA-GITHUB] Nao foi possivel conectar a API do GitHub."));
    Serial.println(F("==============================================\n"));
    return false;
  }
}

} // Fim namespace

// ==============================================================================
// FUNÇÕES PÚBLICAS
// ==============================================================================

// Configura os callbacks do ArduinoOTA (feedback no serial) e inicia o serviço se Wi-Fi disponível
void otaInit() {
  ArduinoOTA.setPort(OTA_PORT);
  ArduinoOTA.setHostname("ThermoX-ESP"); // Nome que aparece na IDE do Arduino (Ferramentas > Porta)

  // Callback: início da atualização local (via IDE)
  ArduinoOTA.onStart([]() {
    Serial.println(F("[OTA] Iniciando atualizacao local via rede..."));
  });

  // Callback: finalização da atualização local
  ArduinoOTA.onEnd([]() {
    Serial.println(F("[OTA] Atualizacao local concluida."));
  });

  // Callback: progresso da atualização (percentual)
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("[OTA] %u%%\r", (progress * 100) / total);
  });

  // Callback: erro durante a atualização
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("[OTA] Erro [%u]\n", error);
  });

  // Inicia o serviço somente se já tiver Wi-Fi; caso contrário, será iniciado no otaLoop()
  if (wifiConectado()) {
    ArduinoOTA.begin();
    otaLocalIniciado = true;
    Serial.println(F("[OTA] OTA local (ArduinoOTA) inicializado."));
  } else {
    Serial.println(F("[OTA] Aguardando Wi-Fi para servico OTA."));
  }
}

// Loop de manutenção do OTA
void otaLoop() {
  if (!wifiConectado()) {
    wifiEstavelTimestamp = 0;
    return;
  }

  unsigned long agora = millis();
  if (wifiEstavelTimestamp == 0) {
    wifiEstavelTimestamp = agora;
  }

  // Inicia o OTA local na primeira vez que o Wi-Fi conectar
  if (!otaLocalIniciado) {
    ArduinoOTA.begin();
    otaLocalIniciado = true;
    Serial.println(F("[OTA] OTA local inicializado apos conexao."));
  }

  // Processa requisições OTA locais (da IDE do Arduino via rede)
  ArduinoOTA.handle();

  if (atualizacaoEmAndamento) return;

  // 1. CHECAGEM AUTOMÁTICA IMEDIATA NO BOOT / REINÍCIO
  // Aguarda 2 segundos após Wi-Fi conectar para estabilização de DNS/rede
  if (!checagemInicialConcluida) {
    if (agora - wifiEstavelTimestamp < 2000) {
      return;
    }

    // Se houve falha anterior no boot, aguarda tempo de retry (30s)
    if (ultimaTentativaFalha > 0 && (agora - ultimaTentativaFalha < OTA_RETRY_INTERVAL_MS)) {
      return;
    }

    Serial.println(F("[OTA-GITHUB] Checagem automatica de boot/reinicio em andamento..."));
    bool ok = processarOTA();
    if (ok) {
      checagemInicialConcluida = true;
      ultimaVerificacaoGitHub = agora;
      Serial.printf("[OTA-GITHUB] Checagem inicial concluida com sucesso. Proxima checagem em %lu hora(s).\n", (OTA_CHECK_INTERVAL_MS / 3600000UL));
    } else {
      ultimaTentativaFalha = agora;
      Serial.printf("[OTA-GITHUB] Checagem de boot falhou. Tentando novamente em %lu segundos...\n", (OTA_RETRY_INTERVAL_MS / 1000UL));
    }
    return;
  }

  // 2. CHECAGEM PERIÓDICA PROGRAMADA (A cada 1 HORA = OTA_CHECK_INTERVAL_MS)
  if (agora - ultimaVerificacaoGitHub >= OTA_CHECK_INTERVAL_MS) {
    ultimaVerificacaoGitHub = agora;
    Serial.println(F("[OTA-GITHUB] Checagem periodica agendada (1 hora) em andamento..."));
    processarOTA();
  }
}

// Força uma verificação de atualização no GitHub imediatamente
void otaVerificarAgora() {
  if (wifiConectado() && !atualizacaoEmAndamento) {
    Serial.println(F("[OTA-GITHUB] Forcando verificacao manual de atualizacao..."));
    bool ok = processarOTA();
    if (ok) {
      checagemInicialConcluida = true;
      ultimaVerificacaoGitHub = millis();
    }
  } else {
    Serial.println(F("[OTA-GITHUB] Impossivel verificar: Sem Wi-Fi ou atualizacao em andamento."));
  }
}
