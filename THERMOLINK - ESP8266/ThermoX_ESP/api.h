#ifndef API_H
#define API_H

#include "sensores.h"

// ==============================================================================
// MÓDULO DE API (Comunicação HTTPS com o Supabase)
// Responsável por serializar uma leitura de temperatura para JSON
// e enviá-la via HTTP POST para o endpoint REST do Supabase.
//
// NOTA TÉCNICA: Não use WiFiClientSecure como variável global!
// Ele corrompe o estado SSL após o primeiro uso. Cada chamada a
// apiEnviarLeitura() cria sua própria instância local e a destrói ao final.
// ==============================================================================

// Inicializa o módulo (apenas imprime mensagem de debug).
void apiInit();

// Serializa a leitura para JSON e faz um HTTP POST para a tabela 'leituras' no Supabase.
// Retorna 'true' se o servidor respondeu com código 2xx (sucesso).
bool apiEnviarLeitura(const Leitura& leitura);

// Reporta o status atual do dispositivo (versão de firmware, IP, RSSI, uptime)
// para a tabela 'dispositivos' via HTTP PATCH no Supabase.
// Retorna 'true' se atualizado com sucesso no banco de dados.
bool apiReportarStatusDispositivo();

#endif

