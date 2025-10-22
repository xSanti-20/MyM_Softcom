# MyM Softcom - Configuración de Red Local

Este documento explica cómo configurar y usar el sistema MyM Softcom para acceso desde otros dispositivos en la misma red local (LAN).

## ?? Inicio Rápido

### Windows
```bash
# Ejecutar el script de inicio automático
start-network-server.bat
```

### Linux/Mac
```bash
# Hacer ejecutable (solo la primera vez)
chmod +x start-network-server.sh

# Ejecutar el script
./start-network-server.sh
```

### Manual
```bash
# Desde la carpeta del proyecto
dotnet run --environment Development
```

## ?? Acceso desde Dispositivos

### Desde el Servidor Local
- **URL Principal**: `http://localhost:5000`
- **Swagger UI**: `http://localhost:5000/swagger`
- **Info de Red**: `http://localhost:5000/api/NetworkInfo/info`

### Desde Otros Dispositivos en la Red
Una vez que el servidor esté ejecutándose, podrás acceder desde cualquier dispositivo en la misma red WiFi:

- **URL de Red**: `http://[IP_DEL_SERVIDOR]:5000`
- **Ejemplo**: `http://192.168.1.100:5000`

### ?? Desde Móvil o Tablet
1. **Conecta tu dispositivo** a la misma red WiFi que el servidor
2. **Abre el navegador** en tu móvil/tablet
3. **Navega a**: `http://[IP_DEL_SERVIDOR]:5000`

### ?? Desde Otra PC
1. **Asegúrate** de que esté en la misma red
2. **Abre cualquier navegador**
3. **Ve a**: `http://[IP_DEL_SERVIDOR]:5000`

## ?? Encontrar la IP del Servidor

### Automático
El sistema mostrará automáticamente la IP al iniciar el servidor. Busca en la consola:
```
?? Acceso desde red: http://192.168.1.100:5000
```

### Endpoints de API
- **GET** `/api/NetworkInfo/info` - Información completa de red
- **GET** `/api/NetworkInfo/ping` - Prueba de conectividad
- **GET** `/api/NetworkInfo/status` - Estado del servidor

### Manual (Windows)
```cmd
ipconfig
```
Busca "IPv4" en la sección de tu adaptador de red activo.

### Manual (Linux/Mac)
```bash
hostname -I
# o
ifconfig
```

## ??? Configuración de Seguridad

### CORS (Cross-Origin Resource Sharing)
El sistema está configurado para permitir acceso desde:
- `localhost` (cualquier puerto)
- Redes privadas: `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`

### Firewall
Si tienes problemas de conexión, asegúrate de que:
- **Windows**: El Firewall de Windows permita tráfico en el puerto 5000
- **Linux**: `ufw` o `iptables` permitan el puerto 5000
- **Router**: El puerto 5000 esté abierto para tráfico local

## ?? Configuración Avanzada

### Cambiar Puerto
Para usar un puerto diferente, modifica `Program.cs`:
```csharp
serverOptions.ListenAnyIP(8080); // Cambiar de 5000 a 8080
```

### HTTPS (Opcional)
Para habilitar HTTPS, descomenta en `Program.cs`:
```csharp
serverOptions.ListenAnyIP(5001, listenOptions =>
{
    listenOptions.UseHttps();
});
```

### Base de Datos
Asegúrate de que tu base de datos MySQL sea accesible desde la red si planeas usar el sistema desde múltiples dispositivos.

## ?? Resolución de Problemas

### No Puedo Conectar desde Otro Dispositivo

1. **Verifica la Red**
   ```bash
   # Desde el dispositivo cliente, hacer ping al servidor
   ping 192.168.1.100
   ```

2. **Verifica el Firewall**
   - Windows: `Windows + R` ? `firewall.cpl` ? Permitir puerto 5000
   - Linux: `sudo ufw allow 5000`

3. **Verifica que el Servidor Esté Ejecutándose**
   ```bash
   # Desde el servidor, verificar que esté escuchando
   netstat -an | grep 5000
   ```

### Error de CORS
Si ves errores de CORS en la consola del navegador:
1. Verifica que estés usando HTTP (no HTTPS)
2. Asegúrate de que la IP esté en el rango permitido
3. Intenta acceder desde `/api/NetworkInfo/ping` primero

### Error de Conexión a Base de Datos
Si MySQL no acepta conexiones remotas:
1. Modifica `my.cnf`: `bind-address = 0.0.0.0`
2. Otorga permisos: `GRANT ALL ON mym_softcom.* TO 'usuario'@'%';`

## ?? Monitoreo

### Endpoints de Estado
- **GET** `/api/NetworkInfo/status` - Estado general del servidor
- **GET** `/api/NetworkInfo/ping` - Prueba de conectividad
- **GET** `/swagger` - Documentación completa de la API

### Logs
El sistema registra automáticamente:
- IP del servidor al iniciar
- Errores de red
- Conexiones desde dispositivos remotos

## ?? Consejos

1. **Uso en Producción**: Para un entorno de producción, considera usar un proxy reverso como Nginx
2. **Rendimiento**: La red WiFi puede afectar la velocidad; usa Ethernet cuando sea posible
3. **Seguridad**: En redes corporativas, consulta con IT antes de abrir puertos
4. **Backup**: Asegúrate de hacer backup de tu base de datos regularmente

## ?? Soporte

Si tienes problemas:
1. Revisa los logs de la consola
2. Usa `/api/NetworkInfo/info` para verificar la configuración
3. Verifica que todos los dispositivos estén en la misma subred
4. Considera reiniciar el router si hay problemas de red