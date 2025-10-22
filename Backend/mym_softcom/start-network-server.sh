#!/bin/bash

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

clear

echo -e "${GREEN}========================================"
echo -e "   MyM Softcom - Servidor de Red Local"
echo -e "========================================${NC}"
echo ""

echo -e "${BLUE}[INFO]${NC} Iniciando servidor para acceso desde red local..."
echo -e "${BLUE}[INFO]${NC} El servidor será accesible desde cualquier dispositivo en la red"
echo ""

# Obtener IP local
LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)

if [ ! -z "$LOCAL_IP" ]; then
    echo -e "${YELLOW}[NETWORK]${NC} Tu IP local es: ${GREEN}$LOCAL_IP${NC}"
    echo -e "${BLUE}[ACCESS]${NC} Acceso local: ${GREEN}http://localhost:5000${NC}"
    echo -e "${BLUE}[ACCESS]${NC} Acceso desde red: ${GREEN}http://$LOCAL_IP:5000${NC}"
    echo -e "${BLUE}[ACCESS]${NC} Swagger UI: ${GREEN}http://$LOCAL_IP:5000/swagger${NC}"
else
    echo -e "${RED}[WARNING]${NC} No se pudo detectar la IP local automáticamente"
    echo -e "${BLUE}[ACCESS]${NC} Acceso local: ${GREEN}http://localhost:5000${NC}"
fi

echo ""
echo -e "${YELLOW}[MOBILE]${NC} Para acceder desde móvil/tablet:"
echo -e "${YELLOW}[MOBILE]${NC} 1. Conecta el dispositivo a la misma red WiFi"
echo -e "${YELLOW}[MOBILE]${NC} 2. Abre el navegador en el dispositivo"
if [ ! -z "$LOCAL_IP" ]; then
    echo -e "${YELLOW}[MOBILE]${NC} 3. Ve a: ${GREEN}http://$LOCAL_IP:5000${NC}"
else
    echo -e "${YELLOW}[MOBILE]${NC} 3. Ve a: ${GREEN}http://[TU_IP_LOCAL]:5000${NC}"
fi
echo ""

echo -e "${RED}[CMD]${NC} Para detener el servidor: Ctrl+C"
echo ""
echo -e "${GREEN}========================================${NC}"
echo ""

# Iniciar la aplicación
dotnet run --environment Development