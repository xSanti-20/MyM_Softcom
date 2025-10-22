# MyM Softcom - Gu�a de Configuraci�n para Acceso P�blico

Esta gu�a te explica c�mo configurar tu sistema MyM Softcom para que sea accesible tanto desde tu red local como desde internet.

## ?? Tabla de Contenidos
- [Configuraci�n del Firewall](#configuraci�n-del-firewall)
- [Configuraci�n del Router (Port Forwarding)](#configuraci�n-del-router)
- [Acceso desde Internet](#acceso-desde-internet)
- [Seguridad](#seguridad)
- [Resoluci�n de Problemas](#resoluci�n-de-problemas)

## ??? Configuraci�n del Firewall

### Paso 1: Abrir el Puerto en Windows Firewall

1. **Ejecuta el script autom�tico** (Recomendado):
   ```cmd
   # Clic derecho en el archivo y selecciona "Ejecutar como administrador"
   configure-firewall.bat
   ```

2. **O hazlo manualmente**:
   - Presiona `Windows + R` y escribe `wf.msc`
   - Clic en "Reglas de entrada" ? "Nueva regla"
   - Selecciona "Puerto" ? Siguiente
   - TCP ? Puerto local espec�fico: `5000` ? Siguiente
   - "Permitir la conexi�n" ? Siguiente
   - Marca TODAS las opciones (Dominio, Privado, P�blico) ? Siguiente
   - Nombre: `MyM Softcom - HTTP (5000)` ? Finalizar

### Verificar que el Puerto est� Abierto

```cmd
netsh advfirewall firewall show rule name="MyM Softcom - HTTP (5000) Entrada"
```

## ?? Configuraci�n del Router (Port Forwarding)

Para acceder desde internet, necesitas configurar Port Forwarding en tu router.

### Paso 1: Obtener tu IP Local

1. Ejecuta el servidor:
   ```cmd
   start-network-server.bat
   ```

2. Busca en la consola tu IP local (ejemplo: `192.168.1.100`)

### Paso 2: Acceder al Router

1. Abre un navegador
2. Ve a la direcci�n de tu router (usualmente):
   - `http://192.168.1.1`
   - `http://192.168.0.1`
   - `http://10.0.0.1`

3. Ingresa usuario y contrase�a del router
   - Predeterminados comunes:
     - admin / admin
     - admin / password
     - admin / 1234
   - (Revisa la etiqueta del router o el manual)

### Paso 3: Configurar Port Forwarding

Busca la secci�n de configuraci�n llamada:
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

### Obtener tu IP P�blica

**M�todo 1: API del Sistema**
```bash
# Desde el servidor
curl http://localhost:5000/api/NetworkInfo/public-ip
```

**M�todo 2: Sitios Web**
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

### IP Din�mica vs Est�tica

**Si tu IP p�blica cambia frecuentemente**, usa un servicio de DNS din�mico:

1. **No-IP** (https://www.noip.com)
   - Gratis para 1 hostname
   - Actualiza autom�ticamente tu IP

2. **DynDNS** (https://dyn.com)
   - Servicio premium m�s confiable

3. **Duck DNS** (https://www.duckdns.org)
   - Completamente gratuito

## ?? Seguridad

### ?? ADVERTENCIAS IMPORTANTES

Antes de exponer tu servidor a internet:

1. **Usa HTTPS** (no HTTP) en producci�n
2. **Implementa autenticaci�n fuerte**
3. **Mant�n el sistema actualizado**
4. **Usa contrase�as robustas**
5. **Habilita registro de auditor�a**

### Implementar HTTPS

Para usar HTTPS necesitas un certificado SSL:

1. **Opci�n 1: Let's Encrypt (Gratis)**
   ```bash
   dotnet add package Let'sEncrypt.AspNetCore
   ```

2. **Opci�n 2: Cloudflare (Gratis)**
   - Registra tu dominio en Cloudflare
   - Activa SSL/TLS autom�tico
   - Cloudflare manejar� HTTPS por ti

### Rate Limiting

Agrega protecci�n contra ataques:

```csharp
// En Program.cs
builder.Services.AddRateLimiter(options => {
    options.AddFixedWindowLimiter("api", opt => {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 60;
    });
});
```

### Autenticaci�n Adicional

- Implementa autenticaci�n de dos factores (2FA)
- Usa tokens de sesi�n seguros
- Implementa pol�ticas de contrase�as fuertes

## ?? Resoluci�n de Problemas

### No Puedo Acceder desde Internet

1. **Verifica el Firewall**
   ```cmd
   # Ejecuta como administrador
   configure-firewall.bat
   ```

2. **Verifica Port Forwarding**
   - Accede a tu router
   - Confirma que la regla est� activa
   - Verifica que la IP local sea correcta

3. **Prueba desde el Exterior**
   - Usa tu m�vil con datos m�viles (no WiFi)
   - Intenta acceder a: `http://[TU_IP_PUBLICA]:5000/api/NetworkInfo/ping`

4. **Verifica tu IP P�blica**
   ```cmd
   curl http://localhost:5000/api/NetworkInfo/public-ip
   ```

### El Puerto est� Cerrado

Usa herramientas online para verificar:
- https://www.yougetsignal.com/tools/open-ports/
- https://portchecker.co

Si el puerto est� cerrado:
1. Verifica el Firewall de Windows
2. Verifica el Port Forwarding en el router
3. Algunos ISPs bloquean ciertos puertos
4. Contacta a tu proveedor de internet si el puerto sigue cerrado

### Error de CORS

Si ves errores de CORS en la consola:

1. El sistema est� configurado en modo "AllowAll"
2. Para producci�n, especifica los or�genes en `Program.cs`:
   ```csharp
   .WithOrigins(
       "https://tudominio.com",
       "https://www.tudominio.com"
   )
   ```

### ISP Bloquea el Puerto

Algunos proveedores de internet bloquean puertos comunes:

**Soluci�n 1: Usar otro puerto**
```csharp
// En Program.cs
serverOptions.ListenAnyIP(8080); // En lugar de 5000
```

**Soluci�n 2: Usar VPN o Proxy**
- Configura un proxy reverso (Nginx, Apache)
- Usa servicios como ngrok o localtunnel para desarrollo

## ?? Monitoreo

### Endpoints de Diagn�stico

```bash
# Informaci�n completa de red
curl http://localhost:5000/api/NetworkInfo/info

# IP p�blica
curl http://localhost:5000/api/NetworkInfo/public-ip

# Prueba de conectividad
curl http://localhost:5000/api/NetworkInfo/ping

# Estado del servidor
curl http://localhost:5000/api/NetworkInfo/status
```

### Logs del Sistema

El servidor registra autom�ticamente:
- Todas las IPs detectadas al iniciar
- Conexiones entrantes
- Errores de red
- Intentos de acceso fallidos

## ?? Mejores Pr�cticas

### Para Desarrollo
- ? Usar HTTP con CORS permisivo
- ? Port Forwarding temporal
- ? IP din�mica est� bien

### Para Producci�n
- ? HTTPS obligatorio
- ? CORS restrictivo (or�genes espec�ficos)
- ? IP est�tica o DNS din�mico
- ? Certificado SSL v�lido
- ? Rate limiting
- ? Logging robusto
- ? Backup autom�tico
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

3. **Cloudflare Tunnel** (Producci�n)
   - No requiere Port Forwarding
   - HTTPS autom�tico
   - Gratis para uso b�sico

4. **VPS/Cloud**
   - AWS, Azure, DigitalOcean
   - IP p�blica dedicada
   - Mayor control y seguridad

## ?? Soporte

Si tienes problemas:

1. Revisa los logs de la consola
2. Usa los endpoints de diagn�stico
3. Verifica firewall y router
4. Prueba desde diferentes redes
5. Consulta con tu proveedor de internet si es necesario