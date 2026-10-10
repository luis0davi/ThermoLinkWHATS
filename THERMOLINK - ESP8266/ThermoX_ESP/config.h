#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ==============================================================================
// CONFIGURAÇÕES GERAIS DO FIRMWARE
// ==============================================================================

// Versão atual do firmware. Utilizada para verificação de atualização OTA.
#define FIRMWARE_VERSION "v4.5.2"

// ==============================================================================
// CONFIGURAÇÕES DO GITHUB (ATUALIZAÇÃO OTA - OVER THE AIR)
// ==============================================================================
// Repositório de onde o firmware será baixado
#define GITHUB_REPO "Luis-Davi-medeiros/ESP8266_ATUALIZA-OE_ThermoLink"
// Nome do arquivo de firmware que deve ser baixado nos releases do GitHub
#define FIRMWARE_ASSET_NAME "firmware.bin"
// Token de acesso (se aplicável) - Atualmente vazio para repositórios públicos
#define GITHUB_TOKEN ""

// Intervalo de verificação periódica de atualizações (1 hora = 3600000 ms)
#define OTA_CHECK_INTERVAL_MS 3600000UL   // 1 hora = 3600000 ms
// Tempo de retry caso a verificação inicial no boot falhe por instabilidade de rede
#define OTA_RETRY_INTERVAL_MS 30000UL     // 30 segundos
// Porta local utilizada para o serviço OTA
#define OTA_PORT 8266

// ==============================================================================
// CONFIGURAÇÕES DE COMUNICAÇÃO RS485 (MODBUS)
// ==============================================================================
// Pinos conectados ao módulo MAX485
#define RS485_RX_PIN 12       // D6 -> RO (Receiver Output) do MAX485
#define RS485_TX_PIN 13       // D7 -> DI (Driver Input) do MAX485
#define RS485_DE_RE_PIN 4     // D2 -> Pinos DE (Data Enable) e RE (Receiver Enable) do MAX485 em curto

// Taxa de transmissão de dados (Baud rate) para a rede RS485
#define RS485_BAUD 9600

// ==============================================================================
// CONFIGURAÇÕES DE LEDS INDICADORES
// ==============================================================================
// Pinos reais do hardware utilizados para acionar LEDs de status
#define LED_INTERNET_PIN 5  // D1 -> Indica status da conexão Wi-Fi/Internet
#define LED_MODULO_PIN   14 // D5 -> Indica status da comunicação com os módulos via RS485
#define LED_API_PIN      15 // D8 -> Indica status da comunicação com a API (Envio de dados)

// ==============================================================================
// PARÂMETROS E TEMPORIZAÇÕES DA COMUNICAÇÃO RS485
// ==============================================================================
// Número máximo de módulos suportados no barramento (Padrão Modbus de endereçamento)
#define RS485_MAX_MODULOS 31

// Intervalo geral de varredura (Tempo entre as consultas de ciclo completo aos módulos)
#define RS485_INTERVAL_MS 1500        // 1.5s - tempo suficiente para intercalar com envio HTTP para a nuvem

// Tempos de espera e processamento de quadros
#define RS485_FRAME_TIMEOUT_MS 80     // Tempo máximo para formar/capturar um pacote recebido
#define RS485_RESPONSE_TIMEOUT_MS 500 // Tempo de tolerância esperando a resposta de um módulo na rede

// Tentativas de reenvio em caso de falha e atraso entre tentativas
#define RS485_TENTATIVAS 1
#define RS485_RETRY_DELAY_MS 30

// Tamanho do buffer serial para armazenamento de bytes recebidos do RS485
#define RS485_BUFFER_SIZE 80

// ==============================================================================
// MAPEAMENTO DOS MÓDULOS DE TESTE
// ==============================================================================
// Array de IDs Modbus para os módulos que serão escaneados na rede.
const uint8_t MODULOS_TESTE[RS485_MAX_MODULOS] = {
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31
};

// ==============================================================================
// CONFIGURAÇÕES DO SISTEMA E REINICIALIZAÇÃO AUTOMÁTICA
// ==============================================================================
// Habilita a reinicialização automática preventiva a cada 24 horas (limpeza de RAM/heap)
#define SISTEMA_RESET_DIARIO_HABILITADO true
// 24 horas = 24 * 60 * 60 * 1000 = 86.400.000 ms
#define SISTEMA_RESET_INTERVALO_MS (24UL * 60UL * 60UL * 1000UL)

// Filtro (banda morta) para variação de temperatura. Se a temperatura variar menos que esse valor, 
// pode ser considerada estável ou ignorada, dependendo da lógica do sensor.
#define DEADBAND_TEMP_THRES 1

#endif
