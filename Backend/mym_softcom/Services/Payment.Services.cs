using mym_softcom.Models;
using mym_softcom;
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
            return await _context.Payments
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.client) // Incluir cliente de la venta
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.lot)    // Incluir lote de la venta
                                 .ThenInclude(l => l.project) // Incluir proyecto del lote
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.plan)   // Incluir plan de la venta
                                 .ToListAsync();
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

            if (!string.IsNullOrEmpty(sale.RedistributedQuotaNumbers))
    {
           try
      {
      redistributedQuotaNumbers = JsonSerializer.Deserialize<List<int>>(sale.RedistributedQuotaNumbers) ?? new List<int>();
  }
         catch (Exception ex)
             {
  Console.WriteLine($"[PaymentServices] Error deserializando cuotas redistribuidas: {ex.Message}");
      }
       }

     // Obtener los detalles de cuotas existentes para esta venta
      var existingDetails = await _context.Details
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

         // Saltar cuotas que fueron redistribuidas
              if (redistributedQuotaNumbers.Contains(quotaNumber))
              {
   Console.WriteLine($"[PaymentServices] Venta ID {sale.id_Sales}: Saltando cuota #{quotaNumber} (redistribuida)");
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
   }
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
        /// Actualiza un pago existente y ajusta el recaudo total y la deuda de la venta asociada.
        /// También actualiza los detalles de cuotas (PaymentDetail) si el monto o la venta cambian.
        /// </summary>
        public async Task<bool> UpdatePayment(int id_Payments, Payment updatedPayment)
        {
            try
            {
                var existingPayment = await _context.Payments.FirstOrDefaultAsync(p => p.id_Payments == id_Payments);
                if (existingPayment == null) return false;

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

                // Revertir el impacto del pago original en la venta original
                oldSale.total_raised = (oldSale.total_raised ?? 0) - (existingPayment.amount ?? 0);
                oldSale.total_debt = (oldSale.total_debt ?? 0) + (existingPayment.amount ?? 0);
                if (oldSale.total_raised < 0) oldSale.total_raised = 0;

                // Revertir los Details asociados al pago original
                var oldDetails = await _context.Details
                    .Where(pd => pd.id_Payments == existingPayment.id_Payments)
                    .ToListAsync();
                _context.Details.RemoveRange(oldDetails);

                // ✅ ACTUALIZACIÓN: Revertir estado si se completó y ahora tiene deuda
                if (oldSale.status == "Escriturar" && oldSale.total_debt > 0) oldSale.status = "Active";

                // Aplicar el nuevo monto del pago a la venta (puede ser la misma o una nueva)
                newSale.total_raised = (newSale.total_raised ?? 0) + updatedPayment.amount.Value;
                newSale.total_debt = (newSale.total_debt ?? 0) - updatedPayment.amount.Value;

                // Asegurarse de que total_debt no sea negativo y redondear para precisión
                if (newSale.total_debt < 0.01m) // Usar un pequeño umbral para considerar que es cero
                {
                    newSale.total_debt = 0m; // Asegurar que sea exactamente cero
                }
                else if (newSale.total_debt < 0) // Si es negativo después del umbral, forzar a cero
                {
                    newSale.total_debt = 0m;
                }

                // --- Lógica MEJORADA para distribuir el pago ACTUALIZADO en PaymentDetail ---
                decimal remainingPaymentAmount = updatedPayment.amount.Value;
                decimal baseQuotaValue = newSale.quota_value ?? 0;
                int totalQuotas = newSale.plan?.number_quotas ?? 0;

                // ✅ CORRECCIÓN: Cargar cuotas personalizadas si el tipo de plan es "custom"
                Dictionary<int, (decimal Amount, DateTime? DueDate)> customQuotaData = null;
                if (newSale.PaymentPlanType?.ToLower() == "custom" && !string.IsNullOrEmpty(newSale.CustomQuotasJson))
                {
                    try
                    {
                        var customQuotas = JsonSerializer.Deserialize<List<CustomQuota>>(newSale.CustomQuotasJson);
                        if (customQuotas != null && customQuotas.Count > 0)
                        {
                            customQuotaData = customQuotas.ToDictionary(
                                q => q.QuotaNumber,
                                q => (q.Amount, q.DueDate)
                            );
                            totalQuotas = customQuotas.Count;
                            Console.WriteLine($"[PaymentServices] UpdatePayment - Venta ID {newSale.id_Sales}: Plan personalizado con {totalQuotas} cuotas detectado.");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[PaymentServices] UpdatePayment - Error deserializando cuotas personalizadas: {ex.Message}");
                    }
                }

                if ((customQuotaData == null && baseQuotaValue <= 0) || totalQuotas <= 0)
                {
                    Console.WriteLine($"[PaymentServices] UpdatePayment - Venta ID {newSale.id_Sales}: Valor de cuota o número de cuotas inválido. No se crearán Details.");
                }
                else
                {
                    decimal redistributionAmount = newSale.RedistributionAmount ?? 0;
                    string redistributionType = newSale.RedistributionType;
                    List<int> redistributedQuotaNumbers = new List<int>();

                    if (!string.IsNullOrEmpty(newSale.RedistributedQuotaNumbers))
                    {
                        try
                        {
                            redistributedQuotaNumbers = JsonSerializer.Deserialize<List<int>>(newSale.RedistributedQuotaNumbers) ?? new List<int>();
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[PaymentServices] UpdatePayment - Error deserializando cuotas redistribuidas: {ex.Message}");
                        }
                    }

                    // Obtener los detalles de cuotas existentes para esta VENTA (excluyendo los que acabamos de revertir)
                    var currentSaleDetails = await _context.Details
                        .Where(pd => pd.id_Sales == newSale.id_Sales && pd.id_Payments != updatedPayment.id_Payments)
                        .ToListAsync();

                    var coveredAmountsPerQuota = currentSaleDetails
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
                        Console.WriteLine($"[PaymentServices] UpdatePayment - Venta ID {newSale.id_Sales}: Usando valores de cuotas personalizadas.");
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

                    for (int i = 1; i <= totalQuotas && remainingPaymentAmount > 0; i++)
                    {
                        // Saltar cuotas redistribuidas
                        if (redistributedQuotaNumbers.Contains(i))
                        {
                            continue;
                        }

                        decimal quotaValue = adjustedQuotaValues[i];
                        decimal currentCovered = coveredAmountsPerQuota.GetValueOrDefault(i, 0);
                        decimal remainingForThisQuota = quotaValue - currentCovered;

                        if (remainingForThisQuota > 0)
                        {
                            decimal amountToApplyToThisQuota = Math.Min(remainingPaymentAmount, remainingForThisQuota);

                            _context.Details.Add(new Detail
                            {
                                id_Payments = updatedPayment.id_Payments,
                                id_Sales = newSale.id_Sales,
                                number_quota = i,
                                covered_amount = amountToApplyToThisQuota
                            });

                            remainingPaymentAmount -= amountToApplyToThisQuota;
                        }
                    }
                }
                // --- Fin de la lógica MEJORADA para distribuir el pago ACTUALIZADO ---

                // ✅ ACTUALIZACIÓN: Actualizar estado si se completa
                if (newSale.total_debt == 0) newSale.status = "Escriturar";
                else if (newSale.status == "Cancelled" && newSale.total_debt > 0) newSale.status = "Active";

                existingPayment.amount = updatedPayment.amount;
                existingPayment.payment_date = updatedPayment.payment_date;
                existingPayment.payment_method = updatedPayment.payment_method;
                existingPayment.id_Sales = updatedPayment.id_Sales;
                _context.Entry(existingPayment).State = EntityState.Modified;

                _context.Sales.Update(oldSale);
                if (oldSale.id_Sales != newSale.id_Sales)
                {
                    _context.Sales.Update(newSale);
                }

                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en UpdatePayment: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
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
