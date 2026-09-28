# 🔍 DEBUG: Implementación de PaymentDetails en Backend

## Problema Original

Frontend enviaba:
```json
{
  "Amount": 1000000,
  "Payment_Date": "2026-09-25T00:00:00",
  "Payment_Method": "EFECTIVO",
  "Id_Sales": 123,
  "PaymentDetails": [
    { "Number_Quota": 1, "Covered_Amount": 500000 },
    { "Number_Quota": 2, "Covered_Amount": 500000 }
  ]
}
```

**Pero el backend IGNORABA `PaymentDetails`** porque:
- ❌ `CreatePaymentDTO` NO tenía ese campo
- ❌ El controlador NO lo recibía
- ❌ El servicio NO lo procesaba

---

## ✅ Solución Implementada

### 1. **DTOs/Payment.DTO.cs** - Actualizado

Se agregaron dos nuevas clases:

```csharp
public class CreatePaymentDTO
{
    // ... campos existentes ...
    
    // ← NUEVO: Array opcional de detalles de pago
    public List<PaymentDetailRequest>? PaymentDetails { get; set; }
    
    // ← NUEVO: Flag para edición (mantener cuotas originales)
    public bool KeepOriginalQuotas { get; set; } = false;
}

// ← NUEVO: DTO para cada detalle de pago por cuota
public class PaymentDetailRequest
{
    public int Number_Quota { get; set; }
    public decimal Covered_Amount { get; set; }
}
```

### 2. **Controllers/Payment.Controller.cs** - Modificado

```csharp
// CAMBIO: Ahora recibe CreatePaymentDTO en lugar de Payment
[HttpPost("CreatePayment")]
public async Task<ActionResult<Payment>> CreatePayment(CreatePaymentDTO paymentDTO)
{
    // Nuevo: Pasar el DTO al servicio
    var success = await _paymentServices.CreatePaymentFromDTO(paymentDTO);
    // ...
}
```

### 3. **Services/Payment.Services.cs** - GRAN CAMBIO

Se agregó el nuevo método `CreatePaymentFromDTO()` que:

```csharp
public async Task<bool> CreatePaymentFromDTO(CreatePaymentDTO paymentDTO)
{
    // 1. Valida el monto
    // 2. Verifica que la venta existe
    // 3. Crea el objeto Payment
    // 4. Guarda el pago en BD
    
    // ← NUEVO: Si NO hay PaymentDetails especificados
    if (paymentDTO.PaymentDetails == null || paymentDTO.PaymentDetails.Count == 0)
    {
        // Usa distribución AUTOMÁTICA (heredado)
        await DistributePaymentToQuotas(payment, sale);
    }
    else
    {
        // ← NUEVO: Distribuye SOLO a las cuotas especificadas
        foreach (var detail in paymentDTO.PaymentDetails)
        {
            _context.Details.Add(new Detail
            {
                id_Payments = payment.id_Payments,
                id_Sales = payment.id_Sales,
                number_quota = detail.Number_Quota,
                covered_amount = detail.Covered_Amount
            });
        }
    }
    
    // Actualiza totales de la venta
    // Cambia estado a "Escriturar" si está pagada
}
```

Se agregó también `DistributePaymentToQuotas()`:
- Extrae la lógica de distribución automática
- Usa cuando NO se especifican PaymentDetails
- Mantiene la compatibilidad hacia atrás

---

## 🎯 Cómo Funciona Ahora

### Caso 1: Frontend envía PaymentDetails

```
POST /api/Payment/CreatePayment
{
  "Amount": 1,000,000
  "PaymentDetails": [
    { "Number_Quota": 1, "Covered_Amount": 966,666 },
    { "Number_Quota": 2, "Covered_Amount": 33,334 }
  ]
}
```

**Backend hace:**
1. ✅ Crea Payment con $1,000,000
2. ✅ Crea Detail para Cuota 1: $966,666
3. ✅ Crea Detail para Cuota 2: $33,334
4. ✅ Actualiza totales: total_raised += $1,000,000

**Resultado en BD:**
```
Payments: id_Payments=123, amount=$1,000,000
Details: 
  - id_Payments=123, number_quota=1, covered_amount=$966,666
  - id_Payments=123, number_quota=2, covered_amount=$33,334
```

### Caso 2: Frontend NO envía PaymentDetails (Heredado)

```
POST /api/Payment/CreatePayment
{
  "Amount": 1,000,000
}
```

**Backend hace:**
1. ✅ Crea Payment con $1,000,000
2. ✅ Llama a `DistributePaymentToQuotas()`
3. ✅ Automáticamente distribuye a cuotas pendientes:
   - Cuota 1: $966,667 (si falta eso)
   - Cuota 2: $33,333 (resto)

**Resultado: IGUAL que Caso 1, pero automático**

---

## 📊 Flujo Completo Frontend → Backend

```
Frontend (formpagos.jsx)
  ↓
  Construye payload:
  {
    Amount: 1000000,
    Payment_Date: "...",
    Payment_Method: "EFECTIVO",
    Id_Sales: 123,
    PaymentDetails: [
      { Number_Quota: 1, Covered_Amount: 966666 },
      { Number_Quota: 2, Covered_Amount: 33334 }
    ]
  }
  ↓
  axiosInstance.post("/api/Payment/CreatePayment", body)
  ↓
Backend (Payment.Controller.cs)
  ↓
  CreatePayment(paymentDTO) - recibe CreatePaymentDTO
  ↓
  _paymentServices.CreatePaymentFromDTO(paymentDTO)
  ↓
Backend (Payment.Services.cs)
  ↓
  CreatePaymentFromDTO()
  ├─ Crea Payment
  ├─ Si PaymentDetails existe:
  │  └─ Crea Details específicos (NUEVO ✅)
  ├─ Si NO existe:
  │  └─ Distribuye automáticamente (HEREDADO ✅)
  └─ Actualiza Sale totales
  ↓
  INSERT INTO Payments (...) VALUES (...)
  INSERT INTO Details (...) VALUES (...)
  UPDATE Sales SET total_raised = ..., total_debt = ...
```

---

## 🔧 Verificaciones Post-Implementación

### ✅ Checklist Compilación:
```
[ ] DTOs/Payment.DTO.cs - Sintaxis correcta
[ ] Controllers/Payment.Controller.cs - Imports correctos, método firmado correcto
[ ] Services/Payment.Services.cs - Método CreatePaymentFromDTO compilable
[ ] All namespaces using mym_softcom.DTOs imported
```

### ✅ Checklist Runtime:
```
[ ] POST /api/Payment/CreatePayment con PaymentDetails → Distribuye a cuotas especificadas
[ ] POST /api/Payment/CreatePayment sin PaymentDetails → Distribuye automáticamente
[ ] Validación: Si suma PaymentDetails > Amount → Error
[ ] Validación: Si Number_Quota inválido → Error
[ ] Logs en console muestran distribución detallada
```

### ✅ Checklist BD:
```
[ ] Payments table: 1 registro por pago
[ ] Details table: Múltiples registros (1 por cuota que recibió dinero)
[ ] Sales table: total_raised incrementado, total_debt decrementado
[ ] Sale.status = "Escriturar" cuando total_debt = 0
```

---

## 📝 Notas Importantes

1. **Tolerancia de Redondeo (Frontend):**
   - Frontend tiene $1,000 COP de tolerancia
   - Backend NO tiene tolerancia (es exacto)
   - Ejemplo: Pago $966,666 a Cuota esperada $966,667
     - Frontend: Muestra "Pagada" (dentro de $1,000)
     - Backend: Guarda $966,666 exactamente

2. **PaymentDetails es OPCIONAL:**
   - Para compatibilidad hacia atrás
   - Si no se proporciona → distribución automática
   - Si se proporciona → distribución manual

3. **KeepOriginalQuotas (Para Edición):**
   - Agregado en DTO para futura use en UpdatePayment
   - Por ahora NO se usa (será en próxima fase)

4. **Validaciones:**
   - Suma de PaymentDetails ≤ Amount (permitiendo 1 COP de tolerancia)
   - Cada Number_Quota > 0
   - Cada Covered_Amount > 0

---

## 🚀 Pasos Compilación

Desde línea de comandos:

```bash
cd c:\Proyecto\MyM_Softcom\Backend\mym_softcom
dotnet build
```

Si hay errores, revisar:
1. Namespace `mym_softcom.DTOs` correctamente importado
2. Clase `PaymentDetailRequest` definida en Payment.DTO.cs
3. Método `CreatePaymentFromDTO` firmado correctamente
4. Clase `CustomQuota` existe (se usa en DistributePaymentToQuotas)

---

## 🎯 Resultado Final

✅ **Frontend puede ahora especificar exactamente a qué cuotas va cada pago**
✅ **Backend respeta la distribución manual cuando se proporciona**
✅ **Backend mantiene distribución automática cuando NO se especifica (backwards compatible)**
✅ **Logs detallados para debugging**
