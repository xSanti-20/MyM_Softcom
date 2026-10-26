# Verificación: PDF Reports con Tabla de Cuotas

**Fecha**: 2026-10-23  
**Objetivo**: Asegurar que los PDFs muestren valores correctos de cuotas cuando hay cambios en el plan (redistribuciones, ediciones, etc.)

---

## ✅ Cambios Realizados en Frontend

### 1. **pdfExportService.jsx** - `buildPlanPagosHTML()`
- ✅ Ahora prefiere `saleData.quotas` (tabla BD) sobre `customQuotasJson`
- ✅ Usa `current_amount` que refleja redistribuciones
- ✅ Mantiene fallback a JSON para compatibilidad hacia atrás
- **Archivo**: [src/services/pdfExportService.jsx](src/services/pdfExportService.jsx#L215)

### 2. **pdfExportService.jsx** - `generateSaleReportPDF()`
- ✅ Mismo patrón de preferencias
- ✅ Tabla de detalles ahora muestra valores actuales
- **Archivo**: [src/services/pdfExportService.jsx](src/services/pdfExportService.jsx#L450)

### 3. **DataTable.jsx** - `handleModalConfirm()`
- ✅ Incluye `quotas: selectedSale.quotas || []` en `saleDataWithQuotas`
- **Archivo**: [src/components/utils/DataTable.jsx](src/components/utils/DataTable.jsx#L143)

---

## ⚠️ Requisitos del Backend

### API: `/api/Sale/GetAllSales`
**Estado**: ❓ NECESITA VERIFICACIÓN

**Requerimiento**:
```json
Debe devolver quotas de la tabla en cada sale:

{
  "id_Sales": 123,
  "quotas": [
    {
      "id": 1,
      "quota_number": 1,
      "amount": 1000000,
      "current_amount": 1000000,
      "due_date": "2026-01-31",
      "status": "Pagada"
    }
  ]
}
```

**Ubicación en Backend**: `Controllers/Sale.Controller.cs` método `GetAllSales()`

**Verificación**:
```csharp
// Debe hacer Include de quotas:
var sales = await _saleServices.GetAllSales();
// O si GetAllSales() no incluye:
var sales = await _context.Sales
    .Include(s => s.quotas)
    .ToListAsync();
```

---

## 🔄 Flujo de Funcionamiento

```
Usuario descarga PDF en ventas
        ↓
[DataTable] Captura selectedSale (objeto original con .quotas si existe)
        ↓
[handleModalConfirm] Prepara saleDataWithQuotas incluyendo quotas
        ↓
[buildPlanPagosHTML] 
  └─ ¿Hay saleData.quotas? 
      ├─ Sí → Usa current_amount (refleja cambios)
      └─ No → Fallback a customQuotasJson
        ↓
[generateContractPDF] Genera PDF con valores correctos
```

---

## 🧪 Checklist de Testing

- [ ] **Plan Regular (sin personalizar)**
  - Crear venta con plan automático (12 cuotas)
  - Descargar PDF → Verificar valores y fechas
  - Agregar pago → Descargar PDF → Verificar totales actualizados

- [ ] **Plan Personalizado**
  - Crear venta con plan personalizado (valores variados)
  - Descargar PDF → Verificar valores coinciden con plan creado
  - Agregar pago → Descargar PDF → Verificar estado actualizado

- [ ] **Con Redistribución**
  - Crear venta con cuotas atrasadas
  - Aplicar redistribución
  - Descargar PDF → Verificar que muestre nuevos valores (current_amount)
  - **Importante**: Si backend NO incluye quotas de tabla, mostrará valores antiguos ❌

- [ ] **Compatibilidad**
  - Si backend no devuelve quotas, ¿fallback funciona?
  - ¿Muestra customQuotasJson correctamente? ✅
  - ¿Compila sin errores? ✅

---

## 📋 Tabla Comparativa: Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| Fuente de datos PDF | CustomQuotasJson (JSON) | quotas (tabla BD) + JSON fallback |
| Refleja redistribuciones | ❌ No (muestra originales) | ✅ Sí (usa current_amount) |
| Actualización tras pago | Manual (recargar) | ✅ Automática (valores reales) |
| Compatibilidad hacia atrás | N/A | ✅ Sí (JSON fallback) |

---

## 🚀 Logs para Debugging

Buscar en Browser Console:

```javascript
// buildPlanPagosHTML
[v0] buildPlanPagosHTML called with saleData:
[v0] Quotas from table: 5 quotas
[v0] Using quotas from table: true
[v0] Quota 1: Using table value 1000000 (reflects redistributions)

// generateSaleReportPDF
[SaleReport] Generating sale report PDF
[SaleReport] Using table data for quota values
[SaleReport] Quota 1: Using table value 1000000

// DataTable
[v0] DataTable - saleDataWithQuotas: {...}
[v0] DataTable - quotas from table: 5 quotas
```

---

## ✔️ Validación Final

**Hacer Deploy cuando**:
1. ✅ Backend confirma que `/api/Sale/GetAllSales` devuelve `quotas`
2. ✅ Se verifica con test que PDF muestra valores correctos
3. ✅ Se prueba redistribución: PDF refleja nuevos valores
4. ✅ Se prueba fallback a JSON: funciona si no hay tabla

---

## 📞 Contacto

Si el backend NO está devolviendo quotas, contacta al desarrollador backend para:
- Actualizar `Sale.Controller.cs` método `GetAllSales()`
- Agregar `.Include(s => s.quotas)` en la query
- Verificar que la serialización JSON incluya todos los campos de Quota

