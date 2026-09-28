# Configuración de Rutas Backend - Referencia Técnica

## Estructura del Proyecto
```
c:\Proyecto\MyM_Softcom\
├── Backend/mym_softcom/     ← API REST (.NET/C#)
│   ├── Program.cs
│   ├── Controllers/
│   ├── mym_softcom.csproj
│   └── ... (base de datos, modelos, servicios)
│
└── Frontend/mym_softcom/    ← Next.js Frontend
    ├── src/
    ├── .env.local           ← Configuración del puerto
    ├── package.json
    └── ... (componentes, páginas)
```

---

## Configuración Actual

### Backend (API)
- **Ubicación:** `c:\Proyecto\MyM_Softcom\Backend\mym_softcom\`
- **Lenguaje:** C# / .NET
- **Puerto por defecto:** **5001** (configurado en `Program.cs`)
- **Escucha en:** `0.0.0.0:5001` (todas las interfaces de red)
- **CORS:** Permitido para todos los orígenes (desarrollo)

### Frontend (Cliente)
- **Ubicación:** `c:\Proyecto\MyM_Softcom\Frontend\mym_softcom\`
- **Framework:** Next.js 14
- **Puerto por defecto:** 3000

---

## Configuración del Acceso a Backend

### Archivo: `.env.local`
```env
# Puerto por defecto (usado si NEXT_PUBLIC_API_URL no está definida)
NEXT_PUBLIC_API_PORT=5001

# URL completa del API (opcional - tiene prioridad sobre NEXT_PUBLIC_API_PORT)
# Descomenta y modifica según tu entorno:

# Para desarrollo local:
# NEXT_PUBLIC_API_URL=http://localhost:5001/

# Para acceso en red local:
# NEXT_PUBLIC_API_URL=http://192.168.1.27:5001/

# Para producción:
# NEXT_PUBLIC_API_URL=https://api.tudominio.com/
```

### Archivo: `src/lib/axiosInstance.js`
```javascript
// Resolución automática de baseURL:
// 1. Si NEXT_PUBLIC_API_URL está definida → usar esa URL
// 2. Si no → construir URL con NEXT_PUBLIC_API_PORT (default 5000)
// 3. En cliente: usar {protocol}://{hostname}:{port}/
// 4. En servidor: usar http://localhost:{port}/
```

---

## Rutas de API Documentadas

### Endpoints Principales

| Módulo | Endpoint | Método | Archivo |
|--------|----------|--------|---------|
| **Pagos** | `/api/Payment/GetAllPayments` | GET | `pagos/page.jsx` |
| **Pagos** | `/api/Payment/CreatePayment` | POST | `pagos/formpagos.jsx` |
| **Pagos** | `/api/Payment/UpdatePayment/{id}` | PUT | `pagos/formpagos.jsx` |
| **Pagos** | `/api/Payment/DeletePayment/{id}` | DELETE | `pagos/page.jsx` |
| **Detalles** | `/api/Detail/GetDetailsBySaleId/{saleId}` | GET | `detalles/page.jsx` |
| **Ventas** | `/api/Sale/GetAllSales` | GET | `ventas/page.jsx` |
| **Ventas** | `/api/Sale/{id}/redistribute-quotas` | POST | `MonthlyQuotaTracker.jsx` ✅ |
| **Clientes** | `/api/Client/GetByDocument/{doc}` | GET | `clientes/formclient.jsx` |
| **Clientes** | `/api/Client/GetClientsWithSalesSummary` | GET | `clientes/page.jsx` |
| **Proyectos** | `/api/Project/GetAllProjects` | GET | `projectos/page.jsx` |
| **Lotes** | `/api/Lot/GetLotsByProject/{projectId}` | GET | `lotes/formlotes.jsx` |
| **Planes** | `/api/Plan/GetAllPlans` | GET | `planes/page.jsx` |
| **Planes** | `/api/Plan/UpdatePlan/{id}` | PUT | `planes/formplanes.jsx` |
| **Cesiones** | `/api/Cesion/GetAll` | GET | `cesiones/page.jsx` |
| **Cesiones** | `/api/Cesion/GetClientByDocument/{doc}` | GET | `cesiones/formcesion.jsx` |
| **Backup** | `/Backup/create` | POST | `useBackup.js` ✅ |
| **Backup** | `/Backup/list` | GET | `useBackup.js` ✅ |
| **Backup** | `/Backup/download/{file}` | GET | `useBackup.js` ✅ |
| **Backup** | `/Backup/delete/{file}` | DELETE | `useBackup.js` ✅ |
| **Backup** | `/Backup/restore` | POST | `useBackup.js` ✅ |
| **Backup** | `/Backup/upload` | POST | `useBackup.js` ✅ |

**✅ = Ya utiliza axiosInstance configurada**

---

## Cambios Realizados (Centralización de Rutas)

### ✅ 1. Reemplazado: `useBackup.js`
**Antes:**
```javascript
const API_BASE_URL = "http://192.168.1.27:5001/api"
const response = await fetch(`${API_BASE_URL}/Backup/create`, {...})
```

**Ahora:**
```javascript
import axiosInstance from "@/lib/axiosInstance"
const response = await axiosInstance.post("/Backup/create", backupData)
```

**Ventajas:**
- ✓ Usa configuración centralizada de `.env.local`
- ✓ Automáticamente respeta NEXT_PUBLIC_API_URL o NEXT_PUBLIC_API_PORT
- ✓ Manejo centralizado de errores y headers

### ✅ 2. Reemplazado: `MonthlyQuotaTracker.jsx`
**Antes:**
```javascript
const response = await fetch(`http://localhost:5216/api/Sale/${sale.id_Sales}/redistribute-quotas`, {
  method: "POST",
  body: JSON.stringify(requestData),
})
```

**Ahora:**
```javascript
import axiosInstance from "@/lib/axiosInstance"
const response = await axiosInstance.post(`/Sale/${sale.id_Sales}/redistribute-quotas`, requestData)
```

**Ventajas:**
- ✓ Puerto correcto (5001 en lugar de 5216)
- ✓ Configuración centralizada
- ✓ Manejo automático de Content-Type JSON

---

## Cómo Ejecutar en Diferentes Entornos

### Desarrollo Local (Mismo PC)

#### Terminal 1: Backend
```bash
cd c:\Proyecto\MyM_Softcom\Backend\mym_softcom
dotnet run
# Escuchará en: http://localhost:5001/
```

#### Terminal 2: Frontend
```bash
cd c:\Proyecto\MyM_Softcom\Frontend\mym_softcom
npm run dev
# Ejecutará en: http://localhost:3000/
```

#### Archivo `.env.local` en Frontend:
```env
NEXT_PUBLIC_API_PORT=5001
```

**Acceso:** http://localhost:3000/ → conecta a http://localhost:5001/ para API

---

### Red Local (Diferentes PCs)

#### En Backend (servidor)
```bash
cd c:\Proyecto\MyM_Softcom\Backend\mym_softcom
dotnet run
# Escuchará en: http://0.0.0.0:5001/ (todas las interfaces)
```

#### En Frontend (cliente)
Obtener IP del servidor: `ipconfig` → buscar "IPv4 Address"

#### Archivo `.env.local` en Frontend:
```env
NEXT_PUBLIC_API_URL=http://192.168.1.27:5001/
```

**Acceso:** http://localhost:3000/ → conecta a http://192.168.1.27:5001/ para API

---

### Producción

#### Backend
- Obtener certificado SSL
- Configurar HTTPS en Program.cs
- Abrir firewall en puerto 5001

#### Frontend
- Compilar: `npm run build`
- Desplegar en servidor (Vercel, Azure, etc.)

#### Archivo `.env.production`:
```env
NEXT_PUBLIC_API_URL=https://api.tudominio.com/
```

---

## Verificación de Conectividad

### Test 1: Backend está ejecutándose
```powershell
# Verificar puerto 5001 abierto
netstat -ano | findstr :5001

# O en PowerShell:
Test-NetConnection -ComputerName localhost -Port 5001
```

### Test 2: CORS configurado
```javascript
// En navegador, abrir DevTools y ejecutar:
fetch('http://localhost:5001/api/Project/GetAllProjects')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

### Test 3: axiosInstance funcionando
```javascript
// En navegador, abrir DevTools y ejecutar:
import axiosInstance from "@/lib/axiosInstance"
axiosInstance.get('/api/Project/GetAllProjects')
  .then(r => console.log(r.data))
  .catch(e => console.error(e))
```

---

## Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| **Conexión rechazada** | Backend no ejecutándose | `dotnet run` en Backend |
| **Puerto 5001 en uso** | Otra aplicación usa el puerto | Cambiar puerto en `Program.cs` o .env |
| **CORS error** | CORS no configurado | Verificar `Program.cs` - AllowAll policy |
| **API_BASE_URL hardcodeada** | Ruta antigua | Usar axiosInstance en lugar de fetch |
| **axios 404 en Backup** | Ruta incompleta | Usar `/Backup/...` (sin `/api/`) |

---

## Resumen de Archivos Modificados

| Archivo | Cambio | Beneficio |
|---------|--------|-----------|
| `.env.local` | ✅ CREADO | Configuración centralizada del puerto |
| `src/hooks/useBackup.js` | ✅ ACTUALIZADO | Usa axiosInstance en lugar de URL hardcodeada |
| `src/components/utils/MonthlyQuotaTracker.jsx` | ✅ ACTUALIZADO | Usa axiosInstance, puerto correcto (5001) |
| `src/lib/axiosInstance.js` | ℹ️ SIN CAMBIOS | Maneja resolución automática de URL base |

---

## Próximos Pasos Recomendados

1. ✅ Crear `.env.local` con `NEXT_PUBLIC_API_PORT=5001`
2. ✅ Ejecutar Backend: `dotnet run` en puerto 5001
3. ✅ Ejecutar Frontend: `npm run dev` en puerto 3000
4. ✅ Probar conectividad en http://localhost:3000/
5. ⏳ Si hay otros archivos con rutas hardcodeadas, actualizarlos para usar axiosInstance
