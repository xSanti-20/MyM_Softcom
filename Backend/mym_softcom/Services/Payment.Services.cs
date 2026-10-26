using mym_softcom.Models;
using mym_softcom;
using mym_softcom.DTOs;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Text.Json;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace mym_softcom.Services
{
    public class PaymentServices
    {
        private readonly AppDbContext _context;
        private readonly SaleServices _saleServices; // Para interactuar con las ventas

        public PaymentServices(AppDbContext context, SaleServices saleServices)
        {
            _context = context;
            _saleServices = saleServices;
        }

        /// <summary>
        /// Obtiene todos los pagos, incluyendo la venta asociada.
        /// </summary>
        public async Task<IEnumerable<Payment>> GetAllPayments()
        {
            try
            {
                Console.WriteLine("🔍 [PaymentServices] Iniciando GetAllPayments");
                
                // Primero, obtener pagos sin Include
                var payments = await _context.Payments.ToListAsync();
                Console.WriteLine($"📊 Pagos encontrados sin Include: {payments.Count}");
                
                if (payments.Count == 0)
                {
                    Console.WriteLine("⚠️ No hay pagos en la BD");
                    return payments;
                }

                // Ahora, cargar las relaciones manualmente de forma más segura
                Console.WriteLine("🔗 Cargando relaciones para cada pago...");
                
                foreach (var payment in payments)
                {
                    try
                    {
                        // Cargar sale y sus relaciones
                        if (payment.id_Sales > 0 && payment.sale == null)
                        {
                            payment.sale = await _context.Sales
                                .Include(s => s.client)
                                .Include(s => s.lot)
                                .ThenInclude(l => l.project)
                                .Include(s => s.plan)
                                .FirstOrDefaultAsync(s => s.id_Sales == payment.id_Sales);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"⚠️ Error cargando relaciones para pago {payment.id_Payments}: {ex.Message}");
                        // Continuar con el siguiente pago
                    }
                }

                Console.WriteLine($"✅ GetAllPayments completado: {payments.Count} pagos");
                return payments;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error crítico en GetAllPayments: {ex.Message}");
                Console.WriteLine($"   Stack: {ex.StackTrace}");
                throw;
            }
        }

        /// <summary>
        /// Obtiene un pago específico por su ID, incluyendo la venta asociada.
        /// </summary>
        public async Task<Payment?> GetPaymentById(int id_Payments)
        {
            Console.WriteLine($"[PaymentServices] Buscando pago con id_Payments: {id_Payments}");
            return await _context.Payments
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project) // Incluir proyecto del lote
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.plan)
                                 .FirstOrDefaultAsync(p => p.id_Payments == id_Payments);
        }

        /// <summary>
        /// Obtiene todos los pagos asociados a una venta específica.
        /// </summary>
        public async Task<IEnumerable<Payment>> GetPaymentsBySaleId(int id_Sales)
        {
            return await _context.Payments
                                 .Where(p => p.id_Sales == id_Sales)
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project) // Incluir proyecto del lote
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.plan)
                                 .ToListAsync();
        }

        /// <summary>
        /// Crea un nuevo pago y actualiza el recaudo total y la deuda de la venta asociada.
        /// Además, distribuye el monto del pago en los detalles de cuotas (PaymentDetail).
        /// </summary>
        public async Task<bool> CreatePayment(Payment payment)
        {
            try
            {
                if (payment.payment_date == default(DateTime))
                {
                    payment.payment_date = DateTime.UtcNow;
                }

                var sale = await _context.Sales
                    .Include(s => s.plan) // Necesitamos el plan para el valor de la cuota
                    .FirstOrDefaultAsync(s => s.id_Sales == payment.id_Sales);

                if (sale == null)
                {
                    throw new InvalidOperationException("La venta asociada no existe.");
                }

                if (!payment.amount.HasValue || payment.amount.Value <= 0)
                {
                    throw new ArgumentException("El monto del pago debe ser un valor positivo.");
                }

                // Añadir el pago al contexto primero para obtener su ID si es necesario para PaymentDetail
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync(); // Guardar el pago para que tenga un id_Payments

                // --- Lógica MEJORADA para distribuir el pago en PaymentDetail ---
                decimal remainingPaymentAmount = payment.amount.Value;
                decimal baseQuotaValue = sale.quota_value ?? 0;
                int totalQuotas = sale.plan?.number_quotas ?? 0;

                // ✅ CORRECCIÓN: Cargar cuotas personalizadas si el tipo de plan es "custom"
                Dictionary<int, (decimal Amount, DateTime? DueDate)> customQuotaData = null;
                if (sale.PaymentPlanType?.ToLower() == "custom" && !string.IsNullOrEmpty(sale.CustomQuotasJson))
     {
          try
        {
   var customQuotas = JsonSerializer.Deserialize<List<CustomQuota>>(sale.CustomQuotasJson);
                if (customQuotas != null && customQuotas.Count > 0)
  {
      customQuotaData = customQuotas.ToDictionary(
      q => q.QuotaNumber,
      q => (q.Amount, q.DueDate)
      );
        totalQuotas = customQuotas.Count;
            Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: Plan personalizado con {totalQuotas} cuotas detectado.");
     }
      }
    catch (Exception ex)
 {
           Console.WriteLine($"[PaymentServices] Error deserializando cuotas personalizadas: {ex.Message}");
       }
      }

   if ((customQuotaData == null && baseQuotaValue <= 0) || totalQuotas <= 0)
           {
            Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: Valor de cuota o número de cuotas inválido. No se crearán Details.");
       // Continuar con la actualización de la venta, pero sin detalles de cuotas
             }
    else
   {
   decimal redistributionAmount = sale.RedistributionAmount ?? 0;
          string redistributionType = sale.RedistributionType;
            List<int> redistributedQuotaNumbers = new List<int>();
            List<int> overdueQuotasFromRedistribution = new List<int>(); // ← NUEVO

            if (!string.IsNullOrEmpty(sale.RedistributedQuotaNumbers))
    {
           try
      {
      // ← NUEVO: Parsear JSON unificado {"received": [...], "overdue": [...]}
      var quotaData = JsonSerializer.Deserialize<JsonElement>(sale.RedistributedQuotaNumbers);
      
      // Intentar parsear como objeto con propiedades {received, overdue}
      if (quotaData.ValueKind == JsonValueKind.Object)
      {
          Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: Formato objeto detectado");
          
          if (quotaData.TryGetProperty("received", out var receivedElement) && receivedElement.ValueKind == JsonValueKind.Array)
          {
              redistributedQuotaNumbers = JsonSerializer.Deserialize<List<int>>(receivedElement.GetRawText()) ?? new List<int>();
              Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: Cuotas 'received': {string.Join(", ", redistributedQuotaNumbers)}");
          }
          
          if (quotaData.TryGetProperty("overdue", out var overdueElement) && overdueElement.ValueKind == JsonValueKind.Array)
          {
              overdueQuotasFromRedistribution = JsonSerializer.Deserialize<List<int>>(overdueElement.GetRawText()) ?? new List<int>();
              Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: Cuotas 'overdue': {string.Join(", ", overdueQuotasFromRedistribution)}");
          }
      }
      // Intentar parsear como array directo [35, 36] (formato antiguo)
      else if (quotaData.ValueKind == JsonValueKind.Array)
      {
          Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: Formato array directo detectado");
          redistributedQuotaNumbers = JsonSerializer.Deserialize<List<int>>(sale.RedistributedQuotaNumbers) ?? new List<int>();
          Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: Cuotas redistribuidas (array): {string.Join(", ", redistributedQuotaNumbers)}");
      }
      }
         catch (Exception ex)
             {
  Console.WriteLine($"[PaymentServices] Error deserializando cuotas redistribuidas: {ex.Message}");
  Console.WriteLine($"[PaymentServices] RedistributedQuotaNumbers raw: {sale.RedistributedQuotaNumbers}");
      }
       }
    else
    {
        Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: NO hay datos de redistribución");
    }

     // Obtener los detalles de cuotas existentes para esta venta
      var existingDetails = await _context.Details
          .AsNoTracking()
            .Where(pd => pd.id_Sales == sale.id_Sales)
     .ToListAsync();

 // Calcular el monto cubierto por cada cuota hasta ahora
     var coveredAmountsPerQuota = existingDetails
            .GroupBy(pd => pd.number_quota)
 .ToDictionary(g => g.Key, g => g.Sum(pd => pd.covered_amount ?? 0));

              var adjustedQuotaValues = new Dictionary<int, decimal>();

               // ✅ CORRECCIÓN: Usar valores personalizados si existen
         if (customQuotaData != null)
   {
              // Para planes personalizados, usar los valores exactos del JSON
          foreach (var kvp in customQuotaData)
       {
   adjustedQuotaValues[kvp.Key] = kvp.Value.Amount;
             }
  Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: Usando valores de cuotas personalizadas.");
      }
    else if (redistributedQuotaNumbers.Any())
    {
        // ← NUEVO: Si hay redistribución activa, SOLO cargar las cuotas que reciben redistribución
        Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: Redistribución activa detectada. SOLO procesarán cuotas: {string.Join(", ", redistributedQuotaNumbers)}");
        
        foreach (var quotaNumber in redistributedQuotaNumbers)
        {
            // Usar el valor de CustomQuotasJson si existe, sino usar el valor personalizado o base
            if (customQuotaData != null && customQuotaData.ContainsKey(quotaNumber))
            {
                adjustedQuotaValues[quotaNumber] = customQuotaData[quotaNumber].Amount;
            }
            else
            {
                adjustedQuotaValues[quotaNumber] = baseQuotaValue;
            }
        }
    }
    else if (redistributionAmount > 0 && !string.IsNullOrEmpty(redistributionType))
     {
   for (int i = 1; i <= totalQuotas; i++)
        {
         decimal adjustedValue = baseQuotaValue;

       // Si esta cuota NO fue redistribuida, recibe parte del monto redistribuido
           if (!redistributedQuotaNumbers.Contains(i))
                 {
        if (redistributionType == "uniform")
    {
 int remainingQuotasCount = totalQuotas - redistributedQuotaNumbers.Count;
          if (remainingQuotasCount > 0)
      {
           decimal redistributionPerQuota = redistributionAmount / remainingQuotasCount;
          adjustedValue += redistributionPerQuota;
      }
   }
       else if (redistributionType == "lastQuota" && i == totalQuotas)
          {
   adjustedValue += redistributionAmount;
}
            }

             adjustedQuotaValues[i] = adjustedValue;
   }
          }
       else
     {
      // Sin redistribución, usar valores base
             for (int i = 1; i <= totalQuotas; i++)
     {
     adjustedQuotaValues[i] = baseQuotaValue;
   }
             }

    // Ordenar las cuotas para procesarlas en orden
           var sortedQuotas = adjustedQuotaValues.OrderBy(kvp => kvp.Key).ToList();

   foreach (var quotaKvp in sortedQuotas)
    {
             if (remainingPaymentAmount <= 0) break;

          int quotaNumber = quotaKvp.Key;
             decimal quotaValue = quotaKvp.Value;

         // ← NUEVO: Saltar cuotas que FUERON VENCIDAS (cedieron su dinero, no pueden recibir más)
              if (overdueQuotasFromRedistribution.Any() && overdueQuotasFromRedistribution.Contains(quotaNumber))
              {
   Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: Saltando cuota #{quotaNumber} (fue vencida y cedió dinero)");
        continue;
     }

     decimal currentCovered = coveredAmountsPerQuota.GetValueOrDefault(quotaNumber, 0);
              decimal remainingForThisQuota = quotaValue - currentCovered;

     if (remainingForThisQuota > 0)
        {
     decimal amountToApplyToThisQuota = Math.Min(remainingPaymentAmount, remainingForThisQuota);

   _context.Details.Add(new Detail
  {
     id_Payments = payment.id_Payments,
        id_Sales = sale.id_Sales,
    number_quota = quotaNumber,
     covered_amount = amountToApplyToThisQuota
 });

    remainingPaymentAmount -= amountToApplyToThisQuota;
    Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: Aplicado {amountToApplyToThisQuota:C} a cuota #{quotaNumber} (valor: {quotaValue:C}). Restante del pago: {remainingPaymentAmount:C}");
     }
  }

       // Si aún queda monto después de cubrir todas las cuotas, se puede considerar un "pago adelantado"
         if (remainingPaymentAmount > 0)
               {
   Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: Quedan {remainingPaymentAmount:C} después de cubrir todas las cuotas definidas. Esto se sumará al total_raised de la venta.");
      }
    } // ← Cierra el else block (lógica de distribución de cuotas)

   // --- Fin de la lógica MEJORADA para distribuir el pago ---

                // Actualizar el total_raised y total_debt de la venta
                sale.total_raised = (sale.total_raised ?? 0) + payment.amount.Value;
                sale.total_debt = (sale.total_debt ?? 0) - payment.amount.Value;

                // Asegurarse de que total_debt no sea negativo y redondear para precisión
                if (sale.total_debt < 0.01m) // Usar un pequeño umbral para considerar que es cero
                {
                    sale.total_debt = 0m; // Asegurar que sea exactamente cero
                }

                // ✅ ACTUALIZACIÓN: Cambiar el estado a "Escriturar" si la deuda es 0
                if (sale.total_debt == 0)
                {
                    sale.status = "Escriturar";
                }
                // Si la venta estaba en "Cancelled" y se realiza un pago, podría volver a "Active"
                else if (sale.status == "Cancelled" && sale.total_debt > 0)
                {
                    sale.status = "Active";
                }

                _context.Sales.Update(sale);
                await _context.SaveChangesAsync(); // Guardar los Details y la actualización de la venta

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en CreatePayment: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        /// <summary>
        /// ← NUEVO: Crea un pago desde un DTO, con soporte para PaymentDetails específicos
        /// Si PaymentDetails se proporciona, distribuye el pago SOLO a esas cuotas
        /// Si NO se proporciona, usa la distribución automática (modo heredado)
        /// </summary>
        public async Task<bool> CreatePaymentFromDTO(mym_softcom.DTOs.CreatePaymentDTO paymentDTO)
        {
            try
            {
                Console.WriteLine($"[PaymentServices] 📥 CreatePaymentFromDTO - Venta ID: {paymentDTO.Id_Sales}, Monto: {paymentDTO.Amount:C}");

                if (paymentDTO.Amount <= 0)
                {
                    throw new ArgumentException("El monto del pago debe ser un valor positivo.");
                }

                var sale = await _context.Sales
                    .Include(s => s.plan)
                    .FirstOrDefaultAsync(s => s.id_Sales == paymentDTO.Id_Sales);

                if (sale == null)
                {
                    throw new InvalidOperationException("La venta asociada no existe.");
                }

                // Crear el objeto Payment desde el DTO
                var payment = new Payment
                {
                    payment_date = paymentDTO.Payment_Date,
                    amount = paymentDTO.Amount,
                    payment_method = paymentDTO.Payment_Method,
                    id_Sales = paymentDTO.Id_Sales
                };

                // Guardar el pago primero para obtener su ID
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();

                Console.WriteLine($"[PaymentServices] ✅ Pago creado con ID: {payment.id_Payments}");

                // ← NUEVO: Si NO hay PaymentDetails especificados, usar distribución automática
                if (paymentDTO.PaymentDetails == null || paymentDTO.PaymentDetails.Count == 0)
                {
                    Console.WriteLine($"[PaymentServices] ℹ️  Sin PaymentDetails - usando distribución automática desde tabla quotas");
                    
                    // ✅ PREFERENCIA 1: Usar tabla quotas si existen
                    var quotasFromTable = await _context.Quotas
                        .Where(q => q.id_sale == paymentDTO.Id_Sales)
                        .OrderBy(q => q.quota_number)
                        .ToListAsync();

                    if (quotasFromTable != null && quotasFromTable.Count > 0)
                    {
                        Console.WriteLine($"[PaymentServices] ✅ Usando {quotasFromTable.Count} cuotas de la tabla quotas");
                        Console.WriteLine($"[PaymentServices] 📊 Todas las cuotas en tabla:");
                        foreach (var q in quotasFromTable)
                        {
                            Console.WriteLine($"   Cuota {q.quota_number}: status={q.status}, amount={q.amount}, current_amount={q.current_amount}");
                        }
                        
                        decimal remainingPaymentAmount = payment.amount.Value;

                        // Obtener los detalles de cuotas existentes para esta venta
                        var existingDetails = await _context.Details
                            .AsNoTracking()
                            .Where(pd => pd.id_Sales == paymentDTO.Id_Sales)
                            .ToListAsync();

                        // Calcular el monto cubierto por cada cuota hasta ahora
                        var coveredAmountsPerQuota = existingDetails
                            .GroupBy(pd => pd.number_quota)
                            .ToDictionary(g => g.Key, g => g.Sum(pd => pd.covered_amount ?? 0));

                        // ✅ LÓGICA SIMPLE: 
                        // SIN redistribución: SOLO por número de cuota (1,2,3,4...)
                        // CON redistribución: Pending primero, luego Vencida
                        bool hasRedistribution = sale.RedistributionAmount.HasValue && sale.RedistributionAmount.Value > 0;
                        
                        // ✅ CRÍTICO: Excluir SOLO "Pagada" (es decir, 100% cubierta)
                        // Mantener TODOS los demás status: Vencida, Pending, Abonado, Vencido Abonado, Distribuida
                        var filteredQuotas = quotasFromTable
                            .Where(q => q.status != "Pagada")  // ← Solo excluir completamente pagadas
                            .ToList();
                        
                        Console.WriteLine($"[PaymentServices] 🔍 Después de filtrar (status != Pagada): {filteredQuotas.Count} cuotas");
                        foreach (var q in filteredQuotas.Take(10))
                        {
                            Console.WriteLine($"   Cuota {q.quota_number}: status={q.status}, current_amount={q.current_amount}");
                        }
                        
                        var orderedQuotas = filteredQuotas
                            .OrderBy(q => {
                                if (hasRedistribution)
                                {
                                    // CON redistribución: Pending normal → Pending con redistribución → Vencida
                                    if (q.status == "Pending" && Math.Abs(q.current_amount - q.amount) < 0.01m)
                                        return 0;
                                    if (q.status == "Pending" && q.current_amount > q.amount)
                                        return 1;
                                    if (q.status == "Vencida")
                                        return 2;
                                    return 3;
                                }
                                else
                                {
                                    // SIN redistribución: SOLO POR NÚMERO DE CUOTA (1,2,3,4...)
                                    return 0;  // ← Todos tienen la misma prioridad, se ordena por número al final
                                }
                            })
                            .ThenBy(q => q.quota_number)  // ← SIEMPRE ordena por número de cuota
                            .ToList();

                        Console.WriteLine($"[PaymentServices] 📋 Venta {sale.id_Sales}: hasRedistribution={hasRedistribution}");
                        Console.WriteLine($"[PaymentServices] ✨ Orden final de distribución ({orderedQuotas.Count} cuotas):");
                        foreach (var q in orderedQuotas)
                        {
                            decimal currentCovered = coveredAmountsPerQuota.GetValueOrDefault(q.quota_number, 0);
                            Console.WriteLine($"   Cuota {q.quota_number}: status={q.status}, current_amount={q.current_amount}, ya_cubierto={currentCovered}, pendiente={q.current_amount - currentCovered}");
                        }

                        // Procesar cada cuota en orden
                        foreach (var quota in orderedQuotas)
                        {
                            if (remainingPaymentAmount <= 0) break;

                            decimal currentCovered = coveredAmountsPerQuota.GetValueOrDefault(quota.quota_number, 0);
                            // ✅ CLAVE: Usar current_amount (con redistribución) en lugar de amount
                            decimal remainingForThisQuota = quota.current_amount - currentCovered;

                            if (remainingForThisQuota > 0)
                            {
                                decimal amountToApplyToThisQuota = Math.Min(remainingPaymentAmount, remainingForThisQuota);

                                _context.Details.Add(new Detail
                                {
                                    id_Payments = payment.id_Payments,
                                    id_Sales = paymentDTO.Id_Sales,
                                    number_quota = quota.quota_number,
                                    covered_amount = amountToApplyToThisQuota
                                });

                                remainingPaymentAmount -= amountToApplyToThisQuota;
                                Console.WriteLine($"[PaymentServices] ✓ Cuota #{quota.quota_number}: Aplicado {amountToApplyToThisQuota:C} (current_amount={quota.current_amount:C}, cubierto={currentCovered:C}). Restante: {remainingPaymentAmount:C}");
                            }
                            else
                            {
                                // ← NUEVO: Log de cuotas saltadas
                                Console.WriteLine($"[PaymentServices] ⏭️  Cuota #{quota.quota_number} SALTADA: remaining={remainingForThisQuota:C} (current_amount={quota.current_amount:C}, ya_cubierto={currentCovered:C})");
                            }
                        }

                        if (remainingPaymentAmount > 0)
                        {
                            Console.WriteLine($"[PaymentServices] ⚠️  Quedan {remainingPaymentAmount:C} después de cubrir todas las cuotas. Posible sobrepago.");
                        }

                        await _context.SaveChangesAsync();
                        
                        // ✅ NUEVO: Recalcular status de todas las cuotas
                        await _saleServices.RecalculateQuotaStatusAsync(paymentDTO.Id_Sales);
                    }
                    else
                    {
                        Console.WriteLine($"[PaymentServices] ⚠️  No hay cuotas en tabla, usando lógica heredada (CustomQuotasJson)");
                        
                        // ✅ FALLBACK: Si no hay quotas tabla, usar lógica antigua
                        decimal remainingPaymentAmount = payment.amount.Value;
                        decimal baseQuotaValue = sale.quota_value ?? 0;
                        int totalQuotas = sale.plan?.number_quotas ?? 0;

                        // Cargar cuotas personalizadas si el tipo de plan es "custom"
                        Dictionary<int, (decimal Amount, DateTime? DueDate)> customQuotaData = null;
                        if (sale.PaymentPlanType?.ToLower() == "custom" && !string.IsNullOrEmpty(sale.CustomQuotasJson))
                        {
                            try
                            {
                                var customQuotas = JsonSerializer.Deserialize<List<CustomQuota>>(sale.CustomQuotasJson);
                                if (customQuotas != null && customQuotas.Count > 0)
                                {
                                    customQuotaData = customQuotas.ToDictionary(
                                        q => q.QuotaNumber,
                                        q => (q.Amount, q.DueDate)
                                    );
                                    totalQuotas = customQuotas.Count;
                                    Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: Plan personalizado con {totalQuotas} cuotas detectado.");
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[PaymentServices] Error deserializando cuotas personalizadas: {ex.Message}");
                            }
                        }

                        if ((customQuotaData == null && baseQuotaValue <= 0) || totalQuotas <= 0)
                        {
                            Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: Valor de cuota o número de cuotas inválido.");
                        }
                        else
                        {
                            // Obtener detalles existentes
                            var existingDetails = await _context.Details
                                .AsNoTracking()
                                .Where(pd => pd.id_Sales == paymentDTO.Id_Sales)
                                .ToListAsync();

                            var coveredAmountsPerQuota = existingDetails
                                .GroupBy(pd => pd.number_quota)
                                .ToDictionary(g => g.Key, g => g.Sum(pd => pd.covered_amount ?? 0));

                            var adjustedQuotaValues = new Dictionary<int, decimal>();
                            if (customQuotaData != null)
                            {
                                foreach (var kvp in customQuotaData)
                                {
                                    adjustedQuotaValues[kvp.Key] = kvp.Value.Amount;
                                }
                            }
                            else
                            {
                                for (int i = 1; i <= totalQuotas; i++)
                                {
                                    adjustedQuotaValues[i] = baseQuotaValue;
                                }
                            }

                            var sortedQuotas = adjustedQuotaValues.OrderBy(kvp => kvp.Key).ToList();
                            foreach (var quotaKvp in sortedQuotas)
                            {
                                if (remainingPaymentAmount <= 0) break;

                                int quotaNumber = quotaKvp.Key;
                                decimal quotaValue = quotaKvp.Value;
                                decimal currentCovered = coveredAmountsPerQuota.GetValueOrDefault(quotaNumber, 0);
                                decimal remainingForThisQuota = quotaValue - currentCovered;

                                if (remainingForThisQuota > 0)
                                {
                                    decimal amountToApplyToThisQuota = Math.Min(remainingPaymentAmount, remainingForThisQuota);
                                    _context.Details.Add(new Detail
                                    {
                                        id_Payments = payment.id_Payments,
                                        id_Sales = paymentDTO.Id_Sales,
                                        number_quota = quotaNumber,
                                        covered_amount = amountToApplyToThisQuota
                                    });
                                    remainingPaymentAmount -= amountToApplyToThisQuota;
                                }
                            }
                        }
                    }
                }
                else
                {
                    // ← NUEVO: Distribuir SOLO a las cuotas especificadas en PaymentDetails
                    Console.WriteLine($"[PaymentServices] 📌 Distribuyendo a {paymentDTO.PaymentDetails.Count} cuota(s) específica(s)");
                    
                    decimal totalDistributed = 0;
                    
                    foreach (var detail in paymentDTO.PaymentDetails)
                    {
                        if (detail.Covered_Amount <= 0)
                        {
                            throw new ArgumentException($"El monto para la cuota #{detail.Number_Quota} debe ser positivo.");
                        }

                        _context.Details.Add(new Detail
                        {
                            id_Payments = payment.id_Payments,
                            id_Sales = payment.id_Sales,
                            number_quota = detail.Number_Quota,
                            covered_amount = detail.Covered_Amount
                        });

                        totalDistributed += detail.Covered_Amount;
                        Console.WriteLine($"[PaymentServices]   ✓ Cuota #{detail.Number_Quota}: ${detail.Covered_Amount:F2}");
                    }

                    // Validar que la suma de los detalles no exceda el monto del pago
                    if (totalDistributed > payment.amount.Value + 1) // Permitir 1 peso de tolerancia de redondeo
                    {
                        throw new ArgumentException($"La suma de PaymentDetails (${totalDistributed:F2}) no puede exceder el monto del pago (${payment.amount.Value:F2}).");
                    }

                    // Si hay diferencia (por redondeo), se trata como pago adelantado
                    if (totalDistributed < payment.amount.Value)
                    {
                        decimal difference = payment.amount.Value - totalDistributed;
                        Console.WriteLine($"[PaymentServices] ℹ️  Diferencia de ${difference:F2} se suma al total_raised como adelanto");
                    }

                    await _context.SaveChangesAsync();
                    
                    // ✅ NUEVO: Recalcular status de todas las cuotas
                    await _saleServices.RecalculateQuotaStatusAsync(paymentDTO.Id_Sales);
                }

                // Actualizar los totales de la venta (mismo código para ambos casos)
                sale.total_raised = (sale.total_raised ?? 0) + payment.amount.Value;
                sale.total_debt = (sale.total_debt ?? 0) - payment.amount.Value;

                if (sale.total_debt < 0.01m)
                {
                    sale.total_debt = 0m;
                }

                if (sale.total_debt == 0)
                {
                    sale.status = "Escriturar";
                    Console.WriteLine($"[PaymentServices] ✅ Venta ID {sale.id_Sales} completamente pagada - estado = Escriturar");
                }
                else if (sale.status == "Cancelled" && sale.total_debt > 0)
                {
                    sale.status = "Active";
                }

                _context.Sales.Update(sale);
                await _context.SaveChangesAsync();

                // ✅ NUEVO: Recalcular status de quotas para que se sincronice con pagos
                Console.WriteLine($"[PaymentServices] 🔄 Recalculando status de quotas...");
                await _saleServices.RecalculateQuotaStatusAsync(paymentDTO.Id_Sales);

                Console.WriteLine($"[PaymentServices] ✅ Pago procesado exitosamente. Total recaudado: ${sale.total_raised:C}, Deuda: ${sale.total_debt:C}");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PaymentServices] ❌ Error en CreatePaymentFromDTO: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[PaymentServices] Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        /// <summary>
        /// ✅ NUEVA: Distribuye un pago usando TABLA QUOTAS con lógica condicional
        /// - SIN redistribución: Cubre Vencida PRIMERO (normal)
        /// - CON redistribución: Cubre Pending PRIMERO
        /// </summary>
        private async Task DistributePaymentToQuotas(Payment payment, Sale sale)
        {
            try
            {
                Console.WriteLine($"[DistributePaymentToQuotas] 📋 Distribuyendo pago ${payment.amount:C} a venta {sale.id_Sales}");

                decimal remainingPaymentAmount = payment.amount.Value;

                // ✅ Cargar cuotas desde tabla
                var quotasFromTable = await _context.Quotas
                    .Where(q => q.id_sale == sale.id_Sales)
                    .OrderBy(q => q.quota_number)
                    .ToListAsync();

                if (quotasFromTable == null || quotasFromTable.Count == 0)
                {
                    Console.WriteLine($"[DistributePaymentToQuotas] ⚠️  No hay cuotas en tabla para venta {sale.id_Sales}");
                    return;
                }

                // Obtener detalles existentes
                var existingDetails = await _context.Details
                    .AsNoTracking()
                    .Where(pd => pd.id_Sales == sale.id_Sales)
                    .ToListAsync();

                var coveredAmountsPerQuota = existingDetails
                    .GroupBy(pd => pd.number_quota)
                    .ToDictionary(g => g.Key, g => g.Sum(pd => pd.covered_amount ?? 0));

                // ✅ LÓGICA CONDICIONAL: Si hay redistribución → Pending primero. Si no → Vencida primero (pero priorizar parcialmente pagadas)
                bool hasRedistribution = sale.RedistributionAmount.HasValue && sale.RedistributionAmount.Value > 0;
                
                var orderedQuotas = quotasFromTable
                    .Where(q => q.status != "Pagada" && q.status != "Distribuida")
                    .OrderBy(q => {
                        bool hasRedistribution = sale.RedistributionAmount.HasValue && sale.RedistributionAmount.Value > 0;
                        if (hasRedistribution)
                        {
                            if (q.status == "Pending" && Math.Abs(q.current_amount - q.amount) < 0.01m) return 0;
                            if (q.status == "Pending" && q.current_amount > q.amount) return 1;
                            if (q.status == "Vencida") return 2;
                            return 3;
                        }
                        else
                        {
                            return 0;  // SIN redistribución: SOLO ordenar por número de cuota
                        }
                    })
                    .ThenBy(q => q.quota_number)
                    .ToList();

                Console.WriteLine($"[DistributePaymentToQuotas] 🎯 hasRedistribution={hasRedistribution}");
                foreach (var q in orderedQuotas.Take(5))
                {
                    Console.WriteLine($"   Cuota {q.quota_number}: status={q.status}, amount={q.amount}, current={q.current_amount}");
                }

                // Distribuir el pago
                foreach (var quota in orderedQuotas)
                {
                    if (remainingPaymentAmount <= 0) break;

                    decimal currentCovered = coveredAmountsPerQuota.GetValueOrDefault(quota.quota_number, 0);
                    decimal remainingForThisQuota = quota.current_amount - currentCovered;

                    if (remainingForThisQuota > 0)
                    {
                        decimal amountToApplyToThisQuota = Math.Min(remainingPaymentAmount, remainingForThisQuota);

                        _context.Details.Add(new Detail
                        {
                            id_Payments = payment.id_Payments,
                            id_Sales = sale.id_Sales,
                            number_quota = quota.quota_number,
                            covered_amount = amountToApplyToThisQuota
                        });

                        remainingPaymentAmount -= amountToApplyToThisQuota;
                        Console.WriteLine($"[DistributePaymentToQuotas] ✓ Cuota {quota.quota_number} ({quota.status}): ${amountToApplyToThisQuota:C}");
                    }
                }

                await _context.SaveChangesAsync();
                Console.WriteLine($"[DistributePaymentToQuotas] ✅ Distribución completada");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DistributePaymentToQuotas] ❌ Error: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// ← NUEVO: Actualiza un pago desde DTO, respeta KeepOriginalQuotas
        /// Si KeepOriginalQuotas=true: Solo actualiza Amount, Payment_Date, Payment_Method
        /// Si KeepOriginalQuotas=false: Redistribuye el pago a todas las cuotas (inteligente)
        /// </summary>
        public async Task<bool> UpdatePaymentFromDTO(int id_Payments, mym_softcom.DTOs.CreatePaymentDTO paymentDTO)
        {
            try
            {
                Console.WriteLine($"[PaymentServices] 📝 UpdatePaymentFromDTO - Pago ID: {id_Payments}, KeepOriginalQuotas: {paymentDTO.KeepOriginalQuotas}");

                var existingPayment = await _context.Payments.FirstOrDefaultAsync(p => p.id_Payments == id_Payments);
                if (existingPayment == null)
                {
                    throw new InvalidOperationException("Pago no encontrado.");
                }

                var sale = await _context.Sales
                    .Include(s => s.plan)
                    .FirstOrDefaultAsync(s => s.id_Sales == paymentDTO.Id_Sales);

                if (sale == null)
                {
                    throw new InvalidOperationException("La venta asociada no existe.");
                }

                // Revertir el pago anterior
                sale.total_raised = (sale.total_raised ?? 0) - (existingPayment.amount ?? 0);
                sale.total_debt = (sale.total_debt ?? 0) + (existingPayment.amount ?? 0);
                if (sale.total_raised < 0) sale.total_raised = 0;

                // ← NUEVO: Si KeepOriginalQuotas=true, no eliminar los Details originales
                if (!paymentDTO.KeepOriginalQuotas)
                {
                    // Eliminar Details antiguos para recrearlos
                    var oldDetails = await _context.Details
                        .Where(pd => pd.id_Payments == existingPayment.id_Payments)
                        .ToListAsync();
                    _context.Details.RemoveRange(oldDetails);
                    Console.WriteLine($"[PaymentServices]   Eliminados {oldDetails.Count} Details antiguos");
                }
                else
                {
                    Console.WriteLine($"[PaymentServices]   Preservando Details originales (KeepOriginalQuotas=true)");
                }

                // Actualizar datos del pago
                existingPayment.amount = paymentDTO.Amount;
                existingPayment.payment_date = paymentDTO.Payment_Date;
                existingPayment.payment_method = paymentDTO.Payment_Method;

                // Aplicar nuevo monto
                sale.total_raised = (sale.total_raised ?? 0) + paymentDTO.Amount;
                sale.total_debt = (sale.total_debt ?? 0) - paymentDTO.Amount;

                if (sale.total_debt < 0.01m) sale.total_debt = 0m;

                // ← NUEVO: Si NO hay KeepOriginalQuotas, redistributir el pago
                if (!paymentDTO.KeepOriginalQuotas && (paymentDTO.PaymentDetails == null || paymentDTO.PaymentDetails.Count == 0))
                {
                    Console.WriteLine($"[PaymentServices]   Redistribuyendo pago inteligentemente (lógica new)");
                    await DistributePaymentToQuotas(existingPayment, sale);
                }
                else if (paymentDTO.PaymentDetails != null && paymentDTO.PaymentDetails.Count > 0)
                {
                    // Si se especifican Details, usar esos
                    Console.WriteLine($"[PaymentServices]   Usando PaymentDetails especificados");
                    foreach (var detail in paymentDTO.PaymentDetails)
                    {
                        _context.Details.Add(new Detail
                        {
                            id_Payments = existingPayment.id_Payments,
                            id_Sales = paymentDTO.Id_Sales,
                            number_quota = detail.Number_Quota,
                            covered_amount = detail.Covered_Amount
                        });
                    }
                    await _context.SaveChangesAsync();
                }

                // Actualizar estado de venta
                if (sale.total_debt == 0)
                {
                    sale.status = "Escriturar";
                    Console.WriteLine($"[PaymentServices]   Venta completamente pagada");
                }
                else if (sale.status == "Cancelled" && sale.total_debt > 0)
                {
                    sale.status = "Active";
                }

                _context.Payments.Update(existingPayment);
                _context.Sales.Update(sale);
                await _context.SaveChangesAsync();

                // ✅ NUEVO: Recalcular status de todas las cuotas después de actualizar pago
                await _saleServices.RecalculateQuotaStatusAsync(paymentDTO.Id_Sales);

                Console.WriteLine($"[PaymentServices] ✅ Pago actualizado. Total recaudado: ${sale.total_raised:C}, Deuda: ${sale.total_debt:C}");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PaymentServices] ❌ Error en UpdatePaymentFromDTO: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[PaymentServices] Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        /// <summary>
        /// ✅ NUEVO: Actualiza un pago con lógica inteligente para evitar duplicados
        /// - Si monto es igual: solo actualiza fecha/método (mantiene Details)
        /// - Si monto cambia: recalcula Details con transacción segura
        /// </summary>
        public async Task<bool> UpdatePayment(int id_Payments, Payment updatedPayment)
        {
            // Usar transacción para evitar duplicados
            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    var existingPayment = await _context.Payments.FirstOrDefaultAsync(p => p.id_Payments == id_Payments);
                    if (existingPayment == null) 
                    {
                        await transaction.RollbackAsync();
                        return false;
                    }

                    if (id_Payments != updatedPayment.id_Payments)
                        throw new ArgumentException("El ID del pago en la URL no coincide con el ID del pago en el cuerpo de la solicitud.");

                    if (!updatedPayment.amount.HasValue || updatedPayment.amount.Value <= 0)
                    {
                        throw new ArgumentException("El monto del pago debe ser un valor positivo.");
                    }

                    var oldSale = await _context.Sales
                        .Include(s => s.plan)
                        .FirstOrDefaultAsync(s => s.id_Sales == existingPayment.id_Sales);
                    var newSale = await _context.Sales
                        .Include(s => s.plan)
                        .FirstOrDefaultAsync(s => s.id_Sales == updatedPayment.id_Sales);

                    if (oldSale == null || newSale == null)
                    {
                        throw new InvalidOperationException("La venta asociada al pago original o al pago actualizado no existe.");
                    }

                    // ✅ LÓGICA INTELIGENTE: Detectar tipo de cambio
                    bool amountChanged = Math.Abs((existingPayment.amount ?? 0) - (updatedPayment.amount ?? 0)) > 0.01m;
                    bool saleChanged = existingPayment.id_Sales != updatedPayment.id_Sales;

                    Console.WriteLine($"[UpdatePayment] 📝 Pago {id_Payments}: amountChanged={amountChanged}, saleChanged={saleChanged}");

                    if (!amountChanged && !saleChanged)
                    {
                        // ✅ CASO 1: Solo cambió fecha/método → NO tocar Details
                        Console.WriteLine($"[UpdatePayment] ✓ Solo actualizar fecha/método (mantener Details)");
                        
                        existingPayment.payment_date = updatedPayment.payment_date;
                        existingPayment.payment_method = updatedPayment.payment_method;
                        _context.Payments.Update(existingPayment);
                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();
                        return true;
                    }

                    // ✅ CASO 2: Cambió monto o venta → Recalcular con cuidado
                    Console.WriteLine($"[UpdatePayment] ⚠️  Monto/Venta cambió - recalculando Details");

                    // Revertir impacto del pago anterior en la venta anterior
                    oldSale.total_raised = (oldSale.total_raised ?? 0) - (existingPayment.amount ?? 0);
                    oldSale.total_debt = (oldSale.total_debt ?? 0) + (existingPayment.amount ?? 0);
                    if (oldSale.total_raised < 0) oldSale.total_raised = 0;

                    // ✅ IMPORTANTE: Eliminar Details del pago ANTERIOR
                    var oldDetails = await _context.Details
                        .Where(pd => pd.id_Payments == existingPayment.id_Payments)
                        .ToListAsync();
                    _context.Details.RemoveRange(oldDetails);
                    Console.WriteLine($"[UpdatePayment] 🗑️  Eliminados {oldDetails.Count} Details anteriores");

                    if (oldSale.status == "Escriturar" && oldSale.total_debt > 0) 
                        oldSale.status = "Active";

                    // Aplicar el nuevo monto a la venta (nueva o misma)
                    newSale.total_raised = (newSale.total_raised ?? 0) + updatedPayment.amount.Value;
                    newSale.total_debt = (newSale.total_debt ?? 0) - updatedPayment.amount.Value;

                    if (newSale.total_debt < 0.01m)
                        newSale.total_debt = 0m;

                    // Actualizar el pago con nuevos valores
                    existingPayment.payment_date = updatedPayment.payment_date;
                    existingPayment.payment_method = updatedPayment.payment_method;
                    existingPayment.amount = updatedPayment.amount;
                    existingPayment.id_Sales = updatedPayment.id_Sales;

                    // ✅ Guardar cambios de Payment y Sales antes de crear nuevos Details
                    _context.Payments.Update(existingPayment);
                    _context.Sales.Update(oldSale);
                    _context.Sales.Update(newSale);
                    await _context.SaveChangesAsync();

                    // ✅ Ahora recalcular y crear nuevos Details
                    await CreatePaymentDetailsForUpdate(existingPayment, newSale);

                    // Actualizar estado si está completado
                    if (newSale.total_debt == 0)
                    {
                        newSale.status = "Escriturar";
                    }

                    _context.Sales.Update(newSale);
                    await _context.SaveChangesAsync();

                    // ✅ Recalcular status de quotas
                    await _saleServices.RecalculateQuotaStatusAsync(newSale.id_Sales);
                    if (oldSale.id_Sales != newSale.id_Sales)
                    {
                        await _saleServices.RecalculateQuotaStatusAsync(oldSale.id_Sales);
                    }

                    await transaction.CommitAsync();
                    Console.WriteLine($"[UpdatePayment] ✅ Pago {id_Payments} actualizado exitosamente");
                    return true;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    Console.WriteLine($"[UpdatePayment] ❌ Error: {ex.Message}");
                    Console.WriteLine($"[UpdatePayment] Stack: {ex.StackTrace}");
                    throw;
                }
            }
        }

        /// <summary>
        /// ✅ Helper: Crear Details para actualización de pago (misma lógica que CreatePaymentFromDTO)
        /// </summary>
        private async Task CreatePaymentDetailsForUpdate(Payment payment, Sale sale)
        {
            try
            {
                Console.WriteLine($"[CreatePaymentDetailsForUpdate] 📋 Creando Details para pago {payment.id_Payments}");

                // Usar tabla quotas
                var quotasFromTable = await _context.Quotas
                    .Where(q => q.id_sale == sale.id_Sales)
                    .OrderBy(q => q.quota_number)
                    .ToListAsync();

                if (quotasFromTable != null && quotasFromTable.Count > 0)
                {
                    decimal remainingPaymentAmount = payment.amount.Value;

                    var existingDetails = await _context.Details
                        .AsNoTracking()
                        .Where(pd => pd.id_Sales == sale.id_Sales && pd.id_Payments != payment.id_Payments)
                        .ToListAsync();

                    var coveredAmountsPerQuota = existingDetails
                        .GroupBy(pd => pd.number_quota)
                        .ToDictionary(g => g.Key, g => g.Sum(pd => pd.covered_amount ?? 0));

                    // ✅ LÓGICA CONDICIONAL: Si hay redistribución → Pending primero. Si no → Vencida primero (pero priorizar parcialmente pagadas)
                    bool hasRedistribution = sale.RedistributionAmount.HasValue && sale.RedistributionAmount.Value > 0;
                    
                    var orderedQuotas = quotasFromTable
                        .Where(q => q.status != "Pagada" && q.status != "Distribuida")
                        .OrderBy(q => {
                            if (hasRedistribution)
                            {
                                if (q.status == "Pending" && Math.Abs(q.current_amount - q.amount) < 0.01m) return 0;
                                if (q.status == "Pending" && q.current_amount > q.amount) return 1;
                                if (q.status == "Vencida") return 2;
                                return 3;
                            }
                            else
                            {
                                return 0;  // SIN redistribución: SOLO ordenar por número de cuota
                            }
                        })
                        .ThenBy(q => q.quota_number)
                        .ToList();

                    Console.WriteLine($"[CreatePaymentDetailsForUpdate] 📋 Sale {sale.id_Sales}: hasRedistribution={hasRedistribution}, Orden de cuotas:");
                    foreach (var q in orderedQuotas)
                    {
                        decimal currentCovered = coveredAmountsPerQuota.GetValueOrDefault(q.quota_number, 0);
                        Console.WriteLine($"   Cuota {q.quota_number}: status={q.status}, amount={q.amount}, current={q.current_amount}, covered={currentCovered}");
                    }

                    foreach (var quota in orderedQuotas)
                    {
                        if (remainingPaymentAmount <= 0) break;

                        decimal currentCovered = coveredAmountsPerQuota.GetValueOrDefault(quota.quota_number, 0);
                        decimal remainingForThisQuota = quota.current_amount - currentCovered;

                        if (remainingForThisQuota > 0)
                        {
                            decimal amountToApplyToThisQuota = Math.Min(remainingPaymentAmount, remainingForThisQuota);

                            _context.Details.Add(new Detail
                            {
                                id_Payments = payment.id_Payments,
                                id_Sales = sale.id_Sales,
                                number_quota = quota.quota_number,
                                covered_amount = amountToApplyToThisQuota
                            });

                            remainingPaymentAmount -= amountToApplyToThisQuota;
                            Console.WriteLine($"[CreatePaymentDetailsForUpdate] ✓ Cuota {quota.quota_number}: ${amountToApplyToThisQuota:C}");
                        }
                    }

                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CreatePaymentDetailsForUpdate] ❌ Error: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Elimina un pago y revierte el recaudo total y la deuda de la venta asociada.
        /// También elimina los detalles de cuotas (PaymentDetail) asociados a este pago.
        /// </summary>
        public async Task<bool> DeletePayment(int id_Payments)
        {
            try
            {
                var payment = await _context.Payments.FirstOrDefaultAsync(p => p.id_Payments == id_Payments);
                if (payment == null) return false;

                var sale = await _context.Sales
                                .Include(s => s.plan) // Necesitamos el plan para el valor de la cuota
                                .FirstOrDefaultAsync(s => s.id_Sales == payment.id_Sales);
                if (sale == null)
                {
                    throw new InvalidOperationException("La venta asociada al pago no existe.");
                }

                // Eliminar los Details asociados a este pago
                var DetailsToDelete = await _context.Details
                    .Where(pd => pd.id_Payments == id_Payments)
                    .ToListAsync();
                _context.Details.RemoveRange(DetailsToDelete);

                // Marcar el pago para eliminación
                _context.Payments.Remove(payment);
                // No guardar cambios aún, para que la siguiente consulta no incluya el pago eliminado

                // ✅ INICIO DE LA CORRECCIÓN: Recalcular total_raised y total_debt de la venta
                // Sumar todos los pagos restantes para esta venta
                var remainingPaymentsTotal = await _context.Payments
                    .Where(p => p.id_Sales == sale.id_Sales && p.id_Payments != id_Payments) // Excluir el pago que se está eliminando
                    .SumAsync(p => p.amount ?? 0);

                sale.total_raised = remainingPaymentsTotal;
                sale.total_debt = (sale.total_value ?? 0) - (sale.total_raised ?? 0);

                if (sale.total_raised < 0)
                {
                    sale.total_raised = 0;
                }

                // ✅ ACTUALIZACIÓN: Actualizar el estado de la venta si ya no está "Escriturar"
                if (sale.status == "Escriturar" && sale.total_debt > 0)
                {
                    sale.status = "Active";
                }

                _context.Sales.Update(sale); // Marcar la venta para actualización
                await _context.SaveChangesAsync(); // Guardar todos los cambios (eliminación de pago, detalles y actualización de venta)

                // ✅ NUEVO: Recalcular status de todas las cuotas después de eliminar pago
                await _saleServices.RecalculateQuotaStatusAsync(sale.id_Sales);

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en DeletePayment: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }
    }
}
