# ? ACTUALIZACIÓN COMPLETADA: Soporte para Fechas de Vencimiento Personalizadas en Cuotas

## ?? Resumen de Cambios

Se ha actualizado el sistema para soportar **fechas de vencimiento personalizadas** en las cuotas personalizadas (customQuotas), además de los montos.

---

## ?? Cambios en la Estructura de Datos

### **Antes:**
```json
{
  "customQuotasJson": "[{\"QuotaNumber\": 1, \"Amount\": 1000000}, ...]"
}
```

### **Ahora:**
```json
{
  "customQuotasJson": "[{\"QuotaNumber\": 1, \"Amount\": 1000000, \"DueDate\": \"2024-01-15\"}, ...]"
}
```

**? Nota:** El campo `DueDate` es **opcional** para mantener compatibilidad con ventas antiguas.

---

## ?? Archivos Modificados

### 1. **Models/Sale.Model.cs**
**Cambio:** Agregado campo `DueDate` al modelo `CustomQuota`

```csharp
public class CustomQuota
{
    public int QuotaNumber { get; set; }
    public decimal Amount { get; set; }
    public DateTime? DueDate { get; set; } // ? NUEVO: Fecha de vencimiento personalizada (opcional)
}
```

**Compatibilidad:** El campo es nullable (`DateTime?`) para que ventas antiguas sin este campo sigan funcionando.

---

### 2. **Services/OverdueDetectionService.cs**
**Método actualizado:** `CalculateInstallmentsForSaleAsync`

**Cambios principales:**
- Carga cuotas personalizadas con sus fechas de vencimiento
- Usa `Dictionary<int, (decimal Amount, DateTime? DueDate)>` en lugar de solo `Amount`
- Calcula fechas automáticamente si no existen en el JSON (compatibilidad)

**Código clave:**
```csharp
// ? NUEVO: Cargar cuotas personalizadas con fechas
Dictionary<int, (decimal Amount, DateTime? DueDate)> customQuotaData = null;
if (sale.PaymentPlanType?.ToLower() == "custom" && !string.IsNullOrEmpty(sale.CustomQuotasJson))
{
    var customQuotas = JsonSerializer.Deserialize<List<CustomQuota>>(sale.CustomQuotasJson);
    if (customQuotas != null && customQuotas.Count > 0)
    {
        customQuotaData = customQuotas.ToDictionary(
            q => q.QuotaNumber,
  q => (q.Amount, q.DueDate)
        );
    }
}

// Usar fecha personalizada si existe, sino calcular
if (customData.DueDate.HasValue)
{
    dueDate = customData.DueDate.Value;
}
else
{
    // Compatibilidad: calcular fecha si no existe en JSON
    dueDate = sale.sale_date.AddMonths(i);
}
```

**Impacto:** 
- ? Detección precisa de mora usando fechas personalizadas
- ? Correos automáticos usan las fechas correctas
- ? Cálculo correcto de días de atraso

---

### 3. **Services/Payment.Services.cs**
**Métodos actualizados:** `CreatePayment` y `UpdatePayment`

**Cambios principales:**
- Carga estructura completa: `Dictionary<int, (decimal Amount, DateTime? DueDate)>`
- Usa valores personalizados al distribuir pagos

**Código clave:**
```csharp
// ? CORRECCIÓN: Cargar cuotas personalizadas con fechas
Dictionary<int, (decimal Amount, DateTime? DueDate)> customQuotaData = null;
if (sale.PaymentPlanType?.ToLower() == "custom" && !string.IsNullOrEmpty(sale.CustomQuotasJson))
{
    var customQuotas = JsonSerializer.Deserialize<List<CustomQuota>>(sale.CustomQuotasJson);
    if (customQuotas != null && customQuotas.Count > 0)
    {
        customQuotaData = customQuotas.ToDictionary(
     q => q.QuotaNumber,
      q => (q.Amount, q.DueDate)
        );
        totalQuotas = customQuotas.Count;
    }
}

// Usar valores personalizados
if (customQuotaData != null)
{
    foreach (var kvp in customQuotaData)
    {
      adjustedQuotaValues[kvp.Key] = kvp.Value.Amount;
    }
}
```

**Impacto:**
- ? Distribución correcta de pagos usando montos reales
- ? Ya no hay sobrantes incorrectos por usar promedios

---

## ?? Cómo Funciona Ahora

### **Escenario 1: Venta Nueva con Fechas Personalizadas**

**Frontend envía:**
```json
{
  "paymentPlanType": "custom",
  "customQuotasJson": "[
  {\"QuotaNumber\": 1, \"Amount\": 4000000, \"DueDate\": \"2024-01-15\"},
    {\"QuotaNumber\": 2, \"Amount\": 4000000, \"DueDate\": \"2024-02-20\"},
    {\"QuotaNumber\": 3, \"Amount\": 40000, \"DueDate\": \"2024-03-25\"}
  ]"
}
```

**Backend:**
- ? Usa `Amount` para calcular cuánto cubre cada pago
- ? Usa `DueDate` para determinar si está vencida
- ? Calcula días de atraso basado en `DueDate`

---

### **Escenario 2: Venta Antigua sin Fechas (Compatibilidad)**

**Base de datos tiene:**
```json
{
  "customQuotasJson": "[
    {\"QuotaNumber\": 1, \"Amount\": 4000000},
    {\"QuotaNumber\": 2, \"Amount\": 4000000}
  ]"
}
```

**Backend:**
- ? Lee `Amount` correctamente
- ? `DueDate` es `null`, calcula fecha automáticamente:
  - Cuota 1: `sale_date + 1 mes`
  - Cuota 2: `sale_date + 2 meses`
- ? Todo funciona como antes

---

## ?? Impacto en Módulos

### **? Módulo de Pagos (`Payment.Services.cs`)**
- Distribuye pagos usando valores reales de cuotas
- Ya no genera sobrantes incorrectos

### **? Módulo de Mora (`OverdueDetectionService.cs`)**
- Detecta cuotas vencidas usando fechas personalizadas
- Calcula días de atraso correctamente
- Envía correos con información precisa

### **? Módulo de Detalles (`MonthlyQuotaTracker`)**
- Muestra fechas de vencimiento reales
- Calcula estado correcto (Pendiente/Vencida/Pagada)
- Identifica mora con precisión

### **? Generación de PDFs**
- ?? **Pendiente:** Actualizar `buildPlanPagosHTML` en el frontend para mostrar fechas personalizadas en contratos

---

## ?? Casos de Prueba

### **Prueba 1: Crear venta con cuotas personalizadas (con fechas)**
```json
POST /api/Sale/CreateSale
{
  "paymentPlanType": "custom",
  "customQuotasJson": "[
    {\"QuotaNumber\": 1, \"Amount\": 1000000, \"DueDate\": \"2024-06-15\"},
    {\"QuotaNumber\": 2, \"Amount\": 2000000, \"DueDate\": \"2024-07-20\"}
  ]",
  // ... otros campos
}
```

**Resultado esperado:**
- ? Se crea la venta
- ? `quota_value` es el promedio ($1,500,000)
- ? Fechas de vencimiento son las especificadas

---

### **Prueba 2: Registrar pago**
```json
POST /api/Payment/CreatePayment
{
  "id_Sales": 1,
  "amount": 3000000,
  "payment_date": "2024-06-01"
}
```

**Resultado esperado:**
- ? Cuota 1 ($1,000,000): cubre $1,000,000 completa
- ? Cuota 2 ($2,000,000): cubre $2,000,000 completa
- ? Sin sobrantes

---

### **Prueba 3: Verificar mora**
```
GET /api/Dashboard/GetClientsWithOverdueInstallments
```

**Si hoy es 2024-07-25:**
- ? Cuota 1 (vence 2024-06-15): Vencida (40 días de atraso)
- ? Cuota 2 (vence 2024-07-20): Vencida (5 días de atraso)

---

## ?? Próximos Pasos (Recomendados)

### **1. Actualizar Frontend - Formulario de Ventas**
Agregar campos para ingresar fechas de vencimiento personalizadas:

```jsx
// En RegisterSale.jsx o similar
<Input
  type="date"
  label="Fecha de Vencimiento Cuota {i}"
  value={customQuota.dueDate}
  onChange={(e) => updateCustomQuota(i, 'dueDate', e.target.value)}
/>
```

### **2. Actualizar Generación de PDFs**
Modificar `buildPlanPagosHTML` para usar fechas del JSON:

```javascript
// En pdfExportService.jsx
if (customQuotas && customQuotas.length > 0) {
  const customQuota = customQuotas.find(q => q.quotaNumber === i || q.QuotaNumber === i)
  if (customQuota) {
  // ? Usar fecha personalizada si existe
    if (customQuota.dueDate || customQuota.DueDate) {
      dueDate = new Date(customQuota.dueDate || customQuota.DueDate)
    }
    currentQuotaValue = customQuota.amount || customQuota.Amount
  }
}
```

### **3. Migración de Datos Existentes (Opcional)**
Si hay ventas antiguas que necesitan fechas personalizadas:

```sql
-- Script para agregar fechas calculadas a ventas antiguas con customQuotas
UPDATE sales 
SET CustomQuotasJson = /* calcular JSON con fechas */
WHERE PaymentPlanType = 'custom' 
AND CustomQuotasJson NOT LIKE '%DueDate%';
```

---

## ?? Documentación para Desarrolladores

### **Formato del Campo `customQuotasJson`**

```typescript
interface CustomQuota {
  QuotaNumber: number;     // Número de cuota (1, 2, 3, ...)
  Amount: number;   // Monto de la cuota
  DueDate?: string;        // Fecha de vencimiento (opcional, formato: "YYYY-MM-DD")
}
```

### **Ejemplo Completo:**
```json
[
  {
    "QuotaNumber": 1,
    "Amount": 1000000,
    "DueDate": "2024-06-15"
  },
  {
    "QuotaNumber": 2,
    "Amount": 1500000,
    "DueDate": "2024-07-20"
  },
  {
    "QuotaNumber": 3,
    "Amount": 500000,
    "DueDate": "2024-08-15"
  }
]
```

---

## ? Verificación de Cambios

### **Compilación:**
```bash
dotnet build
# ? Success: 0 Error(s), 0 Warning(s)
```

### **Pruebas Unitarias (Recomendado):**
```csharp
[Fact]
public async Task CalculateInstallments_WithCustomDates_UsesCorrectDates()
{
    // Arrange: Crear venta con customQuotasJson con fechas
    // Act: Llamar CalculateInstallmentsForSaleAsync
    // Assert: Verificar que las fechas sean las personalizadas
}
```

---

## ?? Beneficios de Esta Actualización

1. ? **Mayor Flexibilidad:** Fechas de vencimiento adaptadas a cada cliente
2. ? **Precisión en Mora:** Cálculo exacto de días de atraso
3. ? **Compatibilidad:** Ventas antiguas siguen funcionando
4. ? **Distribución Correcta:** Pagos se aplican con montos reales
5. ? **Correos Precisos:** Notificaciones con datos exactos

---

## ?? Soporte

Si encuentras problemas:
1. Verifica que `customQuotasJson` tenga el formato correcto
2. Revisa los logs en la consola del backend
3. Confirma que las fechas estén en formato `YYYY-MM-DD`
4. Valida que el `PaymentPlanType` sea `"custom"`

---

**Fecha de actualización:** $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")
**Desarrollador:** Sistema M&M Softcom
**Versión:** 1.1.0 - Soporte de Fechas Personalizadas
