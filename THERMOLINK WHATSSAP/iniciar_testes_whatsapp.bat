@echo off
title ThermoLink - Gateway WhatsApp & Automacao Diaria
cd /d "%~dp0whatsapp-tester"
echo ================================================================
echo   THERMOLINK - GATEWAY WHATSAPP & DISPARO DIARIO DE FORNOS
echo ================================================================
echo Servidor rodando na porta 3333...
echo Acesse o painel de gestao em: http://localhost:3333
echo Para encerrar o servico, feche esta janela.
echo ================================================================
echo.
start http://localhost:3333
node server.js
pause
