#ifndef LEDS_H
#define LEDS_H

// ==============================================================================
// MÓDULO DE LEDs (Indicadores Visuais)
// Responsável por acionar os LEDs físicos na placa para dar feedback visual
// sobre a conexão com a Internet, comunicação RS485 e comunicação com a API.
// ==============================================================================

// Inicializa os pinos dos LEDs como saída e garante que iniciem apagados
void ledsInit();

// Função que deve ser chamada continuamente no loop principal.
// Ela gerencia o piscar contínuo (ex: Wi-Fi) e apaga os LEDs que foram
// acesos momentaneamente pelas funções abaixo.
void ledsLoop();

// Acende o LED indicador de comunicação com os módulos (RS485) momentaneamente
void ledPiscarModulo();

// Acende o LED indicador de envio de dados (API) momentaneamente
void ledPiscarAPI();

#endif
