#ifndef SISTEMA_H
#define SISTEMA_H

#include <Arduino.h>

// Inicializa o módulo de sistema e registra o tempo de boot
void sistemaInit();

// Loop principal de manutenção: monitora o uptime e dispara o reset diário de 24 horas
void sistemaLoop();

// Retorna o tempo de atividade contínua (uptime) em segundos
uint32_t sistemaUptimeSegundos();

// Reinicia o ESP8266 de forma limpa e rápida (apenas alguns milissegundos)
void sistemaReiniciar(const char* motivo);

// Dispara o reporte de status/firmware do dispositivo ao Supabase
void sistemaReportarStatusAgora();

#endif

