#ifndef OTA_H
#define OTA_H

// ==============================================================================
// MÓDULO DE OTA (Over-The-Air Update)
// Gerencia DOIS mecanismos de atualização de firmware:
//
// 1. OTA LOCAL (ArduinoOTA): Via rede local, usando a IDE do Arduino ou
//    ferramentas de linha de comando. Útil durante desenvolvimento.
//
// 2. OTA VIA GITHUB: Verifica periodicamente se há uma release nova no repositório
//    configurado em config.h (GITHUB_REPO). Se houver, faz o download e instala
//    automaticamente sem intervenção humana.
// ==============================================================================

// Configura os callbacks e inicia o serviço OTA local (ArduinoOTA).
// Também faz a primeira verificação de atualização no GitHub.
void otaInit();

// Loop não-bloqueante que processa requisições OTA locais e 
// verifica novas versões no GitHub a cada OTA_CHECK_INTERVAL_MS (1 hora)
// e logo no primeiro boot/reboot.
void otaLoop();

// Dispara uma verificação de atualização no GitHub imediatamente (manual ou comando serial)
void otaVerificarAgora();

#endif
