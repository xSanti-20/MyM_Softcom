# ?? GUÍA: Sistema Manual de Notificaciones de Mora

## ?? Objetivo

Enviar correos de recordatorio de pago cada **28 días** de forma **MANUAL** mediante endpoints, evitando el problema del reinicio del servidor que resetea el contador.

---

## ? Configuración Recomendada

### **appsettings.json**
```json
{
  "OverdueNotifications": {
    "Enabled": false,  // ? Desactivado para usar modo manual
    "CheckIntervalHours": 24,
    "StartDelayMinutes": 1
  }
}
```

**¿Por qué desactivado?**
- El servicio automático se resetea cada vez que se reinicia el servidor
- Pierdes el contador de días/horas
- Es mejor controlarlo manualmente

---

## ?? Endpoints Disponibles

### **1. Enviar Correos Manualmente (Endpoint Principal)**

```http
POST /api/OverdueNotification/process-all
Content-Type: application/json
```

**Descripción:**
- Busca todos los clientes con cuotas vencidas
- Envía correo a cada uno con el detalle de su mora
- Devuelve cuántos correos se enviaron

**Respuesta exitosa:**
```json
{
  "message": "Notificaciones procesadas exitosamente",
  "notificationsSent": 5,
  "timestamp": "15/01/2024 14:30:00",
  "durationMs": 2345.67
}
```

**Cuándo usarlo:**
- ? Cada 28 días (o cuando decidas)
- ? Cuando quieras enviar correos masivos de mora
- ? Después de actualizar la información de clientes

---

### **2. Ver Resumen de Mora (Sin Enviar Correos)**

```http
GET /api/OverdueNotification/summary
```

**Descripción:**
- Muestra cuántos clientes tienen mora
- Total de dinero en mora
- Desglose por días de atraso
- **NO envía correos**, solo consulta

**Respuesta:**
```json
{
  "totalClientsWithOverdue": 12,
  "totalOverdueAmount": 45000000,
  "totalOverdueQuotas": 28,
  "byDaysOverdue": [
  { "range": "1-30 días", "count": 10, "amount": 15000000 },
    { "range": "31-60 días", "count": 8, "amount": 20000000 },
    { "range": "61-90 días", "count": 5, "amount": 7000000 },
    { "range": "Más de 90 días", "count": 5, "amount": 3000000 }
  ],
  "timestamp": "15/01/2024 14:30:00",
  "message": "Hay 12 cliente(s) con mora total de $45,000,000"
}
```

**Cuándo usarlo:**
- ? Antes de enviar correos para ver cuántos se enviarán
- ? Para reportes de mora
- ? Para verificar la situación actual

---

### **3. Obtener Lista Detallada de Clientes en Mora**

```http
GET /api/OverdueNotification/clients-with-overdue
```

**Descripción:**
- Lista completa de clientes con mora
- Detalle de cada cuota vencida
- Información de contacto
- Proyectos y lotes asociados

**Respuesta:**
```json
[
  {
    "client": {
      "id_Clients": 123,
      "names": "Juan",
      "surnames": "Pérez",
  "document": 12345678,
      "email": "juan@example.com",
  "phone": "3001234567"
    },
    "totalOverdueAmount": 4000000,
    "totalOverdueQuotas": 2,
    "overdueInstallments": [
      {
        "quotaNumber": 3,
   "quotaValue": 2000000,
        "balance": 2000000,
        "dueDate": "2023-12-15",
    "daysOverdue": 31,
   "projectName": "Malibu",
"lotInfo": "A-25",
        "saleId": 456
      }
    ]
  }
]
```

**Cuándo usarlo:**
- ? Para generar reportes personalizados
- ? Para llamar manualmente a clientes específicos
- ? Para auditorías de mora

---

### **4. Enviar Correo a un Cliente Específico**

```http
POST /api/OverdueNotification/send-to-client/{clientId}
Content-Type: application/json
```

**Ejemplo:**
```http
POST /api/OverdueNotification/send-to-client/123
```

**Descripción:**
- Envía correo solo a un cliente específico
- Útil para reenvíos o pruebas

**Respuesta exitosa:**
```json
{
  "status": true,
  "message": "Correo enviado exitosamente a juan@example.com"
}
```

**Cuándo usarlo:**
- ? Para reenviar correo a un cliente que no lo recibió
- ? Para pruebas
- ? Para casos especiales

---

## ?? Opciones de Implementación

### **Opción A: Botón en el Frontend (Recomendado)**

Crear un botón en el dashboard de administración:

```jsx
// En tu componente de admin (ej: Dashboard.jsx)
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mail, AlertCircle, CheckCircle } from 'lucide-react'
import axiosInstance from '@/lib/axiosInstance'

function OverdueEmailsButton() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // 1. Ver resumen antes de enviar
  const handleCheckSummary = async () => {
    setLoading(true)
    try {
      const response = await axiosInstance.get('/api/OverdueNotification/summary')
      setSummary(response.data)
      setShowConfirm(true)
    } catch (error) {
    alert('? Error al obtener resumen: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 2. Enviar correos después de confirmar
  const handleSendEmails = async () => {
    setLoading(true)
    try {
    const response = await axiosInstance.post('/api/OverdueNotification/process-all')
      alert(`? Se enviaron ${response.data.notificationsSent} correos exitosamente en ${response.data.durationMs}ms`)
      setShowConfirm(false)
      setSummary(null)
    } catch (error) {
 alert('? Error al enviar correos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {!showConfirm ? (
        <Button 
       onClick={handleCheckSummary} 
 disabled={loading}
    className="gap-2"
        >
   <Mail className="h-4 w-4" />
       {loading ? 'Verificando...' : 'Ver Clientes en Mora'}
        </Button>
      ) : (
  <div className="border rounded-lg p-4 space-y-4">
  <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
        <div>
              <h3 className="font-semibold">Resumen de Mora</h3>
        <p className="text-sm text-gray-600">{summary?.message}</p>
       <ul className="mt-2 space-y-1 text-sm">
        <li>?? Se enviarán {summary?.totalClientsWithOverdue} correos</li>
          <li>?? Mora total: ${summary?.totalOverdueAmount?.toLocaleString('es-CO')}</li>
       <li>?? Cuotas vencidas: {summary?.totalOverdueQuotas}</li>
     </ul>
            </div>
       </div>
      
     <div className="flex gap-2">
            <Button 
  onClick={handleSendEmails} 
         disabled={loading}
       className="gap-2"
            >
  <CheckCircle className="h-4 w-4" />
   {loading ? 'Enviando...' : 'Confirmar y Enviar'}
   </Button>
        <Button 
     onClick={() => setShowConfirm(false)} 
   variant="outline"
          >
     Cancelar
    </Button>
</div>
   </div>
    )}
    </div>
  )
}

export default OverdueEmailsButton
```

**Ubicación sugerida:**
- Dashboard de administración
- Sección de "Gestión de Mora"
- Panel de "Notificaciones"

---

### **Opción B: Desde Postman/Insomnia**

1. Abre Postman
2. Crea nueva petición POST
3. URL: `http://localhost:5000/api/OverdueNotification/process-all`
4. Click en "Send"
5. Verifica la respuesta

**Ventajas:**
- ? Rápido para pruebas
- ? No requiere código frontend

**Desventajas:**
- ? Hay que recordar hacerlo cada 28 días
- ? No hay interfaz visual

---

### **Opción C: Script de PowerShell (Windows)**

Crear un archivo `EnviarCorreosMora.ps1`:

```powershell
# EnviarCorreosMora.ps1
$url = "http://localhost:5000/api/OverdueNotification/process-all"

Write-Host "?? Enviando correos de mora..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json"
    
    Write-Host "? Correos enviados exitosamente!" -ForegroundColor Green
    Write-Host "   ?? Total enviados: $($response.notificationsSent)" -ForegroundColor Cyan
    Write-Host "   ??  Tiempo: $($response.durationMs)ms" -ForegroundColor Cyan
    Write-Host "   ?? Fecha: $($response.timestamp)" -ForegroundColor Cyan
}
catch {
    Write-Host "? Error al enviar correos: $_" -ForegroundColor Red
}

pause
```

**Uso:**
1. Doble click en el archivo `.ps1`
2. O ejecutar: `powershell -File EnviarCorreosMora.ps1`

---

### **Opción D: Tarea Programada de Windows (Automatización)**

Si quieres que se ejecute automáticamente cada 28 días sin depender del servidor:

1. Abre **Programador de tareas** (Task Scheduler)
2. Click en "Crear tarea básica"
3. Nombre: "Enviar Correos de Mora M&M"
4. Desencadenador: "Mensualmente" ? Cada 28 días
5. Acción: "Iniciar un programa"
6. Programa: `powershell.exe`
7. Argumentos: `-File "C:\Proyecto\MyM_Softcom\EnviarCorreosMora.ps1"`

**Ventajas:**
- ? Totalmente automático
- ? No depende del reinicio del servidor
- ? Se ejecuta incluso si el servidor está apagado (puedes configurarlo para encenderlo)

---

## ?? Recomendación de Uso: Cada 28 Días

### **Calendario Sugerido:**

| Mes | Fecha Sugerida | Acción |
|-----|----------------|--------|
| Enero | 28 de enero | Enviar correos |
| Febrero | 25 de febrero (28 días después) | Enviar correos |
| Marzo | 25 de marzo | Enviar correos |
| Abril | 22 de abril | Enviar correos |
| Mayo | 20 de mayo | Enviar correos |
| Junio | 17 de junio | Enviar correos |
| ... | ... | ... |

**Tip:** Crear recordatorio en calendario personal.

---

## ?? Flujo Recomendado

### **Antes de Enviar (Cada 28 días):**

1. **Verificar resumen de mora:**
```bash
GET /api/OverdueNotification/summary
```

2. **Revisar lista detallada (opcional):**
```bash
GET /api/OverdueNotification/clients-with-overdue
```

3. **Confirmar que todo esté correcto:**
   - ? Clientes tienen emails válidos
   - ? Montos de mora son correctos
   - ? No hay errores en el sistema

### **Enviar Correos:**

4. **Ejecutar envío masivo:**
```bash
POST /api/OverdueNotification/process-all
```

5. **Verificar resultado:**
   - ? Ver cuántos correos se enviaron
   - ? Revisar logs del servidor para errores
   - ? Confirmar que llegaron (revisar con algunos clientes)

---

## ?? Monitoreo y Logs

### **Ver logs del servidor:**

Al ejecutar el endpoint, verás en la consola:

```
?? Iniciando envío manual de notificaciones de mora - 15/01/2024 14:30:00
[OverdueNotificationService] Processing overdue notifications...
[OverdueNotificationService] Found 5 clients with overdue installments
[EmailNotificationService] Enviando email desde constructoramym64@gmail.com hacia cliente@example.com
[EmailNotificationService] Email enviado exitosamente a cliente@example.com
? Envío manual completado en 2345.67ms. Notificaciones enviadas: 5
```

**Qué verificar:**
- ? "Email enviado exitosamente" para cada cliente
- ? Si aparecen errores, revisar configuración SMTP
- ? Si sale "0 clients with overdue", no hay clientes en mora

---

## ?? Configuración SMTP (Recordatorio)

En `appsettings.json`:

```json
{
  "ConfigServerEmail": {
    "HostName": "smtp.gmail.com",
  "PortHost": 587,
    "Email": "constructoramym64@gmail.com",
    "Password": "wzoakewjdhhegnnm"  // App Password de Gmail
  }
}
```

**Verificar:**
- ? Email de origen es válido
- ? Password de aplicación es correcto (no la contraseña normal)
- ? Cuenta tiene "Acceso de apps menos seguras" habilitado

---

## ?? Solución de Problemas

### **Problema: No se envían correos**

**Verificar:**
```bash
# 1. ¿Hay clientes en mora?
GET /api/OverdueNotification/summary

# 2. ¿Los clientes tienen email?
GET /api/OverdueNotification/clients-with-overdue

# 3. ¿La configuración SMTP es correcta?
# Revisar logs del servidor

# 4. ¿El servidor tiene acceso a internet?
# Hacer ping a smtp.gmail.com
```

### **Problema: Correos van a spam**

**Soluciones:**
- Verificar que el dominio del remitente sea válido
- Agregar registros SPF/DKIM en el dominio
- Pedir a los clientes agregar el email a contactos

### **Problema: Error de autenticación SMTP**

**Soluciones:**
- Generar nueva "Contraseña de aplicación" en Gmail
- Verificar que la cuenta no tenga verificación en 2 pasos bloqueando
- Revisar que el email y contraseña sean correctos

---

## ?? Checklist Mensual

Cada 28 días, seguir estos pasos:

- [ ] Abrir Postman/Frontend
- [ ] Ejecutar `GET /summary` para ver resumen
- [ ] Verificar que los montos sean correctos
- [ ] Ejecutar `POST /process-all` para enviar correos
- [ ] Verificar respuesta: `notificationsSent > 0`
- [ ] Revisar logs del servidor
- [ ] Opcional: Confirmar con 1-2 clientes que recibieron el correo
- [ ] Anotar fecha de envío en calendario para próxima ejecución (+28 días)

---

## ?? Resumen Rápido

**¿Qué usar?**
- ?? **Enviar correos:** `POST /api/OverdueNotification/process-all`
- ?? **Ver resumen:** `GET /api/OverdueNotification/summary`
- ?? **Ver detalles:** `GET /api/OverdueNotification/clients-with-overdue`

**¿Cuándo?**
- ? Cada 28 días manualmente
- ? O cuando decidas enviar recordatorios

**¿Cómo?**
- ??? Botón en frontend (más cómodo)
- ?? Postman (más rápido)
- ?? Tarea programada (automático)

---

**Fecha de creación:** $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")
**Sistema:** M&M Softcom - Gestión de Mora
**Versión:** 1.0.0
