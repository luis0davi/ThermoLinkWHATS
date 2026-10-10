#ifndef IDENTIDADE_H
#define IDENTIDADE_H

#include <Arduino.h>

// ==============================================================================
// MÓDULO DE IDENTIDADE
// Responsável por gerenciar os IDs e número de série do dispositivo.
// Esses dados são lidos/gravados na EEPROM para não se perderem durante
// atualizações de firmware (OTA).
// ==============================================================================

// Inicializa o módulo, lê a EEPROM e verifica se já existe uma identidade gravada.
void identidadeInit();

// Funções de acesso (Getters) para as configurações do dispositivo
uint32_t identidadeDispositivoId();   // Retorna o ID numérico do dispositivo
uint32_t identidadeFornoId();         // Retorna o ID do forno
const char* identidadeNumeroSerie();  // Retorna o Número de Série (Ex: "THX-00001")

// Imprime a identidade atual no monitor serial
void identidadeImprimir();

// Função para redefinir manualmente a identidade do dispositivo 
// recebendo uma string via Serial (Ex: "THX-00001")
bool identidadeDefinirManualmente(const char* novoID);

#endif
