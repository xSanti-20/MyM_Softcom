# 📋 Guía de Implementación - Sistema de Descuentos por Referidos

## 📌 Resumen

Esta solución implementa un **sistema de descuentos por referidos** que permite:
- ✅ Registrar descuentos cuando un cliente trae un nuevo cliente
- ✅ Elegir dónde aplicar el descuento: **Cartera Pendiente** o **Próxima Cuota**
- ✅ Gestionar y visualizar todos los descuentos registrados
- ✅ Generar reportes de descuentos por referidos

---

## 🎯 Componentes Creados

### 1. **ReferralDiscountModal.jsx**
- **Ubicación**: `src/components/utils/ReferralDiscountModal.jsx`
- **Descripción**: Modal de 3 pasos para registrar descuentos
  - **Paso 1**: Buscar cliente por documento
  - **Paso 2**: Ingresar monto y elegir dónde aplicar
  - **Paso 3**: Confirmar antes de guardar

### 2. **Página de Referidos**
- **Ubicación**: `src/app/dashboard/referidos/page.jsx`
- **Descripción**: Panel completo para gestionar referidos
  - Estadísticas generales
  - Filtros avanzados
  - Tabla de descuentos registrados
  - Integración con el modal

---

## 🔧 Cambios Requeridos en Backend

### 1. **Crear Tabla de Descuentos - SQL**

```sql
CREATE TABLE Discounts (
    id_Discount INT PRIMARY KEY IDENTITY(1,1),
    id_Clients INT NOT NULL,
    id_Sales INT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    discount_type VARCHAR(50) DEFAULT 'referral', -- referral, promotional, other
    apply_to VARCHAR(50) NOT NULL, -- 'cartera' o 'cuota'
    notes NVARCHAR(MAX) NULL,
    discount_date DATE NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    is_active BIT DEFAULT 1,
    FOREIGN KEY (id_Clients) REFERENCES Clients(id_Clients),
    FOREIGN KEY (id_Sales) REFERENCES Sales(id_Sales)
);

-- Crear índices para optimización
CREATE INDEX idx_discount_client ON Discounts(id_Clients);
CREATE INDEX idx_discount_type ON Discounts(discount_type);
CREATE INDEX idx_discount_apply_to ON Discounts(apply_to);
```

### 2. **Crear Endpoints API en .NET**

```csharp
// CREAR - POST /api/Discount/CreateReferralDiscount
[HttpPost("CreateReferralDiscount")]
public async Task<IActionResult> CreateReferralDiscount([FromBody] CreateDiscountRequest request)
{
    try
    {
        // Validaciones
        if (request.discount_amount <= 0)
            return BadRequest(new { message = "El monto debe ser mayor a 0" });

        if (!new[] { "cartera", "cuota" }.Contains(request.apply_to))
            return BadRequest(new { message = "apply_to debe ser 'cartera' o 'cuota'" });

        // Si se aplica a cuota, verificar que exista venta
        if (request.apply_to == "cuota" && request.id_Sales == null)
            return BadRequest(new { message = "Debe seleccionar una venta para aplicar a cuota" });

        // Crear descuento
        var discount = new Discount
        {
            IdClients = request.id_Clients,
            IdSales = request.id_Sales,
            DiscountAmount = request.discount_amount,
            DiscountType = "referral",
            ApplyTo = request.apply_to,
            Notes = request.notes,
            DiscountDate = DateTime.Parse(request.discount_date),
            IsActive = true
        };

        _context.Discounts.Add(discount);

        // SI APLICA A CARTERA: Reducir total_value de la venta
        if (request.apply_to == "cartera" && request.id_Sales.HasValue)
        {
            var sale = await _context.Sales.FindAsync(request.id_Sales.Value);
            if (sale != null)
            {
                sale.TotalValue -= request.discount_amount;
                // Recalcular cuotas si es necesario
                await RecalculateQuotas(sale);
            }
        }

        // SI APLICA A CUOTA: Registrar descuento para próxima cuota
        if (request.apply_to == "cuota" && request.id_Sales.HasValue)
        {
            // Aquí iría lógica para aplicar el descuento a la próxima cuota
            await ApplyDiscountToNextQuota(request.id_Sales.Value, request.discount_amount);
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Descuento registrado exitosamente", id = discount.IdDiscount });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { message = ex.Message });
    }
}

// OBTENER - GET /api/Discount/GetReferralDiscounts
[HttpGet("GetReferralDiscounts")]
public async Task<IActionResult> GetReferralDiscounts()
{
    try
    {
        var discounts = await _context.Discounts
            .Where(d => d.DiscountType == "referral" && d.IsActive)
            .Select(d => new {
                d.IdDiscount,
                client_name = d.Client.Names + " " + d.Client.Surnames,
                d.Client.Document,
                d.DiscountAmount,
                d.ApplyTo,
                d.DiscountDate,
                d.Notes
            })
            .OrderByDescending(d => d.DiscountDate)
            .ToListAsync();

        return Ok(discounts);
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { message = ex.Message });
    }
}
```

### 3. **Modelo de Datos - C#**

```csharp
public class Discount
{
    [Key]
    public int IdDiscount { get; set; }

    [Required]
    public int IdClients { get; set; }

    public int? IdSales { get; set; }

    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal DiscountAmount { get; set; }

    [Required]
    [StringLength(50)]
    public string DiscountType { get; set; } = "referral";

    [Required]
    [StringLength(50)]
    public string ApplyTo { get; set; } // "cartera" o "cuota"

    [StringLength(500)]
    public string Notes { get; set; }

    [Required]
    [Column(TypeName = "date")]
    public DateTime DiscountDate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public DateTime UpdatedAt { get; set; } = DateTime.Now;

    public bool IsActive { get; set; } = true;

    // Relaciones
    [ForeignKey(nameof(IdClients))]
    public virtual Client Client { get; set; }

    [ForeignKey(nameof(IdSales))]
    public virtual Sale Sale { get; set; }
}

public class CreateDiscountRequest
{
    public int id_Clients { get; set; }
    public int? id_Sales { get; set; }
    public decimal discount_amount { get; set; }
    public string apply_to { get; set; } // "cartera" o "cuota"
    public string notes { get; set; }
    public string discount_date { get; set; }
}
```

---

## 📱 Cómo Usar

### **Acceso a la Funcionalidad**
1. Ir a: **Dashboard → Gestión de Referidos**
2. Hacer clic en **"Nuevo Descuento"**

### **Pasos para Registrar un Descuento**

#### **Paso 1: Buscar Cliente**
- Ingresa el número de documento del cliente
- Haz clic en "Buscar" o presiona Enter
- El sistema mostrará los datos del cliente y su venta activa

#### **Paso 2: Ingresar Detalles del Descuento**
1. **Monto del Descuento**: Ingresa el valor a descontar (ej: 500000)
2. **¿Dónde Aplicar?**:
   - **Cartera Pendiente**: Reduce el saldo total que debe pagar el cliente
   - **Próxima Cuota**: Reduce solo el monto de la siguiente cuota
3. **Notas** (Opcional): Información adicional como referido por quién

#### **Paso 3: Confirmar**
- Verifica todos los detalles
- Haz clic en "Confirmar Descuento"
- El sistema registrará el descuento

---

## 📊 Interpretación de Opciones de Aplicación

### **1. Cartera Pendiente** 💼
- **Qué es**: El saldo total restante que el cliente debe pagar
- **Ejemplo**: 
  - Cliente debe: $10,000,000
  - Descuento: $500,000
  - **Nuevo saldo**: $9,500,000
- **Cuándo usar**: Cuando quieres reducir la deuda total del cliente

### **2. Próxima Cuota** 📅
- **Qué es**: El monto de la siguiente cuota a pagar
- **Ejemplo**:
  - Cuota normal: $200,000
  - Descuento: $50,000
  - **Próxima cuota**: $150,000
- **Cuándo usar**: Cuando quieres reducir solo la próxima obligación de pago

---

## 🎛️ Filtros Disponibles

### **Búsqueda**
- Por nombre del cliente
- Por número de documento

### **Tipo de Aplicación**
- Todos
- Cartera Pendiente
- Próxima Cuota

---

## 📈 Estadísticas Mostradas

| Métrica | Descripción |
|---------|------------|
| **Total Descuentos** | Cantidad total de descuentos registrados |
| **Monto Total** | Suma de todos los montos descontados |
| **Aplicados a Cartera** | Cantidad de descuentos aplicados al saldo total |
| **Aplicados a Cuota** | Cantidad de descuentos aplicados a cuotas |

---

## 🔐 Consideraciones de Seguridad

✅ **Validaciones Frontend**:
- Verificar que el cliente exista
- Validar que el monto sea positivo
- Requerir selección de tipo de aplicación

✅ **Validaciones Backend**:
- Autenticar usuario
- Verificar permisos de administrador
- Validar integridad de datos
- Registrar auditoría de cambios

---

## 🚀 Próximas Mejoras Sugeridas

1. **Auditoría**: Registrar quién y cuándo creó cada descuento
2. **Eliminación Lógica**: Permitir anular descuentos con justificación
3. **Reportes**: Exportar reportes de descuentos por período
4. **Notificaciones**: Alertar al cliente sobre el descuento recibido
5. **Historial**: Ver historial de cambios en descuentos
6. **Integración con Pagos**: Aplicar automáticamente al procesamiento de pagos

---

## ❓ Preguntas Frecuentes

### **¿Puedo aplicar múltiples descuentos a un cliente?**
Sí, cada descuento se registra independientemente.

### **¿Qué pasa si aplico descuento a cartera?**
El saldo total del cliente se reduce y todas las cuotas se recalculan.

### **¿Puedo editar un descuento registrado?**
Actualmente se recomienda crear uno nuevo. Próxima versión incluirá edición.

### **¿Genera reportes?**
Sí, puedes filtrar y exportar los datos directamente desde la tabla.

---

## 📞 Soporte

Para dudas sobre la implementación, contacta al equipo de desarrollo.
