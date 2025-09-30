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
                                 .ThenInclude(l => l.project)
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
        /// Crea una nueva venta, calcula el valor de la cuota según el tipo de plan y establece el recaudo inicial.
        /// Además, cambia el estado del lote de "Libre" a "Vendido".
        /// </summary>
        public async Task<bool> CreateSale(Sale sale)
        {
            try
            {
                Console.WriteLine($"[SaleServices] CreateSale called with data:");
                Console.WriteLine($"  - id_Lots: {sale.id_Lots}");
                Console.WriteLine($"  - id_Clients: {sale.id_Clients}");
                Console.WriteLine($"  - id_Plans: {sale.id_Plans}");
                Console.WriteLine($"  - id_Users: {sale.id_Users}");
                Console.WriteLine($"  - total_value: {sale.total_value}");
                Console.WriteLine($"  - initial_payment: {sale.initial_payment}");
                Console.WriteLine($"  - sale_date: {sale.sale_date}");
                Console.WriteLine($"  - PaymentPlanType: {sale.PaymentPlanType}");
                Console.WriteLine($"  - CustomQuotasJson: {sale.CustomQuotasJson}");
                Console.WriteLine($"  - Status recibido: '{sale.status ?? "null"}'");

                // Validar que el lote esté "Libre" antes de la venta
                Console.WriteLine($"[SaleServices] Buscando lote con ID: {sale.id_Lots}");
                var lot = await _lotServices.GetLotById(sale.id_Lots);
                if (lot == null)
                {
                    Console.WriteLine($"[SaleServices] ERROR: Lote con ID {sale.id_Lots} no encontrado");
                    throw new InvalidOperationException("El lote especificado no existe.");
                }

                Console.WriteLine($"[SaleServices] Lote encontrado: {lot.block}-{lot.lot_number}, Estado: {lot.status}");
                if (lot.status != "Libre")
                {
                    Console.WriteLine($"[SaleServices] ERROR: Lote no disponible, estado actual: {lot.status}");
                    throw new InvalidOperationException($"El lote {lot.block}-{lot.lot_number} no está disponible para la venta. Su estado actual es: {lot.status}");
                }

                // ✅ SOLUCION DEFINITIVA: Establecer siempre el status como "Active" para nuevas ventas
                if (string.IsNullOrEmpty(sale.status))
                {
                    sale.status = "Active";
                    Console.WriteLine($"[SaleServices] Status establecido explícitamente como 'Active'");
                }
                else
                {
                    // Validar que el status sea uno de los valores válidos del enum
                    var validStatuses = new[] { "Active", "Desistida", "Escriturar" };
                    if (!validStatuses.Contains(sale.status))
                    {
                        Console.WriteLine($"[SaleServices] Status inválido '{sale.status}', estableciendo como 'Active'");
                        sale.status = "Active";
                    }
                    else
                    {
                        Console.WriteLine($"[SaleServices] Status válido establecido: '{sale.status}'");
                    }
                }

                // ✅ ACTUALIZACIÓN: Inicializar total_raised con el valor de initial_payment
                sale.total_raised = sale.initial_payment ?? 0;

                // Obtener el plan para el número de cuotas
                var plan = await _planServices.GetPlanById(sale.id_Plans);

                await CalculateQuotaValueByPlanType(sale, plan);

                Console.WriteLine($"[SaleServices] Intentando guardar venta con status: '{sale.status}'");

                _context.Sales.Add(sale);
                await _context.SaveChangesAsync(); // Guardar la venta para obtener su ID

                Console.WriteLine($"[SaleServices] Venta guardada exitosamente con ID: {sale.id_Sales}");

                // Verificar que el status se guardó correctamente
                var savedSale = await _context.Sales.AsNoTracking().FirstOrDefaultAsync(s => s.id_Sales == sale.id_Sales);
                if (savedSale != null)
                {
                    Console.WriteLine($"[SaleServices] Status verificado en BD: '{savedSale.status ?? "null"}'");
                    
                    // Si el status sigue siendo null después de guardar, hay un problema con la BD
                    if (savedSale.status == null)
                    {
                        Console.WriteLine($"[SaleServices] WARNING: Status es null después de guardar. Intentando actualizar...");
                        
                        // Intentar actualizar explícitamente el status
                        var updateSql = "UPDATE sales SET status = 'Active' WHERE id_Sales = {0}";
                        await _context.Database.ExecuteSqlRawAsync(updateSql, sale.id_Sales);
                        
                        Console.WriteLine($"[SaleServices] Status actualizado via SQL directo");
                        sale.status = "Active"; // Actualizar el objeto local
                    }
                    else
                    {
                        sale.status = savedSale.status; // Usar el valor de la BD
                    }
                }

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

                Console.WriteLine($"[SaleServices] Venta creada exitosamente con ID: {sale.id_Sales}, Status final: '{sale.status}'");

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

                existingSale.PaymentPlanType = updatedSale.PaymentPlanType;
                existingSale.CustomQuotasJson = updatedSale.CustomQuotasJson;
                existingSale.HouseInitialPercentage = updatedSale.HouseInitialPercentage;
                existingSale.HouseInitialAmount = updatedSale.HouseInitialAmount;

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

                await CalculateQuotaValueByPlanType(existingSale, currentPlan);

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

        private async Task CalculateQuotaValueByPlanType(Sale sale, Plan? plan)
        {
            decimal remainingValue = 0;

            switch (sale.PaymentPlanType?.ToLower())
            {
                case "house":
                    // Para casas: calcular el 30% del valor total y usar ese como base
                    if (sale.total_value.HasValue)
                    {
                        var housePercentage = sale.HouseInitialPercentage ?? 30;
                        sale.HouseInitialAmount = sale.total_value.Value * (housePercentage / 100);

                        remainingValue = sale.HouseInitialAmount.Value - (sale.initial_payment ?? 0);
                        sale.total_debt = remainingValue;

                        if (plan?.number_quotas > 0)
                        {
                            sale.quota_value = remainingValue / plan.number_quotas.Value;
                        }
                        else
                        {
                            sale.quota_value = 0;
                        }

                        Console.WriteLine($"[SaleServices] House plan: {housePercentage}% of {sale.total_value:C} = {sale.HouseInitialAmount:C}, remaining: {remainingValue:C}");
                    }
                    break;

                case "custom":
                    if (!string.IsNullOrEmpty(sale.CustomQuotasJson))
                    {
                        try
                        {
                            var customQuotas = JsonSerializer.Deserialize<List<CustomQuota>>(sale.CustomQuotasJson);
                            if (customQuotas != null && customQuotas.Count > 0)
                            {
                                var totalCustomQuotas = customQuotas.Sum(q => q.Amount);

                                // El total_debt es el total de cuotas personalizadas (ya que estas representan lo que falta por pagar)
                                sale.total_debt = totalCustomQuotas;

                                // Para cuotas personalizadas, quota_value será el promedio (solo para referencia)
                                sale.quota_value = totalCustomQuotas / customQuotas.Count;

                                Console.WriteLine($"[SaleServices] Custom plan: {customQuotas.Count} quotas totaling {totalCustomQuotas:C}, average quota: {sale.quota_value:C}");

                                var expectedRemaining = (sale.total_value ?? 0) - (sale.initial_payment ?? 0);
                                if (Math.Abs(totalCustomQuotas - expectedRemaining) > 1) // Permitir diferencia de $1 por redondeo
                                {
                                    Console.WriteLine($"[SaleServices] WARNING: Custom quotas total ({totalCustomQuotas:C}) doesn't match expected remaining ({expectedRemaining:C})");
                                }
                            }
                            else
                            {
                                Console.WriteLine("[SaleServices] No custom quotas found, falling back to automatic");
                                goto case "automatic";
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[SaleServices] Error parsing custom quotas: {ex.Message}");
                            // Fallback to automatic calculation
                            goto case "automatic";
                        }
                    }
                    else
                    {
                        Console.WriteLine("[SaleServices] CustomQuotasJson is empty, falling back to automatic");
                        // Fallback to automatic if no custom quotas defined
                        goto case "automatic";
                    }
                    break;

                case "automatic":
                default:
                    // Cálculo automático original
                    if (sale.total_value.HasValue && sale.initial_payment.HasValue)
                    {
                        remainingValue = sale.total_value.Value - sale.initial_payment.Value;
                    }

                    sale.total_debt = remainingValue;

                    if (plan?.number_quotas > 0)
                    {
                        sale.quota_value = remainingValue / plan.number_quotas.Value;
                    }
                    else
                    {
                        sale.quota_value = 0;
                    }

                    Console.WriteLine($"[SaleServices] Automatic plan: {remainingValue:C} / {plan?.number_quotas ?? 0} quotas = {sale.quota_value:C}");
                    break;
            }
        }

        /// <summary>
        /// ✅ MÉTODO DE DEBUGGING: Verifica el schema de la tabla sales y valores por defecto
        /// </summary>
        public async Task<object> DebugSalesTableSchema()
        {
            try
            {
                // Consultar el schema de la tabla sales
                var schemaQuery = @"
                    SELECT 
                        COLUMN_NAME, 
                        DATA_TYPE, 
                        COLUMN_TYPE, 
                        IS_NULLABLE, 
                        COLUMN_DEFAULT,
                        EXTRA
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'sales'
                    ORDER BY ORDINAL_POSITION";

                var schemaResult = await _context.Database.SqlQueryRaw<dynamic>(schemaQuery).ToListAsync();

                // También verificar algunas ventas existentes
                var sampleSales = await _context.Sales
                    .Select(s => new { s.id_Sales, s.status, s.PaymentPlanType })
                    .Take(5)
                    .ToListAsync();

                return new
                {
                    tableSchema = schemaResult,
                    sampleSales = sampleSales,
                    message = "Debug information for sales table"
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en DebugSalesTableSchema: {ex.Message}");
                return new { error = ex.Message };
            }
        }

        /// <summary>
        /// ✅ MÉTODO DE UTILIDAD: Actualiza todas las ventas con status null a 'Active'
        /// </summary>
        public async Task<ServiceResult<string>> FixNullStatuses()
        {
            try
            {
                var nullStatusSales = await _context.Sales
                    .Where(s => s.status == null)
                    .ToListAsync();

                Console.WriteLine($"[SaleServices] Encontradas {nullStatusSales.Count} ventas con status null");

                foreach (var sale in nullStatusSales)
                {
                    sale.status = "Active";
                }

                await _context.SaveChangesAsync();

                return new ServiceResult<string>
                {
                    Success = true,
                    Message = $"Se actualizaron {nullStatusSales.Count} ventas con status null a 'Active'",
                    Data = $"{nullStatusSales.Count} ventas actualizadas"
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en FixNullStatuses: {ex.Message}");
                return new ServiceResult<string> { Success = false, Message = ex.Message };
            }
        }
    }
}
