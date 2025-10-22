# MyM Softcom - Guía de Configuración para Acceso Público

Esta guía te explica cómo configurar tu sistema MyM Softcom para que sea accesible tanto desde tu red local como desde internet.

## ?? Tabla de Contenidos
- [Configuración del Firewall](#configuración-del-firewall)
- [Configuración del Router (Port Forwarding)](#configuración-del-router)
- [Acceso desde Internet](#acceso-desde-internet)
- [Seguridad](#seguridad)
- [Resolución de Problemas](#resolución-de-problemas)

## ??? Configuración del Firewall

### Paso 1: Abrir el Puerto en Windows Firewall

1. **Ejecuta el script automático** (Recomendado):
   ```cmd
   # Clic derecho en el archivo y selecciona "Ejecutar como administrador"
   configure-firewall.bat
   ```

2. **O hazlo manualmente**:
   - Presiona `Windows + R` y escribe `wf.msc`
   - Clic en "Reglas de entrada" ? "Nueva regla"
   - Selecciona "Puerto" ? Siguiente
   - TCP ? Puerto local específico: `5000` ? Siguiente
   - "Permitir la conexión" ? Siguiente
   - Marca TODAS las opciones (Dominio, Privado, Público) ? Siguiente
   - Nombre: `MyM Softcom - HTTP (5000)` ? Finalizar

### Verificar que el Puerto esté Abierto

```cmd
netsh advfirewall firewall show rule name="MyM Softcom - HTTP (5000) Entrada"
```

## ?? Configuración del Router (Port Forwarding)

Para acceder desde internet, necesitas configurar Port Forwarding en tu router.

### Paso 1: Obtener tu IP Local

1. Ejecuta el servidor:
   ```cmd
   start-network-server.bat
   ```

2. Busca en la consola tu IP local (ejemplo: `192.168.1.100`)

### Paso 2: Acceder al Router

1. Abre un navegador
2. Ve a la dirección de tu router (usualmente):
   - `http://192.168.1.1`
   - `http://192.168.0.1`
   - `http://10.0.0.1`

3. Ingresa usuario y contraseña del router
   - Predeterminados comunes:
     - admin / admin
     - admin / password
     - admin / 1234
   - (Revisa la etiqueta del router o el manual)

### Paso 3: Configurar Port Forwarding

Busca la sección de configuración llamada:
- "Port Forwarding"
- "Virtual Servers"
- "NAT"
- "Aplicaciones y Juegos"

Configura:
```
Nombre del Servicio: MyM Softcom
Puerto Externo: 5000
Puerto Interno: 5000
IP Interna: [TU_IP_LOCAL] (ejemplo: 192.168.1.100)
Protocolo: TCP
Estado: Habilitado
```

### Paso 4: Guardar y Reiniciar

1. Guarda los cambios
2. Reinicia el router si es necesario
3. Espera 2-3 minutos para que apliquen los cambios

## ?? Acceso desde Internet

### Obtener tu IP Pública

**Método 1: API del Sistema**
```bash
# Desde el servidor
curl http://localhost:5000/api/NetworkInfo/public-ip
```

**Método 2: Sitios Web**
- https://whatismyipaddress.com
- https://www.whatismyip.com
- https://ipinfo.io

### Acceder al Sistema

Una vez configurado el Port Forwarding:

```
http://[TU_IP_PUBLICA]:5000
```

Ejemplo:
```
http://203.45.67.89:5000
```

### IP Dinámica vs Estática

**Si tu IP pública cambia frecuentemente**, usa un servicio de DNS dinámico:

1. **No-IP** (https://www.noip.com)
   - Gratis para 1 hostname
   - Actualiza automáticamente tu IP

2. **DynDNS** (https://dyn.com)
   - Servicio premium más confiable

3. **Duck DNS** (https://www.duckdns.org)
   - Completamente gratuito

## ?? Seguridad

### ?? ADVERTENCIAS IMPORTANTES

Antes de exponer tu servidor a internet:

1. **Usa HTTPS** (no HTTP) en producción
2. **Implementa autenticación fuerte**
3. **Mantén el sistema actualizado**
4. **Usa contraseñas robustas**
5. **Habilita registro de auditoría**

### Implementar HTTPS

Para usar HTTPS necesitas un certificado SSL:

1. **Opción 1: Let's Encrypt (Gratis)**
   ```bash
   dotnet add package Let'sEncrypt.AspNetCore
   ```

2. **Opción 2: Cloudflare (Gratis)**
   - Registra tu dominio en Cloudflare
   - Activa SSL/TLS automático
   - Cloudflare manejará HTTPS por ti

### Rate Limiting

Agrega protección contra ataques:

```csharp
// En Program.cs
builder.Services.AddRateLimiter(options => {
    options.AddFixedWindowLimiter("api", opt => {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 60;
    });
});
```

### Autenticación Adicional

- Implementa autenticación de dos factores (2FA)
- Usa tokens de sesión seguros
- Implementa políticas de contraseñas fuertes

## ?? Resolución de Problemas

### No Puedo Acceder desde Internet

1. **Verifica el Firewall**
   ```cmd
   # Ejecuta como administrador
   configure-firewall.bat
   ```

2. **Verifica Port Forwarding**
   - Accede a tu router
   - Confirma que la regla esté activa
   - Verifica que la IP local sea correcta

3. **Prueba desde el Exterior**
   - Usa tu móvil con datos móviles (no WiFi)
   - Intenta acceder a: `http://[TU_IP_PUBLICA]:5000/api/NetworkInfo/ping`

4. **Verifica tu IP Pública**
   ```cmd
   curl http://localhost:5000/api/NetworkInfo/public-ip
   ```

### El Puerto está Cerrado

Usa herramientas online para verificar:
- https://www.yougetsignal.com/tools/open-ports/
- https://portchecker.co

Si el puerto está cerrado:
1. Verifica el Firewall de Windows
2. Verifica el Port Forwarding en el router
3. Algunos ISPs bloquean ciertos puertos
4. Contacta a tu proveedor de internet si el puerto sigue cerrado

### Error de CORS

Si ves errores de CORS en la consola:

1. El sistema está configurado en modo "AllowAll"
2. Para producción, especifica los orígenes en `Program.cs`:
   ```csharp
   .WithOrigins(
       "https://tudominio.com",
       "https://www.tudominio.com"
   )
   ```

### ISP Bloquea el Puerto

Algunos proveedores de internet bloquean puertos comunes:

**Solución 1: Usar otro puerto**
```csharp
// En Program.cs
serverOptions.ListenAnyIP(8080); // En lugar de 5000
```

**Solución 2: Usar VPN o Proxy**
- Configura un proxy reverso (Nginx, Apache)
- Usa servicios como ngrok o localtunnel para desarrollo

## ?? Monitoreo

### Endpoints de Diagnóstico

```bash
# Información completa de red
curl http://localhost:5000/api/NetworkInfo/info

# IP pública
curl http://localhost:5000/api/NetworkInfo/public-ip

# Prueba de conectividad
curl http://localhost:5000/api/NetworkInfo/ping

# Estado del servidor
curl http://localhost:5000/api/NetworkInfo/status
```

### Logs del Sistema

El servidor registra automáticamente:
- Todas las IPs detectadas al iniciar
- Conexiones entrantes
- Errores de red
- Intentos de acceso fallidos

## ?? Mejores Prácticas

### Para Desarrollo
- ? Usar HTTP con CORS permisivo
- ? Port Forwarding temporal
- ? IP dinámica está bien

### Para Producción
- ? HTTPS obligatorio
- ? CORS restrictivo (orígenes específicos)
- ? IP estática o DNS dinámico
- ? Certificado SSL válido
- ? Rate limiting
- ? Logging robusto
- ? Backup automático
- ? Monitoreo 24/7

## ?? Alternativas

Si tienes problemas con Port Forwarding:

1. **ngrok** (Desarrollo)
   ```bash
   ngrok http 5000
   ```

2. **localtunnel** (Desarrollo)
   ```bash
   lt --port 5000
   ```

3. **Cloudflare Tunnel** (Producción)
   - No requiere Port Forwarding
   - HTTPS automático
   - Gratis para uso básico

4. **VPS/Cloud**
   - AWS, Azure, DigitalOcean
   - IP pública dedicada
   - Mayor control y seguridad

## ?? Soporte

Si tienes problemas:

1. Revisa los logs de la consola
2. Usa los endpoints de diagnóstico
3. Verifica firewall y router
4. Prueba desde diferentes redes
5. Consulta con tu proveedor de internet si es necesario