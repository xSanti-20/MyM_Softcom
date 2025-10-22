@echo off
REM Script para configurar el Firewall de Windows para acceso de red
REM Requiere ejecutarse como Administrador

echo ========================================
echo  Configuracion de Firewall - MyM Softcom
echo ========================================
echo.

REM Verificar si se esta ejecutando como administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Ejecutando con privilegios de administrador
    echo.
) else (
    echo [ERROR] Este script requiere privilegios de administrador
    echo [INFO] Haz clic derecho en el archivo y selecciona "Ejecutar como administrador"
    echo.
    pause
    exit /b 1
)

echo [INFO] Configurando reglas de firewall para el puerto 5000...
echo.

REM Eliminar reglas existentes (por si ya existen)
netsh advfirewall firewall delete rule name="MyM Softcom - HTTP (5000)" >nul 2>&1
netsh advfirewall firewall delete rule name="MyM Softcom - HTTP (5000) Entrada" >nul 2>&1
netsh advfirewall firewall delete rule name="MyM Softcom - HTTP (5000) Salida" >nul 2>&1

REM Crear regla de entrada para el puerto 5000
echo [STEP 1/2] Creando regla de entrada para el puerto 5000...
netsh advfirewall firewall add rule name="MyM Softcom - HTTP (5000) Entrada" dir=in action=allow protocol=TCP localport=5000 profile=any
if %errorLevel% == 0 (
    echo [OK] Regla de entrada creada exitosamente
) else (
    echo [ERROR] No se pudo crear la regla de entrada
)
echo.

REM Crear regla de salida para el puerto 5000
echo [STEP 2/2] Creando regla de salida para el puerto 5000...
netsh advfirewall firewall add rule name="MyM Softcom - HTTP (5000) Salida" dir=out action=allow protocol=TCP localport=5000 profile=any
if %errorLevel% == 0 (
    echo [OK] Regla de salida creada exitosamente
) else (
    echo [ERROR] No se pudo crear la regla de salida
)
echo.

echo ========================================
echo [SUCCESS] Configuracion completada!
echo ========================================
echo.
echo El puerto 5000 ahora esta abierto para:
echo  - Red local (LAN)
echo  - Red publica (Internet)
echo  - Redes privadas
echo  - Redes de dominio
echo.
echo NOTA: Si tienes un router, tambien necesitas:
echo  1. Configurar Port Forwarding en el router
echo  2. Redirigir el puerto 5000 a la IP local de este equipo
echo  3. Usar tu IP publica para acceso desde internet
echo.
echo Para ver las reglas creadas, ejecuta:
echo   netsh advfirewall firewall show rule name="MyM Softcom - HTTP (5000) Entrada"
echo.
pause
