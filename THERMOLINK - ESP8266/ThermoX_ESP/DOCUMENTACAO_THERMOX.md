# 📘 DOCUMENTAÇÃO THERMOX ESP8266 — Firmware Modular v4.5.6

## Visão Geral

O **ThermoX ESP8266** é um firmware embarcado para o microcontrolador ESP8266 que atua como **gateway de temperatura industrial**. Ele coleta dados de temperatura de até 31 módulos Alutal conectados via RS485, e envia esses dados em tempo real para o banco de dados na nuvem **Supabase** (via HTTPS/REST).

---

## 🏗️ Arquitetura de Módulos

O projeto é organizado em módulos independentes, cada um responsável por uma parte do sistema:

```
ThermoX_ESP.ino        ← Ponto de entrada: setup() e loop()
│
├── config.h           ← Todas as constantes e configurações de hardware
├── credentials.h      ← Credenciais de acesso (Supabase + identidade de fábrica)
│
├── sistema            ← Inicialização geral e background tasks
├── identidade         ← Número de série e IDs gravados na EEPROM
├── leds               ← Feedback visual via LEDs indicadores
│
├── wifi_manager       ← Conexão Wi-Fi + Portal Captive (configuração via smartphone)
├── relogio            ← Sincronização de hora via NTP (para timestamps no banco)
│
├── rs485              ← Polling dos módulos Alutal via barramento RS485
├── protocolo_alutal   ← Decodificação do protocolo binário das respostas Alutal
│
├── sensores           ← Tabela de leituras e fila de envio para API
├── api                ← Envio HTTPS POST para o Supabase
└── ota                ← Atualização de firmware via ArduinoOTA (rede local) e GitHub
```

---

## 🔄 Fluxo de Dados (Ciclo Principal)

```
[Boot]
  ├─ Lê identidade da EEPROM (número de série, IDs)
  ├─ Configura pinos e LEDs indicadores
  ├─ Conecta no Wi-Fi (ou abre portal de configuração)
  ├─ Sincroniza hora via NTP (relogioInit - fuso GMT-3)
  ├─ Inicializa barramento RS485 e tabela de sensores
  └─ Inicia serviços OTA (local e verificação GitHub)

[Loop]
  ├─ wifiLoop()     → Mantém Wi-Fi ativo, reconecta se cair
  ├─ otaLoop()      → Checagem imediata pós-boot + periódica a cada 1h no GitHub
  ├─ relogioLoop()  → Mantém hora sincronizada em background
  ├─ rs485Loop()    → Polling não-bloqueante a cada 1.5s dos módulos Alutal
  ├─ sensoresLoop() → Envia leituras pendentes para o Supabase (HTTP POST)
  ├─ ledsLoop()     → Controla LEDs de Internet, Módulos e API
  └─ sistemaLoop()  → Monitor de uptime e auto-reset preventivo de 24 horas
```

---

## 📌 Mapeamento de Pinos (ESP8266 NodeMCU)

| Função               | Pino ESP | Label NodeMCU | Dispositivo        |
|----------------------|----------|---------------|--------------------|
| RS485 RX             | GPIO 12  | D6            | MAX485 → RO        |
| RS485 TX             | GPIO 13  | D7            | MAX485 → DI        |
| RS485 DE/RE          | GPIO 4   | D2            | MAX485 → DE + RE   |
| LED Internet (Wi-Fi) | GPIO 5   | D1            | LED verde          |
| LED Módulos (RS485)  | GPIO 14  | D5            | LED amarelo        |
| LED API (Supabase)   | GPIO 15  | D8            | LED azul           |

---

## 🧩 Descrição Detalhada dos Módulos

### `config.h`
Arquivo central de configuração. Define:
- Versão do firmware (`FIRMWARE_VERSION`)
- Repositório GitHub e asset de download do OTA
- Pinos de hardware (RS485, LEDs)
- Timeouts e intervalos de comunicação RS485
- Lista de módulos a serem consultados (IDs 1 a 31)

### `credentials.h`
Contém as credenciais sensíveis:
- URL e chave do projeto Supabase
- Valores padrão de fábrica para a identidade (usados apenas na primeira gravação)

---

### `identidade` (EEPROM — Offset 144)
Responsável por persistir a identidade do dispositivo na memória flash (EEPROM simulada).

**Estrutura gravada:**
```
IdentidadeConfig {
  magic:         0x54484431 ("THD1") ← Validação
  dispositivoId: uint32_t            ← Ex: 1
  fornoId:       uint32_t            ← Ex: 2
  numeroSerie:   char[31]            ← Ex: "THX-00001"
  checksum:      uint32_t            ← FNV-1a hash para integridade
}
```

**Proteção contra corrupção:**
Se o `magic` estiver correto mas o `checksum` falhar, o firmware **NÃO sobrescreve** a identidade. Evita perder a identidade por falha física na flash.

**Comandos disponíveis via Serial Monitor (115200 bps):**
```
SETID THX-00005     ← Grava nova identidade/serial na EEPROM
OTA                 ← Força verificação imediata de atualização no GitHub
RESET ou REBOOT     ← Executa reinicialização limpa imediata do ESP8266
UPTIME              ← Exibe tempo de atividade e memória RAM (heap) livre
```

---

### `wifi_manager` (EEPROM — Offset 0)
Gerencia a conexão Wi-Fi com dois modos:

**Modo STA (Normal):** Conecta à rede salva na EEPROM.

**Modo AP + Portal Captive:** Quando não há rede configurada ou timeout de 15s, o ESP:
1. Cria AP chamado **"ThermoLink"** (senha: `12345678`)
2. Serve página HTML com redes disponíveis
3. Usuário seleciona rede e digita senha pelo smartphone
4. ESP salva e reinicia

> **Otimização de RAM:** O servidor web e DNS são alocados e deletados dinamicamente, liberando ~10KB de heap para o SSL do Supabase.

---

### `rs485` (Protocolo Alutal)
Polling round-robin não-bloqueante dos módulos.

**Codificação do ID (protocolo Alutal):**

| Módulo | Byte Enviado | ASCII |
|--------|-------------|-------|
| 1      | 0x31        | '1'   |
| 9      | 0x39        | '9'   |
| 10     | 0x3A        | ':'   |
| 11     | 0x3B        | ';'   |
| 31     | 0x4F        | 'O'   |

**Frame de Comando Enviado (ASCII):**
```
< [ID] 2 3 R > /
```

**Máquina de Estados do Loop:**
1. Inicia nova consulta a cada 1.5s
2. Acumula bytes no buffer
3. Frame Timeout (80ms sem bytes) → processa com `processarFrameAlutal()`
4. Response Timeout (1000ms total) → abandona e avança para o próximo módulo

---

### `protocolo_alutal`
Decodifica o payload binário da resposta Alutal.

**Formato da Resposta:**
```
3C 32 [ID] 04 72 [CH1_H] [CH1_L] [CH2_H] [CH2_L] ...
```

**Decodificação de Temperatura:**
```
rawCh1 = (CH1_H << 8) | CH1_L   → uint16_t
canal1  = (int16_t) rawCh1       → valor em °C (pode ser negativo)
```

---

### `sensores`
Camada de buffer entre RS485 e envio para a API.

**Motivo do desacoplamento:**
Chamadas HTTP dentro do `rs485Loop()` bloqueiam centenas de ms, destruindo o timing serial. A solução é:
- `sensoresAtualizar()` → apenas armazena e marca como pendente
- `sensoresLoop()` → no loop principal, chama a API (context seguro)

---

### `api`
Envio de dados para o Supabase via HTTPS REST.

**Endpoint:** `POST https://[projeto].supabase.co/rest/v1/leituras`

**Payload JSON:**
```json
{
  "dispositivo_id": 1,
  "forno_id": 2,
  "modulo_alutal": 5,
  "canal_1": 245,
  "canal_2": 238,
  "numero_serie": "THX-00001"
}
```

### `api` (Envio de Leituras e Telemetria de Firmware)
Possui duas responsabilidades principais via HTTPS REST com o Supabase:

1. **Envio de Leituras (`apiEnviarLeitura`):**
   - Dispara `POST /rest/v1/leituras` com leituras dos sensores (canal 1, canal 2, número de série e timestamp ISO).
2. **Reporte Remoto de Firmware e Status (`apiReportarStatusDispositivo`):**
   - Dispara `PATCH /rest/v1/dispositivos?numero_serie=eq.[SERIAL]`
   - Registra remotamente no Supabase:
     - `firmware_version`: versão do firmware em execução (ex: `v4.5.1`)
     - `ip`: endereço IP local na rede do cliente
     - `rssi` / `wifi_rssi`: potência do sinal Wi-Fi
     - `uptime`: tempo de operação contínua formatado (ex: `1d 2h 15m`)
     - `status`: `"Online"`
     - `ultimo_acesso`: timestamp ISO da última sincronização
   - **Disparo:** executado automaticamente 5 segundos após o boot com Wi-Fi conectado, repetido a cada 30 minutos em background, e manualmente via comando serial `STATUS`.

> **Técnica crítica:** `WiFiClientSecure` é criado como variável **local** em cada chamada. Nunca global — o estado SSL se corrompe após o primeiro uso no ESP8266.

---

### `ota`
Dois mecanismos de atualização:

**1. OTA Local (ArduinoOTA):**
- Hostname: `ThermoX-ESP`
- Visível na IDE Arduino em: Ferramentas → Porta (porta 8266)

**2. OTA Automático via GitHub:**
- **Checagem Imediata no Boot / Reinício:** assim que o Wi-Fi conecta e o DNS estabiliza (2s), o ESP consulta imediatamente a API do GitHub por novas versões. Se houver falha de rede no primeiro instante, realiza retry a cada 30 segundos.
- **Checagem Periódica Agendada:** executa automaticamente a cada **1 hora** (`OTA_CHECK_INTERVAL_MS = 3600000UL`).
- Compara `tag_name` da release com `FIRMWARE_VERSION`.
- Se diferente: baixa `firmware.bin` em streaming diretamente para a memória flash.
- Reinicia automaticamente com o novo software e, ao subir, reporta a nova versão imediatamente para a nuvem.
- **Acionamento Manual:** digite `OTA` no Serial Monitor a qualquer momento para forçar verificação.

**Como publicar nova versão:**
1. Incremente `FIRMWARE_VERSION` em `config.h` (ex: `v4.5.2`)
2. Compile e gere o `.bin`
3. Crie Release no GitHub com a tag igual à versão (ex: `v4.5.2`)
4. Faça upload do `firmware.bin` como asset
5. O ESP detecta automaticamente na próxima verificação ou logo após reiniciar

---

### `sistema` (Ciclo de Vida, Auto-Reset Diário e Telemetria)
- **Auto-Reset Preventivo de 24 Horas:** o ESP8266 reinicia automaticamente uma vez por dia (a cada 24 horas = 86.400.000 ms de operação contínua).
- **Objetivo:** renovar a memória RAM (heap), eliminar fragmentação de SSL e reiniciar a pilha Wi-Fi e RS-485 com saúde total 24/7.
- **Transição rápida:** o microcontrolador reinicia em milissegundos e, ao religar, imediatamente executa a checagem de firmware OTA no GitHub e reporta seu status atualizado para a nuvem.
- **Diagnóstico:** a cada 6 horas emite relatório de uptime e heap livre no Serial Monitor.
- **Comandos no Console Serial (115200 bps):**
  - `STATUS`: Força o envio imediato da versão de firmware e telemetria para o Supabase.
  - `OTA`: Força a checagem e download de atualização do GitHub.
  - `UPTIME`: Exibe tempo de atividade e memória heap livre.
  - `RESET` ou `REBOOT`: Reinicia o microcontrolador de forma limpa.
  - `SETID THX-00001`: Grava manualmente nova identidade na EEPROM.


---

### `relogio` (NTP)
- Fuso: **GMT-3** (Brasil/Brasília)
- Servidores: `pool.ntp.org` e `time.nist.gov`
- Formato de saída: `2024-03-25T14:30:00-03:00` (ISO 8601)

---

### `leds`

| LED            | Comportamento  | Significado                      |
|----------------|----------------|----------------------------------|
| LED_INTERNET   | Pisca a cada 1s | Wi-Fi conectado                 |
| LED_INTERNET   | Apagado         | Sem conexão Wi-Fi               |
| LED_MODULO     | Pisca 100ms     | Frame RS485 recebido com sucesso|
| LED_API        | Pisca 200ms     | Dados enviados ao Supabase      |

---

## 🗄️ Estrutura da EEPROM (256 bytes)

| Offset | Tamanho | Conteúdo                                             |
|--------|---------|------------------------------------------------------|
| 0      | ~132 B  | `WifiConfig` (magic + SSID + senha)                  |
| 144    | ~55 B   | `IdentidadeConfig` (magic + IDs + série + checksum)  |

> Os dois blocos não se sobrepõem. Endereços entre 132–143 e 199–255 são livres para uso futuro.

---

## 📦 Arquivos do Projeto

| Arquivo                  | Função                                         |
|--------------------------|------------------------------------------------|
| `ThermoX_ESP.ino`        | Ponto de entrada (`setup()` e `loop()`)        |
| `config.h`               | Configurações gerais e pinos de hardware       |
| `credentials.h`          | Credenciais Supabase e identidade de fábrica   |
| `sistema.h / .cpp`       | Background tasks do sistema                    |
| `identidade.h / .cpp`    | Gerenciamento da EEPROM (número de série)      |
| `leds.h / .cpp`          | Controle dos LEDs indicadores                  |
| `wifi_manager.h / .cpp`  | Wi-Fi + Portal Captive                         |
| `relogio.h / .cpp`       | NTP e geração de timestamps ISO8601            |
| `rs485.h / .cpp`         | Polling RS485 não-bloqueante                   |
| `protocolo_alutal.h/.cpp`| Decodificação do protocolo Alutal              |
| `sensores.h / .cpp`      | Buffer de leituras e fila de envio             |
| `api.h / .cpp`           | Envio HTTPS para o Supabase                    |
| `ota.h / .cpp`           | Atualização OTA local e via GitHub             |
| `DOCUMENTACAO_THERMOX.md`| Esta documentação                              |

---

> 📌 Todos os arquivos `.h` e `.cpp` contêm comentários detalhados em português diretamente no código.
> Abra qualquer arquivo na IDE do Arduino para ver as explicações linha a linha.
