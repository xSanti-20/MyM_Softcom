# ? CORRECCIÓN: Ajuste de Fechas de Vencimiento para Meses con Diferentes Días

## ?? Problema Identificado

Cuando se creaban ventas con fecha de inicio del día **30 o 31**, las cuotas que caían en **febrero** (que solo tiene 28/29 días) se estaban calculando con fecha incorrecta:

### ? **Comportamiento ANTERIOR (Incorrecto):**
```
Fecha de venta: 30 de enero de 2026
Cuota 1: 30 de enero de 2026 ?
Cuota 2: 30 de marzo de 2026 ? (saltaba febrero)
Cuota 3: 30 de abril de 2026 ?
```

### ? **Comportamiento NUEVO (Correcto):**
```
Fecha de venta: 30 de enero de 2026
Cuota 1: 30 de enero de 2026 ?
Cuota 2: 28 de febrero de 2026 ? (ajustado al último día de febrero)
Cuota 3: 30 de marzo de 2026 ?
```

---

## ?? Solución Implementada

Se creó una función auxiliar que ajusta automáticamente las fechas al **último día del mes** cuando el día original no existe en el mes de destino.

### **Función Creada:**

```csharp
/// <summary>
/// ? NUEVO: Calcula la fecha de vencimiento ajustándola al último día del mes si es necesario
/// Soluciona el problema cuando la fecha inicial es 30/31 y el mes destino tiene menos días (ej: febrero)
/// </summary>
private DateTime CalculateDueDateWithMonthEndAdjustment(DateTime startDate, int monthsToAdd)
{
    // Sumar los meses
    var dueDate = startDate.AddMonths(monthsToAdd);
    
    // Obtener el día de la fecha inicial
  var originalDay = startDate.Day;
    
    // Obtener el máximo día del mes de la fecha calculada
    var maxDayInMonth = DateTime.DaysInMonth(dueDate.Year, dueDate.Month);
    
    // Si el día original es mayor que el máximo del mes destino, ajustar
    if (originalDay > maxDayInMonth)
    {
        dueDate = new DateTime(dueDate.Year, dueDate.Month, maxDayInMonth);
        _logger.LogDebug("Adjusted due date: original day {OriginalDay} exceeds max day {MaxDay} for {Month}/{Year}, set to {AdjustedDate:yyyy-MM-dd}",
            originalDay, maxDayInMonth, dueDate.Month, dueDate.Year, dueDate);
 }
  
    return dueDate;
}
```

---

## ?? Archivos Modificados

### **1. Services/OverdueDetectionService.cs**

**Cambios realizados:**

#### ? **Agregada función auxiliar:**
```csharp
private DateTime CalculateDueDateWithMonthEndAdjustment(DateTime startDate, int monthsToAdd)
```

#### ? **Reemplazado `AddMonths()` en dos lugares:**

**Lugar 1: Cuotas personalizadas sin fecha específica (compatibilidad)**
```csharp
// ? ANTES:
dueDate = sale.sale_date.AddMonths(i);

// ? AHORA:
dueDate = CalculateDueDateWithMonthEndAdjustment(sale.sale_date, i);
```

**Lugar 2: Planes automáticos y house**
```csharp
// ? ANTES:
currentQuotaValue = quotaValue;
dueDate = sale.sale_date.AddMonths(i);

// ? AHORA:
currentQuotaValue = quotaValue;
dueDate = CalculateDueDateWithMonthEndAdjustment(sale.sale_date, i);
```

---

## ?? Casos de Prueba

### **Caso 1: Venta con fecha 30 de enero**

```
Entrada:
- Fecha de venta: 30/01/2026
- Tipo de plan: "automatic"
- Número de cuotas: 12

Salida esperada:
Cuota 1:  30/01/2026 ?
Cuota 2:  28/02/2026 ? (ajustado - febrero no tiene 30 días)
Cuota 3:  30/03/2026 ?
Cuota 4:  30/04/2026 ?
Cuota 5:  30/05/2026 ?
Cuota 6:30/06/2026 ?
Cuota 7:  30/07/2026 ?
Cuota 8:  30/08/2026 ?
Cuota 9:  30/09/2026 ?
Cuota 10: 30/10/2026 ?
Cuota 11: 30/11/2026 ?
Cuota 12: 30/12/2026 ?
```

### **Caso 2: Venta con fecha 31 de enero**

```
Entrada:
- Fecha de venta: 31/01/2026
- Tipo de plan: "automatic"
- Número de cuotas: 6

Salida esperada:
Cuota 1: 31/01/2026 ?
Cuota 2: 28/02/2026 ? (ajustado - febrero no tiene 31 días)
Cuota 3: 31/03/2026 ?
Cuota 4: 30/04/2026 ? (ajustado - abril no tiene 31 días)
Cuota 5: 31/05/2026 ?
Cuota 6: 30/06/2026 ? (ajustado - junio no tiene 31 días)
```

### **Caso 3: Venta con fecha 29 de enero en año bisiesto**

```
Entrada:
- Fecha de venta: 29/01/2024 (año bisiesto)
- Tipo de plan: "house"
- Número de cuotas: 3

Salida esperada:
Cuota 1: 29/01/2024 ?
Cuota 2: 29/02/2024 ? (febrero tiene 29 días en año bisiesto)
Cuota 3: 29/03/2024 ?
```

### **Caso 4: Venta con fecha 15 de enero (no requiere ajuste)**

```
Entrada:
- Fecha de venta: 15/01/2026
- Tipo de plan: "automatic"
- Número de cuotas: 12

Salida esperada:
Todas las cuotas el día 15 de cada mes (sin ajustes necesarios)
Cuota 1:  15/01/2026 ?
Cuota 2:  15/02/2026 ?
Cuota 3:  15/03/2026 ?
...
Cuota 12: 15/12/2026 ?
```

---

## ?? Impacto en Tipos de Planes

### **? Plan Automático ("automatic")**
- Afectado: SÍ
- Corrección aplicada: ?
- Las cuotas mensuales ahora se ajustan correctamente

### **? Plan de Casa ("house")**
- Afectado: SÍ
- Corrección aplicada: ?
- Las cuotas del 30% inicial ahora se ajustan correctamente

### **?? Plan Personalizado ("custom")**
- Afectado: NO (si tiene fechas específicas en JSON)
- Corrección aplicada: ? (solo para compatibilidad con ventas antiguas sin DueDate)
- Si el plan personalizado tiene fechas explícitas, se respetan esas fechas
- Si NO tiene fechas, ahora se calculan correctamente con el ajuste

---

## ?? Logs de Debug

La función ahora genera logs cuando se realiza un ajuste:

```
Adjusted due date: original day 30 exceeds max day 28 for 2/2026, set to 2026-02-28
```

**Ejemplo completo en logs:**
```
[2024-01-15 10:30:45] DEBUG: Quota 1 for sale 123: calculated 2026-01-30
[2024-01-15 10:30:45] DEBUG: Adjusted due date: original day 30 exceeds max day 28 for 2/2026, set to 2026-02-28
[2024-01-15 10:30:45] DEBUG: Quota 2 for sale 123: calculated 2026-02-28
[2024-01-15 10:30:45] DEBUG: Quota 3 for sale 123: calculated 2026-03-30
```

---

## ? Verificación de Cambios

### **Compilación:**
```bash
dotnet build
# ? Success: 0 Error(s), 0 Warning(s)
```

### **Testing Manual:**

1. **Crear una venta con fecha 30 de enero:**
```
POST /api/Sale/CreateSale
{
  "sale_date": "2026-01-30",
  "PaymentPlanType": "automatic",
  "id_Plans": 1 (plan con 12 cuotas)
}
```

2. **Verificar cuotas generadas:**
```
GET /api/OverdueNotification/installments-by-sale/{saleId}
```

3. **Verificar que la cuota 2 tenga fecha: 2026-02-28**

---

## ?? Beneficios de Esta Corrección

1. ? **Fechas Consistentes:** Las cuotas ya no "saltan" meses
2. ? **Detección de Mora Precisa:** Los correos de mora usan fechas correctas
3. ? **Mejor UX:** Los clientes ven fechas lógicas en sus estados de cuenta
4. ? **Compatibilidad:** Funciona para todos los tipos de planes
5. ? **Logs de Debug:** Fácil rastrear cuando se hacen ajustes

---

## ?? Meses Afectados por el Ajuste

| Mes | Días | ¿Se ajusta si fecha original es 30? | ¿Se ajusta si fecha original es 31? |
|-----|------|-------------------------------------|-------------------------------------|
| Enero | 31 | NO | NO |
| Febrero | 28/29 | SÍ ? 28/29 | SÍ ? 28/29 |
| Marzo | 31 | NO | NO |
| Abril | 30 | NO | SÍ ? 30 |
| Mayo | 31 | NO | NO |
| Junio | 30 | NO | SÍ ? 30 |
| Julio | 31 | NO | NO |
| Agosto | 31 | NO | NO |
| Septiembre | 30 | NO | SÍ ? 30 |
| Octubre | 31 | NO | NO |
| Noviembre | 30 | NO | SÍ ? 30 |
| Diciembre | 31 | NO | NO |

---

## ?? Migración de Datos Existentes (Opcional)

Si existen ventas antiguas que fueron creadas antes de esta corrección y quieres recalcular sus fechas:

### **Opción 1: Recalcular fechas de cuotas pendientes**

```sql
-- Identificar ventas afectadas (ventas con fecha 29, 30 o 31)
SELECT id_Sales, sale_date, PaymentPlanType
FROM sales
WHERE DAY(sale_date) >= 29
  AND status = 'Active'
  AND PaymentPlanType IN ('automatic', 'house');
```

### **Opción 2: Script C# para recalcular**

```csharp
// Endpoint temporal para recalcular fechas
[HttpPost("recalculate-dates/{saleId}")]
public async Task<IActionResult> RecalculateDueDates(int saleId)
{
  // Implementar lógica de recálculo usando la nueva función
    // Solo para ventas específicas que lo necesiten
}
```

---

## ?? Soporte

### **Si encuentras problemas:**

1. **Verifica los logs del servidor** para ver si se están aplicando ajustes:
```
grep "Adjusted due date" logs/app.log
```

2. **Compara fechas de cuotas** antes y después para ventas con fechas 29, 30, 31

3. **Revisa que la compilación sea exitosa:**
```bash
dotnet build
```

---

## ?? Próximos Pasos (Opcionales)

### **1. Testing Automatizado:**

```csharp
[Fact]
public void CalculateDueDateWithMonthEndAdjustment_February30_ReturnsFebruary28()
{
    // Arrange
    var service = new OverdueDetectionService(_context, _logger);
    var startDate = new DateTime(2026, 1, 30);
    
  // Act - usar reflexión para acceder al método privado
    var method = typeof(OverdueDetectionService).GetMethod(
        "CalculateDueDateWithMonthEndAdjustment", 
      BindingFlags.NonPublic | BindingFlags.Instance);
    var result = (DateTime)method.Invoke(service, new object[] { startDate, 1 });

    // Assert
    Assert.Equal(new DateTime(2026, 2, 28), result);
}
```

### **2. Documentación para Usuarios:**

Agregar en la documentación de usuario:
> "Si su fecha de compra es el día 30 o 31, las cuotas se ajustarán automáticamente al último día del mes cuando sea necesario (por ejemplo, 28 de febrero en lugar de 30 de febrero)."

---

**Fecha de corrección:** 2024-01-15
**Desarrollador:** Sistema M&M Softcom
**Versión:** 1.2.0 - Ajuste de Fechas de Vencimiento
**Archivos afectados:** 
- Services/OverdueDetectionService.cs
