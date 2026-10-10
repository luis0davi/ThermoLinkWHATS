#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <Arduino.h>

// ==============================================================================
// MÓDULO DE GERENCIAMENTO DE WI-FI E PORTAL CAPTIVE
// Responsável por conectar o ESP8266 à rede Wi-Fi configurada.
// Caso não consiga conectar, sobe um Ponto de Acesso (AP) e um Portal Captive
// para que o usuário possa configurar a rede e a senha.
// ==============================================================================

// Lê a EEPROM em busca das credenciais Wi-Fi. Tenta conectar ou sobe o portal.
void wifiInit();

// Loop não-bloqueante para manter a conexão ativa e processar clientes do Portal Captive.
void wifiLoop();

// Retorna 'true' se o dispositivo está conectado com sucesso ao Wi-Fi.
bool wifiConectado();

// Retorna o IP local do dispositivo na rede, ou "0.0.0.0" se desconectado.
String wifiIP();

// Funções inline (apelidos/aliases) para compatibilidade com outros arquivos
inline void wifiManagerInit() { wifiInit(); }
inline void wifiManagerLoop() { wifiLoop(); }

#endif
