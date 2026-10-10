#ifndef RELOGIO_H
#define RELOGIO_H

#include <Arduino.h>

// ==============================================================================
// MÓDULO DE RELÓGIO (NTP)
// Responsável por buscar e manter a hora certa via internet (Protocolo NTP),
// permitindo que o sistema gere timestamps ISO8601 exigidos pela API Supabase.
// ==============================================================================

// Inicializa a configuração NTP e ajusta o fuso horário (ex: GMT-3 para Brasil).
void relogioInit();

// Função loop reservada para checagens periódicas (atualmente o core faz sozinho em background).
void relogioLoop();

// Verifica se o relógio já conseguiu pegar a hora certa pela internet.
bool relogioSincronizado();

// Retorna uma string no formato ISO8601 completo (ex: "2024-03-25T14:30:00-03:00").
// Retorna vazio "" se a hora não estiver sincronizada.
String relogioObterDataHoraISO();

#endif
