# RESUMEN DE CORRECCIONES - Sistema de Pagos y Cuotas

## Problemas Identificados y Solucionados

### ✅ Problema #1: Distribución Incorrecta de Pagos en Cuotas

**Síntoma:**
- Al eliminar un pago de una cuota PAGADA, pasaba correctamente a VENCIDO
- Pero al reingresar ese pago, se aplicaba al siguiente mes PENDIENTE en lugar de restaurar la cuota original

**Causa Raíz:**
- El sistema no permitía especificar a qué cuota asignar un pago
- El backend automáticamente buscaba la siguiente cuota pendiente
- No había forma de restaurar pagos a cuotas vencidas específicas

**Solución Implementada:**
1. ✅ Creado: `QuotaSelector.jsx` - Nuevo componente para visualizar y seleccionar cuotas
2. ✅ Modificado: `formpagos.jsx` - Integrado selector de cuotas en el formulario
3. ✅ Modificado: Payload de pagos para incluir array `PaymentDetails` con asignación específica

**Cambios en Frontend:**
```javascript
// Nuevo: QuotaSelector.jsx
- Muestra estado de cada cuota (Pagada, Vencida, Pendiente, Abonada)
- Detecta automáticamente cuotas vencidas
- Permite seleccionar múltiples cuotas
- Distribuye monto equitativamente entre cuotas seleccionadas

// Modificado: formpagos.jsx
- Agrega estado selectedQuotas
- Carga detalles de pagos de la venta
- Incluye componente QuotaSelector
- Envía PaymentDetails en el payload
```

**Requiere Backend:**
```csharp
// Endpoint: POST/PUT /api/Payment/CreatePayment
{
  "Amount": 1000000,
  "Payment_Date": "2026-09-25T00:00:00Z",
  "Payment_Method": "EFECTIVO",
  "Id_Sales": 123,
  "PaymentDetails": [
    {
      "Number_Quota": 3,
      "Covered_Amount": 1000000
    }
  ]
}
```

---

### ✅ Problema #2: Protección de Pagos Iniciales

**Síntoma:**
- Pagos iniciales (creados automáticamente con la venta) podían ser eliminados
- El usuario solicitaba que estos pagos NO sean eliminables, solo editables

**Causa Raíz:**
- No existía distinción entre pagos iniciales y pagos regulares
- El botón de eliminar estaba disponible para todos los pagos

**Solución Implementada:**
1. ✅ Modificado: `page.jsx` (módulo pagos) - Agregar propiedad `canDelete` a datos de pagos
2. ✅ Modificado: `DataTable.jsx` - Respetar propiedad `canDelete` en botones de eliminar

**Cambios en Frontend:**
```javascript
// Modificado: pagos/page.jsx
- Detecta pagos iniciales (cuota 1 en detalles)
- Agrega propiedad canDelete: false para pagos iniciales
- Propiedad canDelete: true para otros pagos

// Modificado: DataTable.jsx
- Botón de eliminar deshabilitado si canDelete === false
- Tooltip explicativo: "Este pago no puede ser eliminado. Solo se puede editar desde la venta."
- Visual feedback: botón gris/deshabilitado para pagos protegidos
```

**Resultado:**
- Pagos iniciales no pueden ser eliminados ✓
- Se muestra tooltip al intentar eliminar ✓
- Botón visualmente deshabilitado ✓

---

### ✅ Problema #3: Prevención de Duplicación al Editar Pagos

**Síntoma:**
- Al editar un pago (ej: cambiar de EFECTIVO a BANCO)
- El sistema lo tomaba como un NUEVO pago
- Creaba entrada en otra cuota (de PENDIENTE a PAGADO)
- Resultado: duplicación e inconsistencia de datos

**Causa Raíz:**
- La edición de pagos no mantenía la asignación de cuota original
- El backend recreaba los PaymentDetails en lugar de actualizarlos
- No había mecanismo para "restaurar" la cuota anterior

**Solución Implementada:**
1. ✅ Modificado: `formpagos.jsx` - Cargar cuotas originales en modo edición
2. ✅ Modificado: Payload para incluir flag `KeepOriginalQuotas`
3. ✅ Selector de cuotas pre-cargado con cuotas originales del pago

**Cambios en Frontend:**
```javascript
// Modificado: formpagos.jsx - useEffect de edición
- Carga detalles de pagos de la venta seleccionada
- Extrae cuotas originales del pago siendo editado
- Pre-carga selectedQuotas con cuotas originales
- Muestra selector de cuotas con cuotas originales seleccionadas

// Modificado: payload de edición
{
  "Id_Payments": 123,
  "Amount": 1200000,
  "Payment_Date": "2026-09-25T00:00:00Z",
  "Payment_Method": "BANCO CORRIENTE",  // ← Cambio permitido
  "Id_Sales": 123,
  "KeepOriginalQuotas": true,  // ← Flag para backend
  "PaymentDetails": [
    {
      "Number_Quota": 3,  // ← Misma cuota, NO crea duplicado
      "Covered_Amount": 1200000
    }
  ]
}
```

**Requiere Backend:**
```csharp
// Lógica: Cuando KeepOriginalQuotas = true
if (updateRequest.KeepOriginalQuotas)
{
    // NO eliminar/recrear PaymentDetails
    // Solo actualizar Amount y Payment_Method
    // Mantener Number_Quota original
    payment.Amount = updateRequest.Amount;
    payment.Payment_Method = updateRequest.Payment_Method;
    payment.Payment_Date = updateRequest.Payment_Date;
    // ✓ No recrear PaymentDetails
}
else
{
    // Comportamiento normal: recrear PaymentDetails
}
```

---

## Archivos Modificados

| Archivo | Cambios | Estado |
|---------|---------|--------|
| `src/components/utils/QuotaSelector.jsx` | CREADO | ✅ |
| `src/app/dashboard/pagos/formpagos.jsx` | Agregar selector cuotas, cargar detalles, mantener cuotas originales | ✅ |
| `src/app/dashboard/pagos/page.jsx` | Agregar propiedad canDelete | ✅ |
| `src/components/utils/DataTable.jsx` | Respetar canDelete, deshabilitar botón | ✅ |
| `GUIA_SELECTOR_CUOTAS.md` | CREADO - Documentación técnica | ✅ |

---

## Cambios Requeridos en Backend

### 1. Endpoint: `POST/PUT /api/Payment/CreatePayment`

**Aceptar nuevo campo opcional:**
```csharp
public class CreatePaymentRequest
{
    public decimal Amount { get; set; }
    public DateTime Payment_Date { get; set; }
    public string Payment_Method { get; set; }
    public int Id_Sales { get; set; }
    public List<PaymentDetailRequest> PaymentDetails { get; set; }  // NUEVO
}

public class PaymentDetailRequest
{
    public int Number_Quota { get; set; }
    public decimal Covered_Amount { get; set; }
}
```

**Lógica:**
```csharp
if (request.PaymentDetails != null && request.PaymentDetails.Count > 0)
{
    // Asignar pago a cuotas específicas
    foreach (var detail in request.PaymentDetails)
    {
        var paymentDetail = new PaymentDetail
        {
            Id_Payments = payment.Id_Payments,
            Number_Quota = detail.Number_Quota,
            Covered_Amount = detail.Covered_Amount
        };
        context.PaymentDetails.Add(paymentDetail);
    }
}
else
{
    // Comportamiento actual: buscar siguiente cuota pendiente
    // BACKWARD COMPATIBLE
}
```

### 2. Endpoint: `PUT /api/Payment/UpdatePayment`

**Aceptar nuevo campo:**
```csharp
public class UpdatePaymentRequest
{
    public int Id_Payments { get; set; }
    public decimal Amount { get; set; }
    public DateTime Payment_Date { get; set; }
    public string Payment_Method { get; set; }
    public int Id_Sales { get; set; }
    public bool KeepOriginalQuotas { get; set; }  // NUEVO
    public List<PaymentDetailRequest> PaymentDetails { get; set; }  // NUEVO
}
```

**Lógica:**
```csharp
if (updateRequest.KeepOriginalQuotas)
{
    // Actualizar solo Amount y Payment_Method
    // Mantener PaymentDetails originales
    payment.Amount = updateRequest.Amount;
    payment.Payment_Method = updateRequest.Payment_Method;
    payment.Payment_Date = updateRequest.Payment_Date;
    // NO tocar PaymentDetails
}
else if (updateRequest.PaymentDetails != null)
{
    // Recrear PaymentDetails con nuevas cuotas
    context.PaymentDetails.RemoveRange(
        context.PaymentDetails.Where(pd => pd.Id_Payments == payment.Id_Payments)
    );
    foreach (var detail in updateRequest.PaymentDetails)
    {
        context.PaymentDetails.Add(new PaymentDetail
        {
            Id_Payments = payment.Id_Payments,
            Number_Quota = detail.Number_Quota,
            Covered_Amount = detail.Covered_Amount
        });
    }
}
else
{
    // Comportamiento actual
}
```

---

## Testing Checklist

### Problema #1 - Selección de Cuotas
- [ ] Crear pago, no seleccionar cuotas → funciona con comportamiento anterior
- [ ] Crear pago, seleccionar 1 cuota → aplica a esa cuota específica
- [ ] Crear pago, seleccionar 2+ cuotas → distribuye monto entre cuotas
- [ ] Eliminar pago de cuota #3 → pasa a VENCIDO
- [ ] Reingresar pago → sistema sugiere cuota #3 VENCIDA automáticamente

### Problema #2 - Protección de Pagos Iniciales
- [ ] Pago inicial tiene botón de eliminar DESHABILITADO
- [ ] Tooltip aparece al hover: "Este pago no puede ser eliminado..."
- [ ] Pago inicial puede ser EDITADO sin problema
- [ ] Pagos no-iniciales pueden ser ELIMINADOS normalmente

### Problema #3 - No Duplicación
- [ ] Editar pago (cambiar método) → NO crea nuevo pago
- [ ] Editar pago → NO cambia cuota de otra fila
- [ ] Editar pago → mantiene asignación original
- [ ] Deuda y cuotas NO se modifican incorrectamente

---

## Notas Importantes

1. **Backward Compatible**: Si no se envía `PaymentDetails` o `KeepOriginalQuotas`, el backend usa comportamiento anterior
2. **Frontend**: Todas las validaciones y UX están implementadas
3. **Backend Requerido**: Implementar lógica de `PaymentDetails` y `KeepOriginalQuotas`
4. **Testing Integral**: Validar casos de edición, eliminación y creación de pagos

---

## Próximas Mejoras Sugeridas

1. Permitir distribución manual (no equitativa) de montos
2. Historial de cambios de pagos y cuotas
3. Validación frontend de sobrepagos
4. Resumen visual antes/después de editar
5. Bloqueo de edición para pagos vencidos (opcional)
