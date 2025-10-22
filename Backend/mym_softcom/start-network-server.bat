@echo off
title MyM Softcom - Servidor de Red Local
color 0A

echo.
echo ========================================
echo    MyM Softcom - Servidor de Red Local
echo ========================================
echo.

echo [INFO] Iniciando servidor para acceso desde red local...
echo [INFO] El servidor sera accesible desde cualquier dispositivo en la red
echo.

REM Obtener la IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set LOCAL_IP=%%b
        goto :found
    )
)
:found

if defined LOCAL_IP (
    echo [NETWORK] Tu IP local es: %LOCAL_IP%
    echo [ACCESS] Acceso local: http://localhost:5000
    echo [ACCESS] Acceso desde red: http://%LOCAL_IP%:5000
    echo [ACCESS] Swagger UI: http://%LOCAL_IP%:5000/swagger
) else (
    echo [WARNING] No se pudo detectar la IP local automaticamente
    echo [ACCESS] Acceso local: http://localhost:5000
)

echo.
echo [MOBILE] Para acceder desde movil/tablet:
echo [MOBILE] 1. Conecta el dispositivo a la misma red WiFi
echo [MOBILE] 2. Abre el navegador en el dispositivo
if defined LOCAL_IP (
    echo [MOBILE] 3. Ve a: http://%LOCAL_IP%:5000
) else (
    echo [MOBILE] 3. Ve a: http://[TU_IP_LOCAL]:5000
)
echo.

echo [CMD] Para detener el servidor: Ctrl+C
echo.
echo ========================================
echo.

REM Iniciar la aplicacion
dotnet run --environment Development

pause