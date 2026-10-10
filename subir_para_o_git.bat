@echo off
title Enviar ThermoLink para o GitHub
color 0A
cls
echo ======================================================
echo    🚀 ENVIANDO THERMOLINK PARA O GITHUB...
echo ======================================================
echo.
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ======================================================
    echo    ✅ SUCESSO! CODIGO ENVIADO PARA O GITHUB!
    echo ======================================================
) else (
    echo ======================================================
    echo    ⚠️ Se pediu login, autorize na janela do navegador.
    echo ======================================================
)
echo.
pause
