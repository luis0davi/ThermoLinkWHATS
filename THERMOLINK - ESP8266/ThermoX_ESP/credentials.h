#ifndef CREDENTIALS_H
#define CREDENTIALS_H

// ==============================================================================
// CREDENCIAIS DE ACESSO - SUPABASE (API e Banco de Dados)
// ==============================================================================
// URL base do projeto no Supabase
#define SUPABASE_URL "https://zawnluboujbovpgrgdcx.supabase.co"
// Chave pública (anon/publishable key) para autorização das requisições via API
#define SUPABASE_KEY "sb_publishable_gJiVQXVjiuSPY3vHt2f8OA_CiES-4Ak"

// ==============================================================================
// CONFIGURAÇÕES DE FÁBRICA / IDENTIDADE PADRÃO
// ==============================================================================
// ESTES VALORES SÃO USADOS SOMENTE NA PRIMEIRA GRAVAÇÃO DA IDENTIDADE.
// Depois que a identidade estiver gravada na EEPROM do ESP8266, o firmware NÃO a substitui,
// garantindo que mesmo após atualizações de firmware via OTA, o dispositivo mantenha sua identidade.
#define DISPOSITIVO_ID_INICIAL 1           // ID interno do dispositivo (Ex: 1)
#define FORNO_ID_INICIAL 2                 // ID do forno onde o dispositivo está instalado
#define NUMERO_SERIE_INICIAL "THX-00001"   // Número de série no formato exigido pela API e pelo banco

#endif
