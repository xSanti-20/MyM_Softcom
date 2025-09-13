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
    public class SaleServices
    {
        private readonly AppDbContext _context;
        private readonly PlanServices _planServices;
        private readonly LotServices _lotServices;

        public SaleServices(AppDbContext context, PlanServices planServices, LotServices lotServices)
        {
            _context = context;
            _planServices = planServices;
            _lotServices = lotServices;
        }

        /// <summary>
        /// Obtiene todas las ventas, incluyendo sus relaciones.
        /// </summary>
        public async Task<IEnumerable<Sale>> GetAllSales()
        {
            return await _context.Sales
                                 .Include(s => s.client)
                                 .Include(s => s.lot)
                                 .ThenInclude(l =>  l.project)
                                 .Include(s => s.user)
                                 .Include(s => s.plan)
                                 .ToListAsync();
        }

        /// <summary>
        /// Obtiene una venta específica por su ID, incluyendo sus relaciones.
        /// Calcula dinámicamente OriginalQuotaValue y NewQuotaValue si hay redistribución y los guarda en la BD.
        /// </summary>
        public async Task<Sale?> GetSaleById(int id_Sales)
        {
            Console.WriteLine($"[SaleServices] Buscando venta con id_Sales: {id_Sales}");
            var sale = await _context.Sales
                                 .Include(s => s.client)
                                 .Include(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(s => s.user)
                                 .Include(s => s.plan)
                                 .FirstOrDefaultAsync(s => s.id_Sales == id_Sales);

            if (sale != null)
            {
                bool needsUpdate = false;

                // Set OriginalQuotaValue if not already set
                if (sale.OriginalQuotaValue == null)
                {
                    sale.OriginalQuotaValue = sale.quota_value;
                    needsUpdate = true;
                }

                Console.WriteLine($"[SaleServices] Initial values for sale {id_Sales}:");
                Console.WriteLine($"  - quota_value: {sale.quota_value:C}");
                Console.WriteLine($"  - OriginalQuotaValue: {sale.OriginalQuotaValue:C}");
                Console.WriteLine($"  - RedistributedQuotaNumbers: {sale.RedistributedQuotaNumbers ?? "null"}");
                Console.WriteLine($"  - RedistributionAmount: {sale.RedistributionAmount?.ToString("C") ?? "null"}");

                if (!string.IsNullOrEmpty(sale.RedistributedQuotaNumbers))
                {
                    try
                    {
                        var redistributedQuotaNumbers = JsonSerializer.Deserialize<List<int>>(sale.RedistributedQuotaNumbers);
                        var totalOverdueAmount = sale.RedistributionAmount ?? 0;

                        // Calculate NewQuotaValue for remaining quotas
                        if (sale.plan?.number_quotas > 0 && redistributedQuotaNumbers?.Count > 0)
                        {
                            var totalQuotas = sale.plan.number_quotas.Value;
                            var redistributedQuotasCount = redistributedQuotaNumbers.Count;
                            var remainingQuotas = totalQuotas - redistributedQuotasCount;

                            if (remainingQuotas > 0 && totalOverdueAmount > 0)
                            {
                                var redistributionPerQuota = totalOverdueAmount / remainingQuotas;
                                var calculatedNewQuotaValue = sale.OriginalQuotaValue + redistributionPerQuota;

                                if (sale.NewQuotaValue != calculatedNewQuotaValue)
                                {
                                    sale.NewQuotaValue = calculatedNewQuotaValue;
                                    needsUpdate = true;
                                }

                                Console.WriteLine($"[SaleServices] Dynamic calculation for sale {id_Sales}:");
                                Console.WriteLine($"  - OriginalQuotaValue: {sale.OriginalQuotaValue:C}");
                                Console.WriteLine($"  - NewQuotaValue: {sale.NewQuotaValue:C}");
                                Console.WriteLine($"  - RedistributionAmount: {totalOverdueAmount:C}");
                                Console.WriteLine($"  - RemainingQuotas: {remainingQuotas}");
                                Console.WriteLine($"  - RedistributedQuotaNumbers: [{string.Join(", ", redistributedQuotaNumbers)}]");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[SaleServices] Error calculating dynamic quota values: {ex.Message}");
                        // If there's an error, at least set the original quota value
                        if (sale.OriginalQuotaValue == null)
                        {
                            sale.OriginalQuotaValue = sale.quota_value;
                            needsUpdate = true;
                        }
                        sale.NewQuotaValue = null;
                    }
                }
                else
                {
                    if (sale.NewQuotaValue != null)
                    {
                        sale.NewQuotaValue = null;
                        needsUpdate = true;
                    }
                }

                if (needsUpdate)
                {
                    try
                    {
                        await _context.SaveChangesAsync();
                        Console.WriteLine($"[SaleServices] Saved calculated quota values to database for sale {id_Sales}");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[SaleServices] Error saving quota values to database: {ex.Message}");
                    }
                }

                Console.WriteLine($"[SaleServices] Final values being returned for sale {id_Sales}:");
                Console.WriteLine($"  - OriginalQuotaValue: {sale.OriginalQuotaValue?.ToString("C") ?? "null"}");
                Console.WriteLine($"  - NewQuotaValue: {sale.NewQuotaValue?.ToString("C") ?? "null"}");
            }

            return sale;
        }


        /// <summary>
        /// Crea una nueva venta, calcula el valor de la cuota y establece el recaudo inicial.
        /// Además, cambia el estado del lote de "Libre" a "Vendido".
        /// </summary>
        public async Task<bool> CreateSale(Sale sale)
        {
            try
            {
                // Validar que el lote esté "Libre" antes de la venta
                var lot = await _lotServices.GetLotById(sale.id_Lots);
                if (lot == null)
                {
                    throw new InvalidOperationException("El lote especificado no existe.");
                }
                if (lot.status != "Libre")
                {
                    throw new InvalidOperationException($"El lote {lot.block}-{lot.lot_number} no está disponible para la venta. Su estado actual es: {lot.status}");
                }

                // ✅ ACTUALIZACIÓN: Inicializar total_raised con el valor de initial_payment
                sale.total_raised = sale.initial_payment ?? 0;

                // Obtener el plan para el número de cuotas
                var plan = await _planServices.GetPlanById(sale.id_Plans);
                decimal remainingValue = 0;
                if (sale.total_value.HasValue && sale.initial_payment.HasValue)
                {
                    remainingValue = sale.total_value.Value - sale.initial_payment.Value;
                }

                // ✅ NUEVO: Inicializar total_debt
                sale.total_debt = remainingValue;

                if (plan?.number_quotas > 0)
                {
                    // ✅ ACTUALIZACIÓN: Quitar el redondeo, usar el valor exacto
                    sale.quota_value = remainingValue / plan.number_quotas.Value;
                }
                else
                {
                    sale.quota_value = 0; // O manejar como error si el plan o los valores son inválidos
                }

                _context.Sales.Add(sale);
                await _context.SaveChangesAsync(); // Guardar la venta para obtener su ID

                // ✅ INICIO DE LA CORRECCIÓN: Registrar la cuota inicial como un Payment
                if (sale.initial_payment.HasValue && sale.initial_payment.Value > 0)
                {
                    var initialPayment = new Payment
                    {
                        id_Sales = sale.id_Sales, // Vincular el pago a la nueva venta
                        amount = sale.initial_payment.Value,
                        payment_date = sale.sale_date, // Usar la fecha de la venta como fecha del pago inicial
                        payment_method = "Cuota Inicial", // Puedes ajustar esto según tus métodos de pago
                        // id_Users NO SE INCLUYE AQUÍ, ya que no está directamente en el modelo Payment
                    };

                    _context.Payments.Add(initialPayment);
                    await _context.SaveChangesAsync(); // Guardar el pago inicial
                    Console.WriteLine($"[SaleServices] Pago inicial de ${initialPayment.amount} registrado para venta ID: {sale.id_Sales}");
                }

                // Actualizar el estado del lote a "Vendido"
                await _lotServices.ChangeLotStatus(sale.id_Lots, "Vendido");

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en CreateSale: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        /// <summary>
        /// Actualiza una venta existente, recalcula el valor de la cuota y actualiza el recaudo total y la deuda.
        /// </summary>
        public async Task<bool> UpdateSale(int id_Sales, Sale updatedSale)
        {
            try
            {
                var existingSale = await _context.Sales
                                          .Include(s => s.plan) // Incluir plan para recalcular cuotas
                                          .FirstOrDefaultAsync(s => s.id_Sales == id_Sales);

                if (existingSale == null) return false;

                // Si el lote de la venta cambia, necesitamos actualizar el estado del lote anterior y el nuevo
                if (existingSale.id_Lots != updatedSale.id_Lots)
                {
                    // Marcar el lote anterior como "Libre" (o el estado que corresponda si se cancela la venta)
                    await _lotServices.ChangeLotStatus(existingSale.id_Lots, "Libre"); // Asumiendo que se libera
                    // Marcar el nuevo lote como "Vendido"
                    var newLot = await _lotServices.GetLotById(updatedSale.id_Lots);
                    if (newLot == null)
                    {
                        throw new InvalidOperationException("El nuevo lote especificado no existe.");
                    }
                    if (newLot.status != "Libre")
                    {
                        throw new InvalidOperationException($"El nuevo lote {newLot.block}-{newLot.lot_number} no está disponible para la venta. Su estado actual es: {newLot.status}");
                    }
                    await _lotServices.ChangeLotStatus(updatedSale.id_Lots, "Vendido");
                }

                // Calcular el monto del pago si total_raised ha aumentado
                decimal paymentAmount = 0;
                if (updatedSale.total_raised.HasValue && existingSale.total_raised.HasValue && updatedSale.total_raised.Value > existingSale.total_raised.Value)
                {
                    paymentAmount = updatedSale.total_raised.Value - existingSale.total_raised.Value;
                }
                // Si el initial_payment se actualiza y total_raised era 0, se asume que es el primer pago.
                else if (existingSale.total_raised == 0 && updatedSale.initial_payment.HasValue && updatedSale.initial_payment.Value > 0)
                {
                    paymentAmount = updatedSale.initial_payment.Value;
                }

                // Actualizar propiedades básicas
                existingSale.sale_date = updatedSale.sale_date;
                existingSale.total_value = updatedSale.total_value;
                existingSale.initial_payment = updatedSale.initial_payment;
                existingSale.id_Clients = updatedSale.id_Clients;
                existingSale.id_Lots = updatedSale.id_Lots;
                existingSale.id_Users = updatedSale.id_Users;
                existingSale.id_Plans = updatedSale.id_Plans;
                existingSale.status = updatedSale.status; // Permitir que el estado se actualice desde el frontend

                // ✅ ACTUALIZACIÓN: Sumar el monto pagado a total_raised
                existingSale.total_raised += paymentAmount;

                // ✅ ACTUALIZACIÓN: Restar el monto pagado de total_debt
                if (existingSale.total_debt.HasValue)
                {
                    existingSale.total_debt -= paymentAmount;
                    if (existingSale.total_debt < 0) existingSale.total_debt = 0; // Asegurar que no sea negativo
                }
                else
                {
                    // Si total_debt era null, inicializarlo y luego restar
                    existingSale.total_debt = existingSale.total_value - existingSale.initial_payment - paymentAmount;
                    if (existingSale.total_debt < 0) existingSale.total_debt = 0;
                }

                // Recalcular quota_value si los campos relevantes cambiaron
                Plan? currentPlan = existingSale.plan;
                // Si el ID del plan cambió o el plan no se cargó inicialmente
                if (existingSale.id_Plans != updatedSale.id_Plans || currentPlan == null)
                {
                    currentPlan = await _planServices.GetPlanById(updatedSale.id_Plans);
                }

                decimal newRemainingValue = 0;
                if (existingSale.total_value.HasValue && existingSale.initial_payment.HasValue)
                {
                    newRemainingValue = existingSale.total_value.Value - existingSale.initial_payment.Value;
                }

                if (currentPlan?.number_quotas > 0)
                {
                    // ✅ ACTUALIZACIÓN: Quitar el redondeo, usar el valor exacto
                    existingSale.quota_value = newRemainingValue / currentPlan.number_quotas.Value;
                }
                else
                {
                    existingSale.quota_value = 0;
                }

                _context.Sales.Update(existingSale);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en UpdateSale: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        /// <summary>
        /// Elimina una venta por su ID.
        /// Además, cambia el estado del lote asociado de "Vendido" a "Libre".
        /// </summary>
        public async Task<bool> DeleteSale(int id_Sales)
        {
            try
            {
                var sale = await _context.Sales.FirstOrDefaultAsync(s => s.id_Sales == id_Sales);
                if (sale == null) return false;

                _context.Sales.Remove(sale);
                await _context.SaveChangesAsync();

                // Actualizar el estado del lote a "Libre" al eliminar la venta
                await _lotServices.ChangeLotStatus(sale.id_Lots, "Libre");

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en DeleteSale: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        public async Task<ServiceResult<string>> RedistributeOverdueQuotas(int saleId, string redistributionType, List<OverdueQuotaInfo> overdueQuotas)
        {
            try
            {
                var sale = await _context.Sales
                    .Include(s => s.plan)
                    .FirstOrDefaultAsync(s => s.id_Sales == saleId);

                if (sale == null)
                    return new ServiceResult<string> { Success = false, Message = "Venta no encontrada" };

                var totalOverdueAmount = overdueQuotas.Sum(q => q.RemainingAmount);
                var overdueQuotaNumbers = overdueQuotas.Select(q => q.QuotaNumber).ToList();

                if (!sale.OriginalQuotaValue.HasValue)
                {
                    sale.OriginalQuotaValue = sale.quota_value;
                    Console.WriteLine($"[SaleServices] Preserving original quota value: {sale.OriginalQuotaValue:C}");
                }

                var originalQuotaValue = sale.OriginalQuotaValue ?? sale.quota_value ?? 0;

                sale.RedistributionAmount = totalOverdueAmount;
                sale.RedistributionType = redistributionType;
                sale.RedistributedQuotaNumbers = JsonSerializer.Serialize(overdueQuotaNumbers);

                if (sale.plan?.number_quotas > 0)
                {
                    // Calcular cuántas cuotas quedan sin redistribuir
                    var totalQuotas = sale.plan.number_quotas.Value;
                    var redistributedQuotasCount = overdueQuotas.Count;
                    var remainingQuotas = totalQuotas - redistributedQuotasCount;

                    if (remainingQuotas > 0)
                    {
                        if (redistributionType == "uniform")
                        {
                            // Para distribución uniforme, dividir entre todas las cuotas restantes
                            var redistributionPerQuota = totalOverdueAmount / remainingQuotas;
                            var newQuotaValue = originalQuotaValue + redistributionPerQuota;

                            sale.NewQuotaValue = newQuotaValue;
                            sale.quota_value = newQuotaValue; // Actualizar el valor en la tabla

                            Console.WriteLine($"[SaleServices] Uniform distribution:");
                            Console.WriteLine($"  - Redistribution per quota: {redistributionPerQuota:C}");
                            Console.WriteLine($"  - New quota value for all pending quotas: {newQuotaValue:C}");
                        }
                        else if (redistributionType == "lastQuota")
                        {
                            // Para suma a la última cuota, las cuotas normales mantienen su valor original
                            // Solo la última cuota recibe todo el monto adicional
                            sale.NewQuotaValue = originalQuotaValue; // Las cuotas normales no cambian
                            sale.quota_value = originalQuotaValue; // Mantener el valor original en la tabla

                            // Calculate the value for the last quota specifically
                            var lastQuotaValue = originalQuotaValue + totalOverdueAmount;
                            sale.LastQuotaValue = lastQuotaValue; // New property for last quota specific value

                            Console.WriteLine($"[SaleServices] Last quota distribution:");
                            Console.WriteLine($"  - Normal quotas keep original value: {originalQuotaValue:C}");
                            Console.WriteLine($"  - Last quota will have value: {lastQuotaValue:C}");
                            Console.WriteLine($"  - Additional amount for last quota: {totalOverdueAmount:C}");
                        }
                    }
                }

                await _context.SaveChangesAsync();

                return new ServiceResult<string>
                {
                    Success = true,
                    Message = "Cuotas redistribuidas exitosamente",
                    Data = $"Se redistribuyó {totalOverdueAmount:C} entre las cuotas restantes. Nuevo valor de cuota: {sale.NewQuotaValue:C}"
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en RedistributeOverdueQuotas: {ex.Message}");
                return new ServiceResult<string> { Success = false, Message = ex.Message };
            }
        }



        // ✅ ELIMINADO: La función RoundToNearestMultiple ya no es necesaria
        // private decimal RoundToNearestMultiple(decimal value, int multiple)
        // {
        //     if (multiple == 0) return value;
        //     return Math.Round(value / multiple, MidpointRounding.AwayFromZero) * multiple;
        // }
    }
}
