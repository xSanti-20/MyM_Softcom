# ?? INSTRUCCIONES PARA REACTIVAR EL SERVICIO DE CORREOS

## ?? Estado Actual: DESACTIVADO

El servicio de notificaciones de correos está temporalmente **DESACTIVADO** mientras se carga la información.

---

## ? Cómo Reactivar los Correos

### **Paso 1:** Editar el archivo `appsettings.json`

Ubicación: `Backend/mym_softcom/appsettings.json`

### **Paso 2:** Cambiar la configuración

Busca la sección `OverdueNotifications`:

```json
"OverdueNotifications": {
  "Enabled": false,  // ?? Cambiar esto
  "CheckIntervalHours": 24,
  "StartDelayMinutes": 1
}
```

**Cambiar a:**

```json
"OverdueNotifications": {
  "Enabled": true,   // ? ACTIVADO
  "CheckIntervalHours": 24,
  "StartDelayMinutes": 1
}
```

### **Paso 3:** Reiniciar el servidor backend

```bash
# Detener el servidor (Ctrl+C)
# Luego volver a iniciar:
dotnet run
```

### **Paso 4:** Verificar que está activo

En la consola del servidor deberías ver:

```
?? Iniciando Background Service de notificaciones de mora...
Background Service configurado: Habilitado=True, Intervalo=24h, Delay inicial=1min
? Ejecutando verificación automática de mora - [fecha]
```

---

## ?? Configuración del Servicio

### **Configuración Actual:**

- **Habilitado:** ? NO (temporalmente desactivado)
- **Frecuencia:** Cada 24 horas
- **Retraso inicial:** 1 minuto después de iniciar el servidor
- **Correo servidor:** constructoramym64@gmail.com

### **Para Cambiar la Frecuencia (opcional):**

Si quieres que los correos se envíen con diferente frecuencia, modifica:

```json
"OverdueNotifications": {
  "Enabled": true,
  "CheckIntervalHours": 24,  // ?? Cambiar (ej: 12 para cada 12 horas)
  "StartDelayMinutes": 1       // ?? Retraso inicial (en minutos)
}
```

**Ejemplos:**
- `CheckIntervalHours: 12` = Cada 12 horas
- `CheckIntervalHours: 48` = Cada 2 días
- `CheckIntervalHours: 168` = Cada semana (7 días × 24 horas)

---

## ?? Qué Hace el Servicio

El Background Service automático:

1. ? Se ejecuta cada 24 horas (configurable)
2. ? Busca clientes con cuotas vencidas
3. ? Envía correos de recordatorio con:
   - Detalle de cuotas vencidas por proyecto
   - Monto total en mora
   - Días de atraso
   - Instrucciones de pago
4. ? Registra logs de las notificaciones enviadas

---

## ?? Verificar Estado Actual

Para ver si el servicio está activo o no, revisa los logs al iniciar el servidor:

### **Si está DESACTIVADO:**
```
Background Service de notificaciones está DESHABILITADO
```

### **Si está ACTIVADO:**
```
?? Iniciando Background Service de notificaciones de mora...
Background Service configurado: Habilitado=True, Intervalo=24h
? Ejecutando verificación automática de mora...
```

---

## ?? Notas Importantes

- ?? **NO** borres la sección `OverdueNotifications` del `appsettings.json`
- ?? **Reinicia siempre el servidor** después de cambiar la configuración
- ? Los correos se enviarán **automáticamente** sin intervención manual
- ? Se envía solo a clientes con **cuotas realmente vencidas**

---

## ?? Soporte

Si tienes problemas:
1. Verifica que el servidor SMTP esté configurado correctamente
2. Revisa los logs en la consola del servidor
3. Confirma que los clientes tienen emails válidos registrados

---

**Fecha de creación:** $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")
**Responsable:** Sistema Automático M&M Softcom
