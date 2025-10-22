# MyM Softcom - Configuraci�n de Red Local

Este documento explica c�mo configurar y usar el sistema MyM Softcom para acceso desde otros dispositivos en la misma red local (LAN).

## ?? Inicio R�pido

### Windows
```bash
# Ejecutar el script de inicio autom�tico
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
Una vez que el servidor est� ejecut�ndose, podr�s acceder desde cualquier dispositivo en la misma red WiFi:

- **URL de Red**: `http://[IP_DEL_SERVIDOR]:5000`
- **Ejemplo**: `http://192.168.1.100:5000`

### ?? Desde M�vil o Tablet
1. **Conecta tu dispositivo** a la misma red WiFi que el servidor
2. **Abre el navegador** en tu m�vil/tablet
3. **Navega a**: `http://[IP_DEL_SERVIDOR]:5000`

### ?? Desde Otra PC
1. **Aseg�rate** de que est� en la misma red
2. **Abre cualquier navegador**
3. **Ve a**: `http://[IP_DEL_SERVIDOR]:5000`

## ?? Encontrar la IP del Servidor

### Autom�tico
El sistema mostrar� autom�ticamente la IP al iniciar el servidor. Busca en la consola:
```
?? Acceso desde red: http://192.168.1.100:5000
```

### Endpoints de API
- **GET** `/api/NetworkInfo/info` - Informaci�n completa de red
- **GET** `/api/NetworkInfo/ping` - Prueba de conectividad
- **GET** `/api/NetworkInfo/status` - Estado del servidor

### Manual (Windows)
```cmd
ipconfig
```
Busca "IPv4" en la secci�n de tu adaptador de red activo.

### Manual (Linux/Mac)
```bash
hostname -I
# o
ifconfig
```

## ??? Configuraci�n de Seguridad

### CORS (Cross-Origin Resource Sharing)
El sistema est� configurado para permitir acceso desde:
- `localhost` (cualquier puerto)
- Redes privadas: `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`

### Firewall
Si tienes problemas de conexi�n, aseg�rate de que:
- **Windows**: El Firewall de Windows permita tr�fico en el puerto 5000
- **Linux**: `ufw` o `iptables` permitan el puerto 5000
- **Router**: El puerto 5000 est� abierto para tr�fico local

## ?? Configuraci�n Avanzada

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
Aseg�rate de que tu base de datos MySQL sea accesible desde la red si planeas usar el sistema desde m�ltiples dispositivos.

## ?? Resoluci�n de Problemas

### No Puedo Conectar desde Otro Dispositivo

1. **Verifica la Red**
   ```bash
   # Desde el dispositivo cliente, hacer ping al servidor
   ping 192.168.1.100
   ```

2. **Verifica el Firewall**
   - Windows: `Windows + R` ? `firewall.cpl` ? Permitir puerto 5000
   - Linux: `sudo ufw allow 5000`

3. **Verifica que el Servidor Est� Ejecut�ndose**
   ```bash
   # Desde el servidor, verificar que est� escuchando
   netstat -an | grep 5000
   ```

### Error de CORS
Si ves errores de CORS en la consola del navegador:
1. Verifica que est�s usando HTTP (no HTTPS)
2. Aseg�rate de que la IP est� en el rango permitido
3. Intenta acceder desde `/api/NetworkInfo/ping` primero

### Error de Conexi�n a Base de Datos
Si MySQL no acepta conexiones remotas:
1. Modifica `my.cnf`: `bind-address = 0.0.0.0`
2. Otorga permisos: `GRANT ALL ON mym_softcom.* TO 'usuario'@'%';`

## ?? Monitoreo

### Endpoints de Estado
- **GET** `/api/NetworkInfo/status` - Estado general del servidor
- **GET** `/api/NetworkInfo/ping` - Prueba de conectividad
- **GET** `/swagger` - Documentaci�n completa de la API

### Logs
El sistema registra autom�ticamente:
- IP del servidor al iniciar
- Errores de red
- Conexiones desde dispositivos remotos

## ?? Consejos

1. **Uso en Producci�n**: Para un entorno de producci�n, considera usar un proxy reverso como Nginx
2. **Rendimiento**: La red WiFi puede afectar la velocidad; usa Ethernet cuando sea posible
3. **Seguridad**: En redes corporativas, consulta con IT antes de abrir puertos
4. **Backup**: Aseg�rate de hacer backup de tu base de datos regularmente

## ?? Soporte

Si tienes problemas:
1. Revisa los logs de la consola
2. Usa `/api/NetworkInfo/info` para verificar la configuraci�n
3. Verifica que todos los dispositivos est�n en la misma subred
4. Considera reiniciar el router si hay problemas de red