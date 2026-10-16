using mym_softcom.Models;
using mym_softcom.DTOs;
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

        // ✅ NUEVO: Métodos auxiliares para gestionar Quotas desde tabla

        /// <summary>
        /// Obtiene todas las cuotas de una venta desde la tabla Quotas
        /// </summary>
        private async Task<List<Quota>> GetQuotasBySaleIdAsync(int saleId)
        {
            return await _context.Quotas
                .Where(q => q.id_sale == saleId)
                .OrderBy(q => q.quota_number)
                .ToListAsync();
        }

        /// <summary>
        /// Obtiene cuotas con estado específico
        /// </summary>
        private async Task<List<Quota>> GetQuotasByStatusAsync(int saleId, string status)
        {
            return await _context.Quotas
                .Where(q => q.id_sale == saleId && q.status == status)
                .OrderBy(q => q.quota_number)
                .ToListAsync();
        }

        /// <summary>
        /// Actualiza el estado de una cuota
        /// </summary>
        private async Task UpdateQuotaStatusAsync(int quotaId, string newStatus)
        {
            var quota = await _context.Quotas.FindAsync(quotaId);
            if (quota != null)
            {
                quota.status = newStatus;
                quota.last_modified = DateTime.Now;
                _context.Quotas.Update(quota);
                await _context.SaveChangesAsync();
            }
        }

        /// <summary>
        /// Actualiza el monto actual de una cuota
        /// </summary>
        private async Task UpdateQuotaAmountAsync(int quotaId, decimal newAmount)
        {
            var quota = await _context.Quotas.FindAsync(quotaId);
            if (quota != null)
            {
                quota.current_amount = newAmount;
                quota.last_modified = DateTime.Now;
                _context.Quotas.Update(quota);
                await _context.SaveChangesAsync();
            }
        }

        /// <summary>
        /// ✅ NUEVO: Recalcula y actualiza el status de las quotas basado en pagos
        /// Ejecutar después de crear/actualizar pagos
        /// </summary>
        public async Task RecalculateQuotaStatusAsync(int saleId)
        {
            try
            {
                Console.WriteLine($"[RecalculateQuotaStatus] 🔄 Recalculando status para venta {saleId}");
                
                var quotas = await GetQuotasBySaleIdAsync(saleId);
                if (quotas.Count == 0)
                {
                    Console.WriteLine($"[RecalculateQuotaStatus] ⚠️ No hay quotas para venta {saleId}");
                    return;
                }

                // Obtener todos los pagos para esta venta
                var details = await _context.Details
                    .AsNoTracking()
                    .Where(d => d.id_Sales == saleId)
                    .ToListAsync();

                // Agrupar pagos por cuota
                var paymentsByQuota = details
                    .GroupBy(d => d.number_quota)
                    .ToDictionary(g => g.Key, g => g.Sum(d => d.covered_amount ?? 0));

                // ✅ IMPORTANTE: Usar solo la fecha, sin hora (solo comparar DD/MM/YYYY)
                var currentDate = DateTime.Now.Date;

                // Actualizar el status de cada cuota
                foreach (var quota in quotas)
                {
                    string newStatus = quota.status; // Por defecto, mantener el status actual
                    decimal paidAmount = paymentsByQuota.GetValueOrDefault(quota.quota_number, 0);
                    decimal remainingAmount = quota.current_amount - paidAmount;
                    
                    // ✅ Comparar solo fechas (sin hora)
                    var quotaDueDate = quota.due_date.Date;
                    bool isOverdue = quotaDueDate < currentDate;

                    Console.WriteLine($"[RecalculateQuotaStatus]   Cuota {quota.quota_number}: status={quota.status}, due={quotaDueDate:yyyy-MM-dd}, today={currentDate:yyyy-MM-dd}, overdue={isOverdue}, paid={paidAmount:C}, remaining={remainingAmount:C}");

                    // ✅ LÓGICA CORRECTA DE ESTADO:
                    if (remainingAmount <= 0)
                    {
                        // Pagada completamente
                        newStatus = "Pagada";
                    }
                    else if (quota.status == "Distribuida")
                    {
                        // Mantener Distribuida (cedió su dinero en redistribución)
                        newStatus = "Distribuida";
                    }
                    else if (isOverdue && paidAmount > 0 && remainingAmount > 0)
                    {
                        // Vencida pero con abono parcial
                        newStatus = "Vencido Abonado";
                    }
                    else if (isOverdue && remainingAmount > 0)
                    {
                        // Vencida sin pagar
                        newStatus = "Vencida";
                    }
                    else if (!isOverdue && paidAmount > 0 && remainingAmount > 0)
                    {
                        // Abonado parcialmente pero dentro de fecha
                        newStatus = "Abonado";
                    }
                    else
                    {
                        // Pendiente (no pagado, dentro de fecha)
                        newStatus = "Pending";
                    }

                    // Actualizar si cambió
                    if (newStatus != quota.status)
                    {
                        quota.status = newStatus;
                        quota.last_modified = DateTime.Now;
                        _context.Quotas.Update(quota);
                        Console.WriteLine($"[RecalculateQuotaStatus]   ✓ Cuota {quota.quota_number}: {quota.status} → {newStatus}");
                    }
                }

                await _context.SaveChangesAsync();
                Console.WriteLine($"[RecalculateQuotaStatus] ✅ Status actualizado para venta {saleId}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[RecalculateQuotaStatus] ❌ Error: {ex.Message}");
                Console.WriteLine($"[RecalculateQuotaStatus] Stack: {ex.StackTrace}");
            }
        }

        /// <summary>
        /// Migra cuotas desde CustomQuotasJson a tabla Quotas
        /// </summary>
        public async Task MigrateQuotasFromJsonAsync(int saleId)
        {
            try
            {
                Console.WriteLine($"[MigrateQuotasFromJson] 🔄 Iniciando migración para venta {saleId}");
                
                var sale = await _context.Sales.FindAsync(saleId);
                if (sale == null)
                {
                    Console.WriteLine($"[MigrateQuotasFromJson] ❌ Venta no encontrada");
                    return;
                }

                // Verificar si ya hay cuotas migradas
                var existingQuotas = await GetQuotasBySaleIdAsync(saleId);
                if (existingQuotas.Count > 0)
                {
                    Console.WriteLine($"[MigrateQuotasFromJson] ⚠️ Venta ya tiene {existingQuotas.Count} cuotas migradas");
                    return;
                }

                // Si hay CustomQuotasJson, migrar desde ahí
                if (!string.IsNullOrEmpty(sale.CustomQuotasJson))
                {
                    try
                    {
                        var customQuotas = JsonSerializer.Deserialize<List<CustomQuota>>(sale.CustomQuotasJson);
                        if (customQuotas != null && customQuotas.Count > 0)
                        {
                            foreach (var customQuota in customQuotas)
                            {
                                var quota = new Quota
                                {
                                    id_sale = saleId,
                                    quota_number = customQuota.QuotaNumber,
                                    amount = customQuota.Amount,
                                    current_amount = customQuota.Amount,
                                    due_date = customQuota.DueDate ?? DateTime.Now.AddMonths(customQuota.QuotaNumber),
                                    status = "Pending",
                                    created_at = DateTime.Now
                                };
                                _context.Quotas.Add(quota);
                            }
                            await _context.SaveChangesAsync();
                            Console.WriteLine($"[MigrateQuotasFromJson] ✅ {customQuotas.Count} cuotas migradas desde CustomQuotasJson");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[MigrateQuotasFromJson] ❌ Error al deserializar CustomQuotasJson: {ex.Message}");
                    }
                }
                // Si es plan automático, crear cuotas basadas en quota_value
                else if (sale.PaymentPlanType?.ToLower() == "automatic" && sale.quota_value.HasValue && sale.plan?.number_quotas.HasValue == true)
                {
                    var numQuotas = sale.plan.number_quotas.Value;
                    var quotaValue = sale.quota_value.Value;
                    
                    for (int i = 1; i <= numQuotas; i++)
                    {
                        var dueDate = sale.sale_date.AddMonths(i);
                        var quota = new Quota
                        {
                            id_sale = saleId,
                            quota_number = i,
                            amount = quotaValue,
                            current_amount = quotaValue,
                            due_date = dueDate,
                            status = "Pending",
                            created_at = DateTime.Now
                        };
                        _context.Quotas.Add(quota);
                    }
                    await _context.SaveChangesAsync();
                    Console.WriteLine($"[MigrateQuotasFromJson] ✅ {numQuotas} cuotas creadas para plan automático");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MigrateQuotasFromJson] ❌ Error: {ex.Message}");
            }
        }

        /// <summary>
        /// Obtiene todas las ventas, incluyendo sus relaciones.
        /// </summary>
        public async Task<IEnumerable<Sale>> GetAllSales()
        {
            try
            {
                Console.WriteLine("🔍 [SaleServices] Iniciando GetAllSales");
                
                // Primero, obtener ventas sin Include
                var sales = await _context.Sales.AsNoTracking().ToListAsync(); // ← NUEVO: Lectura fresca
                Console.WriteLine($"📊 Ventas encontradas sin Include: {sales.Count}");
                
                if (sales.Count == 0)
                {
                    Console.WriteLine("⚠️ No hay ventas en la BD");
                    return sales;
                }

                // Ahora, cargar las relaciones manualmente de forma más segura
                Console.WriteLine("🔗 Cargando relaciones para cada venta...");
                
                foreach (var sale in sales)
                {
                    try
                    {
                        // Cargar client
                        if (sale.id_Clients > 0 && sale.client == null)
                        {
                            sale.client = await _context.Clients.FindAsync(sale.id_Clients);
                        }

                        // Cargar lot y su proyecto
                        if (sale.id_Lots > 0 && sale.lot == null)
                        {
                            sale.lot = await _context.Lots
                                .Include(l => l.project)
                                .FirstOrDefaultAsync(l => l.id_Lots == sale.id_Lots);
                        }

                        // Cargar user
                        if (sale.id_Users > 0 && sale.user == null)
                        {
                            sale.user = await _context.Users.FindAsync(sale.id_Users);
                        }

                        // Cargar plan
                        if (sale.id_Plans > 0 && sale.plan == null)
                        {
                            sale.plan = await _context.Plans.FindAsync(sale.id_Plans);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"⚠️ Error cargando relaciones para venta {sale.id_Sales}: {ex.Message}");
                        // Continuar con la siguiente venta
                    }
                }

                Console.WriteLine($"✅ GetAllSales completado: {sales.Count} ventas");
                return sales;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error crítico en GetAllSales: {ex.Message}");
                Console.WriteLine($"   Stack: {ex.StackTrace}");
                throw;
            }
        }

        /// <summary>
        /// Obtiene una venta específica por su ID, incluyendo sus relaciones.
        /// Calcula dinámicamente OriginalQuotaValue y NewQuotaValue si hay redistribución y los guarda en la BD.
        /// </summary>
        public async Task<Sale?> GetSaleById(int id_Sales)
        {
            Console.WriteLine($"[SaleServices] Buscando venta con id_Sales: {id_Sales}");
            
            // Primero, obtener datos frescos sin tracking
            var sale = await _context.Sales
                                 .AsNoTracking()
                                 .Include(s => s.client)
                                 .Include(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(s => s.user)
                                 .Include(s => s.plan)
                                 .Include(s => s.quotas)  // ✅ NUEVO: Cargar cuotas desde tabla
                                 .FirstOrDefaultAsync(s => s.id_Sales == id_Sales);

            if (sale != null)
            {
                bool needsUpdate = false;

                // Set OriginalQuotaValue if not already set
                if (sale.OriginalQuotaValue == null)
                {
                    needsUpdate = true;
                }

                Console.WriteLine($"[SaleServices] Initial values for sale {id_Sales}:");
                Console.WriteLine($"  - quota_value: {sale.quota_value:C}");
                Console.WriteLine($"  - OriginalQuotaValue: {sale.OriginalQuotaValue?.ToString("C") ?? "null"}");
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
                                var originalQuotaValue = sale.OriginalQuotaValue ?? sale.quota_value;
                                var redistributionPerQuota = totalOverdueAmount / remainingQuotas;
                                var calculatedNewQuotaValue = originalQuotaValue + redistributionPerQuota;

                                // Check if we need to update
                                if (sale.OriginalQuotaValue == null || sale.NewQuotaValue != calculatedNewQuotaValue)
                                {
                                    needsUpdate = true;
                                }

                                Console.WriteLine($"[SaleServices] Dynamic calculation for sale {id_Sales}:");
                                Console.WriteLine($"  - OriginalQuotaValue: {originalQuotaValue:C}");
                                Console.WriteLine($"  - NewQuotaValue: {calculatedNewQuotaValue:C}");
                                Console.WriteLine($"  - RedistributionAmount: {totalOverdueAmount:C}");
                                Console.WriteLine($"  - RemainingQuotas: {remainingQuotas}");
                                Console.WriteLine($"  - RedistributedQuotaNumbers: [{string.Join(", ", redistributedQuotaNumbers)}]");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[SaleServices] Error calculating dynamic quota values: {ex.Message}");
                        if (sale.OriginalQuotaValue == null)
                        {
                            needsUpdate = true;
                        }
                    }
                }
                else
                {
                    if (sale.NewQuotaValue != null)
                    {
                        needsUpdate = true;
                    }
                }

                // ✅ FUERZA ACTUALIZAR CustomQuotasJson SI HAY REDISTRIBUCIÓN (independiente de needsUpdate)
                bool shouldFetchTracked = needsUpdate || !string.IsNullOrEmpty(sale.RedistributedQuotaNumbers);

                if (shouldFetchTracked)
                {
                    Console.WriteLine($"[SaleServices] Fetching con tracking para actualizar sale {id_Sales}");
                    var trackedSale = await _context.Sales
                                             .Include(s => s.client)
                                             .Include(s => s.lot)
                                             .ThenInclude(l => l.project)
                                             .Include(s => s.user)
                                             .Include(s => s.plan)
                                             .Include(s => s.quotas)  // ✅ NUEVO: Cargar cuotas desde tabla
                                             .FirstOrDefaultAsync(s => s.id_Sales == id_Sales);

                    if (trackedSale != null)
                    {
                        bool changesMade = false;

                        if (trackedSale.OriginalQuotaValue == null)
                        {
                            trackedSale.OriginalQuotaValue = trackedSale.quota_value;
                        }

                        if (!string.IsNullOrEmpty(trackedSale.RedistributedQuotaNumbers))
                        {
                            try
                            {
                                var redistributedQuotaNumbers = JsonSerializer.Deserialize<List<int>>(trackedSale.RedistributedQuotaNumbers);
                                var totalOverdueAmount = trackedSale.RedistributionAmount ?? 0;

                                if (trackedSale.plan?.number_quotas > 0 && redistributedQuotaNumbers?.Count > 0)
                                {
                                    var totalQuotas = trackedSale.plan.number_quotas.Value;
                                    var remainingQuotas = totalQuotas - redistributedQuotaNumbers.Count;
                                    
                                    if (remainingQuotas > 0 && totalOverdueAmount > 0)
                                    {
                                        var redistributionPerQuota = totalOverdueAmount / remainingQuotas;
                                        trackedSale.NewQuotaValue = (trackedSale.OriginalQuotaValue ?? trackedSale.quota_value) + redistributionPerQuota;
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[SaleServices] Error updating quota values: {ex.Message}");
                                trackedSale.NewQuotaValue = null;
                            }

                            // ✅ AHORA SIEMPRE ACTUALIZAR CustomQuotasJson si hay redistribución
                            if (!string.IsNullOrEmpty(trackedSale.CustomQuotasJson))
                            {
                                try
                                {
                                    var redistributedQuotaNumbers = JsonSerializer.Deserialize<List<int>>(trackedSale.RedistributedQuotaNumbers);
                                    var newQuotaValue = trackedSale.quota_value ?? 0m;

                                    var customQuotasElement = JsonSerializer.Deserialize<JsonElement>(trackedSale.CustomQuotasJson);
                                    if (customQuotasElement.ValueKind == JsonValueKind.Array && redistributedQuotaNumbers?.Count > 0)
                                    {
                                        var updatedQuotas = new List<Dictionary<string, object>>();

                                        foreach (var quotaElement in customQuotasElement.EnumerateArray())
                                        {
                                            var quotaDict = new Dictionary<string, object>();
                                            int quotaNumber = 0;
                                            decimal quotaAmount = 0;
                                            string dueDate = "";

                                            if (quotaElement.TryGetProperty("QuotaNumber", out var qnElem))
                                                quotaNumber = qnElem.GetInt32();
                                            if (quotaElement.TryGetProperty("Amount", out var amtElem))
                                                quotaAmount = amtElem.GetDecimal();
                                            if (quotaElement.TryGetProperty("DueDate", out var ddElem))
                                                dueDate = ddElem.GetString();

                                            // IMPORTANTE: Solo actualizar cuotas NO vencidas
                                            if (!redistributedQuotaNumbers.Contains(quotaNumber))
                                            {
                                                quotaAmount = newQuotaValue;
                                                Console.WriteLine($"[UpdateJSON] Cuota {quotaNumber}: actualizada a {quotaAmount:C}");
                                            }
                                            else
                                            {
                                                Console.WriteLine($"[UpdateJSON] Cuota {quotaNumber}: vencida, NO se actualiza (mantiene {quotaAmount:C})");
                                            }

                                            quotaDict["QuotaNumber"] = quotaNumber;
                                            quotaDict["Amount"] = quotaAmount;
                                            quotaDict["DueDate"] = dueDate;
                                            updatedQuotas.Add(quotaDict);
                                        }

                                        trackedSale.CustomQuotasJson = JsonSerializer.Serialize(updatedQuotas);
                                        Console.WriteLine($"[SaleServices] ✅ CustomQuotasJson actualizado para sale {id_Sales}");
                                        changesMade = true;
                                    }
                                }
                                catch (Exception ex)
                                {
                                    Console.WriteLine($"[SaleServices] ⚠️ Error al actualizar CustomQuotasJson: {ex.Message}");
                                }
                            }
                        }
                        else
                        {
                            trackedSale.NewQuotaValue = null;
                        }

                        if (ApplyEffectiveSaleStatus(trackedSale))
                        {
                            changesMade = true;
                        }

                        // Guardar si hubo cambios
                        if (changesMade || needsUpdate)
                        {
                            try
                            {
                                await _context.SaveChangesAsync();
                                Console.WriteLine($"[SaleServices] ✅ Saved calculated quota values for sale {id_Sales}");
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[SaleServices] ❌ Error saving quota values: {ex.Message}");
                            }
                        }

                        sale = trackedSale;
                    }
                }

                Console.WriteLine($"[SaleServices] Final values for sale {id_Sales}:");
                Console.WriteLine($"  - quota_value: {sale.quota_value:C}");
                Console.WriteLine($"  - OriginalQuotaValue: {sale.OriginalQuotaValue?.ToString("C") ?? "null"}");
                Console.WriteLine($"  - NewQuotaValue: {sale.NewQuotaValue?.ToString("C") ?? "null"}");
            }

            return sale;
        }

        private bool ApplyEffectiveSaleStatus(Sale sale)
        {
            var currentStatus = sale.status?.Trim();
            var debt = sale.total_debt ?? 0m;
            var quota = sale.quota_value ?? 0m;

            var isActiveLike = string.IsNullOrEmpty(currentStatus)
                               || currentStatus.Equals("Active", StringComparison.OrdinalIgnoreCase)
                               || currentStatus.Equals("Activa", StringComparison.OrdinalIgnoreCase);

            if (isActiveLike && (debt <= 0m || quota <= 0m))
            {
                if (!string.Equals(currentStatus, "Escriturar", StringComparison.OrdinalIgnoreCase))
                {
                    sale.status = "Escriturar";
                    return true;
                }
                return false;
            }

            if (string.Equals(currentStatus, "Escriturar", StringComparison.OrdinalIgnoreCase) && debt > 0m && quota > 0m)
            {
                sale.status = "Active";
                return true;
            }

            return false;
        }

        /// <summary>
        /// Obtiene todas las ventas de un cliente específico.
        /// </summary>
        public async Task<IEnumerable<Sale>> GetSalesByClientId(int clientId)
        {
            try
            {
                var sales = await _context.Sales
                    .Where(s => s.id_Clients == clientId)
                    .Include(s => s.client)
                    .Include(s => s.lot)
                    .ThenInclude(l => l.project)
                    .Include(s => s.user)
                    .Include(s => s.plan)
                    .ToListAsync();

                return sales;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SaleServices] Error al obtener ventas del cliente {clientId}: {ex.Message}");
                return new List<Sale>();
            }
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
                    var paymentMethod = MapPaymentMethod(sale.initial_payment_method);

                   var initialPayment = new Payment
                   {
                           id_Sales = sale.id_Sales, // Vincular el pago a la nueva venta
                        amount = sale.initial_payment.Value,
                         payment_date = sale.sale_date, // Usar la fecha de la venta como fecha del pago inicial
                          payment_method = paymentMethod,
                             // id_Users NO SE INCLUYE AQUÍ, ya que no está directamente en el modelo Payment
                            };

                            _context.Payments.Add(initialPayment);
                   await _context.SaveChangesAsync(); // Guardar el pago inicial
               Console.WriteLine($"[SaleServices] Pago inicial de ${initialPayment.amount} registrado para venta ID: {sale.id_Sales} con método '{paymentMethod}'");
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
                                          .Include(s => s.plan)
                                          .FirstOrDefaultAsync(s => s.id_Sales == id_Sales);

                if (existingSale == null) return false;

                // ✅ Consultar el total de pagos reales de la base de datos
                var totalPaid = await _context.Payments
                    .Where(p => p.id_Sales == id_Sales)
                    .SumAsync(p => p.amount ?? 0);

                // Si el lote de la venta cambia, necesitamos actualizar el estado del lote anterior y el nuevo
                if (existingSale.id_Lots != updatedSale.id_Lots)
                {
                    await _lotServices.ChangeLotStatus(existingSale.id_Lots, "Libre");
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

                // Actualizar propiedades básicas
                existingSale.sale_date = updatedSale.sale_date;
                existingSale.total_value = updatedSale.total_value;
                existingSale.initial_payment = updatedSale.initial_payment;
                existingSale.initial_payment_method = updatedSale.initial_payment_method;
                existingSale.id_Clients = updatedSale.id_Clients;
                existingSale.id_Lots = updatedSale.id_Lots;
                existingSale.id_Users = updatedSale.id_Users;
                existingSale.id_Plans = updatedSale.id_Plans;

                existingSale.PaymentPlanType = updatedSale.PaymentPlanType;
                existingSale.CustomQuotasJson = updatedSale.CustomQuotasJson;
                existingSale.HouseInitialPercentage = updatedSale.HouseInitialPercentage;
                existingSale.HouseInitialAmount = updatedSale.HouseInitialAmount;

                // ✅ Recalcular total_raised y total_debt basándose en pagos reales
                existingSale.total_raised = totalPaid;
                existingSale.total_debt = updatedSale.total_value - totalPaid;
                if (existingSale.total_debt < 0) existingSale.total_debt = 0;

                // ✅ Guardar los valores correctos ANTES de CalculateQuotaValueByPlanType
                decimal correctTotalRaised = existingSale.total_raised.Value;
                decimal correctTotalDebt = existingSale.total_debt.Value;

                // ✅ Actualizar estado basándose en la deuda
                if (existingSale.total_debt == 0 && totalPaid > 0)
                {
                    existingSale.status = "Escriturar";
                }
                else if (existingSale.status == "Escriturar" && existingSale.total_debt > 0)
                {
                    existingSale.status = "Active";
                }
                else if (updatedSale.status == "Cancelled" || updatedSale.status == "Desisted")
                {
                    existingSale.status = updatedSale.status;
                }

                // Recalcular quota_value SI NO es un plan personalizado
                // Para planes custom, NO recalcular para evitar modificar montos de cuotas
                if (updatedSale.PaymentPlanType?.ToLower() != "custom")
                {
                    Plan? currentPlan = existingSale.plan;
                    if (existingSale.id_Plans != updatedSale.id_Plans || currentPlan == null)
                    {
                        currentPlan = await _planServices.GetPlanById(updatedSale.id_Plans);
                    }

                    await CalculateQuotaValueByPlanType(existingSale, currentPlan);
                }
                else
                {
                    Console.WriteLine($"[SaleServices] 🔒 Plan custom detectado: NO recalculando quotas para venta {id_Sales}");
                }

                // ✅ RESTAURAR los valores correctos DESPUÉS de CalculateQuotaValueByPlanType
                existingSale.total_raised = correctTotalRaised;
                existingSale.total_debt = correctTotalDebt;

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

        /// <summary>
        /// Mappea el campo enviado desde el frontend a valores estándar para Payment.payment_method.
        /// Devuelve "Banco" para cualquier tipo de banco, "Efectivo" para efectivo, o el valor original como fallback.
        /// </summary>
        private string MapPaymentMethod(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return "Cuota Inicial";

            var normalized = input.Trim().ToLowerInvariant();
            if (normalized.Contains("banco") || normalized.Contains("corriente") || normalized.Contains("ahorro"))
            {
                return "Banco";
            }
            if (normalized.Contains("efectivo") || normalized.Contains("cash"))
            {
                return "Efectivo";
            }

            // Fallback: si vienen otros textos, devolver el texto original tal y como fue enviado
            return input.Trim();
        }

        public async Task<ServiceResult<string>> RedistributeOverdueQuotas(int saleId, RedistributeQuotasRequest request)
        {
            try
            {
                var sale = await _context.Sales.Include(s => s.plan).FirstOrDefaultAsync(s => s.id_Sales == saleId);
                if (sale == null)
                    return new ServiceResult<string> { Success = false, Message = "Venta no encontrada." };

                // Validaciones básicas
                if (request.overdueQuotas == null || request.overdueQuotas.Count == 0)
                    return new ServiceResult<string> { Success = false, Message = "No hay cuotas vencidas para redistribuir." };

                if ((request.numQuotasToDistribute ?? 0) <= 0)
                    return new ServiceResult<string> { Success = false, Message = "El número de cuotas debe ser mayor a 0." };

                if (sale.plan == null || sale.plan.number_quotas == 0)
                    return new ServiceResult<string> { Success = false, Message = "La venta no tiene un plan válido." };

                var totalOverdueAmount = request.overdueQuotas.Sum(q => q.remainingAmount);
                var overdueQuotaNumbers = request.overdueQuotas.Select(q => q.quotaNumber).ToList();
                var totalQuotas = sale.plan.number_quotas.Value;
                var overdueCount = overdueQuotaNumbers.Count;
                var remainingQuotas = totalQuotas - overdueCount;

                if ((request.numQuotasToDistribute ?? 1) > remainingQuotas)
                    return new ServiceResult<string> { Success = false, Message = $"Solo hay {remainingQuotas} cuotas no vencidas disponibles." };

                // ← NUEVO: Calcular cuáles cuotas RECIBEN la redistribución
                // - Si es "lastQuota": solo la última cuota (totalQuotas)
                // - Si es "custom": las últimas NumQuotasToDistribute cuotas NO vencidas
                var quotasReceivingRedistribution = new List<int>();

                if (request.redistributionType == "lastQuota")
                {
                    // Última cuota del plan
                    quotasReceivingRedistribution.Add(totalQuotas);
                }
                else if (request.redistributionType == "custom")
                {
                    // Últimas numQuotasToDistribute cuotas que NO estén vencidas
                    var nonOverdueQuotas = Enumerable.Range(1, totalQuotas)
                        .Where(q => !overdueQuotaNumbers.Contains(q))
                        .OrderByDescending(q => q)
                        .Take(request.numQuotasToDistribute ?? 1)
                        .OrderBy(q => q)
                        .ToList();
                    quotasReceivingRedistribution = nonOverdueQuotas;
                }

                Console.WriteLine($"[RedistributeOverdueQuotas] 🔄 Redistribuyendo para venta {saleId}");
                Console.WriteLine($"  - Total de mora: {totalOverdueAmount:C}");
                Console.WriteLine($"  - Cuotas vencidas: {string.Join(",", overdueQuotaNumbers)}");
                Console.WriteLine($"  - Tipo: {request.redistributionType}");
                Console.WriteLine($"  - Cuotas que RECIBEN: {string.Join(",", quotasReceivingRedistribution)}");
                Console.WriteLine($"  - Valor a sumar por cuota: {request.amountPerQuota:C}");

                // Guardar metadata de redistribución
                sale.OriginalQuotaValue = sale.OriginalQuotaValue ?? sale.quota_value;
                sale.quota_value = request.amountPerQuota ?? 0;
                sale.RedistributionType = request.redistributionType;
                
                // ← NUEVO: Guardar ambas listas en un JSON unificado
                var quotaData = new
                {
                    received = quotasReceivingRedistribution,
                    overdue = overdueQuotaNumbers
                };
                sale.RedistributedQuotaNumbers = JsonSerializer.Serialize(quotaData);
                
                sale.RedistributionAmount = totalOverdueAmount;
                sale.NewQuotaValue = request.amountPerQuota ?? 0;

                Console.WriteLine($"[RedistributeOverdueQuotas] ✅ Configuración:");
                Console.WriteLine($"  - quota_value actualizado a: {request.amountPerQuota:C}");
                Console.WriteLine($"  - Cuotas que RECIBEN guardadas: {JsonSerializer.Serialize(quotasReceivingRedistribution)}");
                Console.WriteLine($"  - Monto total en mora: {sale.RedistributionAmount:C}");

                // ✅ Actualizar CustomQuotasJson si es un plan personalizado
                if (!string.IsNullOrEmpty(sale.CustomQuotasJson))
                {
                    try
                    {
                        var customQuotasElement = JsonSerializer.Deserialize<JsonElement>(sale.CustomQuotasJson);
                        if (customQuotasElement.ValueKind == JsonValueKind.Array)
                        {
                            var updatedQuotas = new List<Dictionary<string, object>>();
                            int quotasUpdated = 0;

                            foreach (var quotaElement in customQuotasElement.EnumerateArray())
                            {
                                var quotaDict = new Dictionary<string, object>();
                                int quotaNumber = 0;
                                decimal quotaAmount = 0;
                                string dueDate = "";

                                if (quotaElement.TryGetProperty("QuotaNumber", out var qnElem))
                                    quotaNumber = qnElem.GetInt32();
                                if (quotaElement.TryGetProperty("Amount", out var amtElem))
                                    quotaAmount = amtElem.GetDecimal();
                                if (quotaElement.TryGetProperty("DueDate", out var ddElem))
                                    dueDate = ddElem.GetString();

                                // Solo actualizar las cuotas que van a RECIBIR la redistribución
                                if (quotasReceivingRedistribution.Contains(quotaNumber))
                                {
                                    decimal originalAmount = quotaAmount;
                                    quotaAmount = quotaAmount + (request.amountPerQuota ?? 0); // ← SUMA al valor original
                                    Console.WriteLine($"  [CustomJSON] Cuota {quotaNumber}: {originalAmount:C} + {request.amountPerQuota:C} = {quotaAmount:C} (RECIBE redistribución)");
                                }
                                else if (overdueQuotaNumbers.Contains(quotaNumber))
                                {
                                    // Cuotas vencidas: mantienen su valor original
                                    Console.WriteLine($"  [CustomJSON] Cuota {quotaNumber}: vencida, mantiene valor original {quotaAmount:C}");
                                }

                                quotaDict["QuotaNumber"] = quotaNumber;
                                quotaDict["Amount"] = quotaAmount;
                                quotaDict["DueDate"] = dueDate;
                                updatedQuotas.Add(quotaDict);
                            }

                            sale.CustomQuotasJson = JsonSerializer.Serialize(updatedQuotas);
                            Console.WriteLine($"[RedistributeOverdueQuotas] ✅ CustomQuotasJson actualizado");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[RedistributeOverdueQuotas] ⚠️ Error al actualizar CustomQuotasJson: {ex.Message}");
                        // Continuar aunque falle la actualización del JSON
                    }
                }

                // ✅ PROTECCIÓN: Verificar que total_value y total_debt no cambien
                Console.WriteLine($"[RedistributeOverdueQuotas] 🛡️ Valores protegidos:");
                Console.WriteLine($"  - total_value: {sale.total_value:C} (NO debe cambiar)");
                Console.WriteLine($"  - total_debt: {sale.total_debt:C} (NO debe cambiar)");
                Console.WriteLine($"  - total_raised: {sale.total_raised:C} (NO debe cambiar)");

                // ✅ ACTUALIZAR TABLA QUOTAS: Marcar vencidas como "Distribuida" y aumentar montos en receptoras
                Console.WriteLine($"[RedistributeOverdueQuotas] 📋 Actualizando tabla Quotas...");
                
                var amountPerReceivingQuota = request.amountPerQuota ?? (totalOverdueAmount / (quotasReceivingRedistribution.Count > 0 ? quotasReceivingRedistribution.Count : 1));
                
                // Cargar todas las cuotas de esta venta
                var allQuotas = await _context.Quotas.Where(q => q.id_sale == saleId).ToListAsync();
                
                foreach (var quota in allQuotas)
                {
                    // Cuotas vencidas que se van a redistribuir: marcar como "Distribuida"
                    if (overdueQuotaNumbers.Contains(quota.quota_number))
                    {
                        quota.status = "Distribuida";
                        quota.redistributed_amount = quota.current_amount;
                        quota.updated_at = DateTime.Now;
                        Console.WriteLine($"  ✓ Cuota {quota.quota_number}: marcada como 'Distribuida' (${quota.redistributed_amount:F2})");
                    }
                    // Cuotas que RECIBEN la redistribución: aumentar current_amount
                    else if (quotasReceivingRedistribution.Contains(quota.quota_number))
                    {
                        var originalAmount = quota.current_amount;
                        quota.current_amount += amountPerReceivingQuota;
                        quota.updated_at = DateTime.Now;
                        Console.WriteLine($"  ✓ Cuota {quota.quota_number}: aumentada de ${originalAmount:F2} a ${quota.current_amount:F2}");
                    }
                }
                
                _context.Quotas.UpdateRange(allQuotas);
                
                _context.Sales.Update(sale);
                await _context.SaveChangesAsync();

                Console.WriteLine($"[RedistributeOverdueQuotas] ✅ Redistribución completada para venta {saleId}");
                return new ServiceResult<string> { Success = true, Message = "Redistribución realizada exitosamente." };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[RedistributeOverdueQuotas] ❌ Error: {ex.Message}");
                return new ServiceResult<string> { Success = false, Message = $"Error al redistribuir: {ex.Message}" };
            }
        }

        /// <summary>
        /// Revierte una redistribución de cuotas vencidas, restaurando los valores originales.
        /// </summary>
        public async Task<ServiceResult<string>> UndoRedistribution(int saleId)
        {
            try
            {
                var sale = await _context.Sales.Include(s => s.plan).FirstOrDefaultAsync(s => s.id_Sales == saleId);
                if (sale == null)
                    return new ServiceResult<string> { Success = false, Message = "Venta no encontrada." };

                if (string.IsNullOrEmpty(sale.RedistributionType))
                    return new ServiceResult<string> { Success = false, Message = "Esta venta no tiene redistribución activa." };

                Console.WriteLine($"[UndoRedistribution] 🔄 Revirtiendo redistribución para venta {saleId}");

                // ✅ RESTAURAR quota_value a su valor original
                if (sale.OriginalQuotaValue.HasValue)
                {
                    Console.WriteLine($"[UndoRedistribution] Restaurando quota_value:");
                    Console.WriteLine($"  - Actual: {sale.quota_value:C}");
                    Console.WriteLine($"  - Original: {sale.OriginalQuotaValue:C}");
                    sale.quota_value = sale.OriginalQuotaValue.Value;
                }

                // ✅ RESTAURAR CustomQuotasJson si existe (para planes personalizados)
                if (!string.IsNullOrEmpty(sale.CustomQuotasJson) && sale.OriginalQuotaValue.HasValue)
                {
                    try
                    {
                        var customQuotasElement = JsonSerializer.Deserialize<JsonElement>(sale.CustomQuotasJson);
                        if (customQuotasElement.ValueKind == JsonValueKind.Array)
                        {
                            var restoredQuotas = new List<Dictionary<string, object>>();
                            var originalAmount = sale.OriginalQuotaValue.Value;

                            foreach (var quotaElement in customQuotasElement.EnumerateArray())
                            {
                                var quotaDict = new Dictionary<string, object>();
                                
                                if (quotaElement.TryGetProperty("QuotaNumber", out var qnElem))
                                    quotaDict["QuotaNumber"] = qnElem.GetInt32();
                                if (quotaElement.TryGetProperty("DueDate", out var ddElem))
                                    quotaDict["DueDate"] = ddElem.GetString();

                                // ✅ RESTAURAR Amount a original para TODAS las cuotas
                                quotaDict["Amount"] = originalAmount;
                                restoredQuotas.Add(quotaDict);
                            }

                            sale.CustomQuotasJson = JsonSerializer.Serialize(restoredQuotas);
                            Console.WriteLine($"[UndoRedistribution] ✅ CustomQuotasJson restaurado para plan personalizado");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[UndoRedistribution] ⚠️ Error al restaurar CustomQuotasJson: {ex.Message}");
                    }
                }

                // Limpiar propiedades de redistribución
                sale.RedistributionType = null;
                sale.FromQuotaRange = null;
                sale.ToQuotaRange = null;
                sale.NewQuotaValue = null;
                sale.LastQuotaValue = null;
                sale.RedistributedQuotaNumbers = null; // JSON con received y overdue
                sale.RedistributionAmount = null;

                Console.WriteLine($"[UndoRedistribution] ✅ Propiedades de redistribución limpiadas:");
                Console.WriteLine($"  - RedistributionType: null");
                Console.WriteLine($"  - FromQuotaRange: null");
                Console.WriteLine($"  - ToQuotaRange: null");
                Console.WriteLine($"  - NewQuotaValue: null");
                Console.WriteLine($"  - LastQuotaValue: null");
                Console.WriteLine($"  - RedistributedQuotaNumbers: null");
                Console.WriteLine($"  - RedistributionAmount: null");

                // ✅ RESTAURAR TABLA QUOTAS: Revertir cambios de redistribución
                Console.WriteLine($"[UndoRedistribution] 📋 Restaurando tabla Quotas...");
                
                // Parsear el JSON con los números de cuotas vencidas y receptoras
                var allQuotas = await _context.Quotas.Where(q => q.id_sale == saleId).ToListAsync();
                
                foreach (var quota in allQuotas)
                {
                    // Cuotas marcadas como "Distribuida": restaurar a "Vencida" y amount original
                    if (quota.status == "Distribuida" && quota.redistributed_amount.HasValue)
                    {
                        quota.current_amount = quota.redistributed_amount.Value;
                        quota.status = "Vencida";
                        quota.redistributed_amount = null;
                        quota.updated_at = DateTime.Now;
                        Console.WriteLine($"  ✓ Cuota {quota.quota_number}: restaurada a 'Vencida' con monto ${quota.current_amount:F2}");
                    }
                    // Otras cuotas: restaurar amount al original (amount sin modificar)
                    else if (quota.current_amount != quota.amount)
                    {
                        quota.current_amount = quota.amount;
                        quota.updated_at = DateTime.Now;
                        Console.WriteLine($"  ✓ Cuota {quota.quota_number}: restaurada a monto original ${quota.current_amount:F2}");
                    }
                }
                
                _context.Quotas.UpdateRange(allQuotas);

                _context.Sales.Update(sale);
                await _context.SaveChangesAsync();

                Console.WriteLine($"[UndoRedistribution] ✅ Redistribución revertida exitosamente para venta {saleId}");
                return new ServiceResult<string> { Success = true, Message = "Redistribución revertida exitosamente." };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UndoRedistribution] ❌ Error: {ex.Message}");
                return new ServiceResult<string> { Success = false, Message = $"Error al revertir: {ex.Message}" };
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

        // ✅ NUEVO: Métodos para redistribución usando tabla Quotas

        /// <summary>
        /// Redistribuye cuotas vencidas entre cuotas pendientes usando la tabla Quotas
        /// </summary>
        public async Task<ServiceResult<string>> RedistributeOverdueQuotasWithTableAsync(int saleId, RedistributeQuotasRequest request)
        {
            try
            {
                Console.WriteLine($"\n[RedistributeOverdueQuotas] 📊 Iniciando redistribución para venta {saleId}");
                Console.WriteLine($"  - Modo: {request.redistributionType}");
                Console.WriteLine($"  - Cuotas vencidas: {string.Join(", ", request.overdueQuotas.Select(q => q.quotaNumber))}");

                var sale = await _context.Sales
                    .Include(s => s.quotas)
                    .FirstOrDefaultAsync(s => s.id_Sales == saleId);

                if (sale == null)
                    return new ServiceResult<string> { Success = false, Message = "Venta no encontrada" };

                // Obtener cuotas vencidas y pendientes
                var quotas = sale.quotas?.ToList() ?? await GetQuotasBySaleIdAsync(saleId);
                var overdueQuotaNumbers = request.overdueQuotas.Select(q => q.quotaNumber).ToList();
                var pendingQuotas = quotas.Where(q => q.status == "Pending" && !overdueQuotaNumbers.Contains(q.quota_number)).ToList();
                
                if (pendingQuotas.Count == 0)
                    return new ServiceResult<string> { Success = false, Message = "No hay cuotas pendientes disponibles para redistribución" };

                decimal totalAmount = request.overdueQuotas.Sum(q => q.remainingAmount);
                Console.WriteLine($"  - Total a redistribuir: ${totalAmount:N2}");

                // Marcar cuotas vencidas como "Distribuida"
                foreach (var overdueNum in overdueQuotaNumbers)
                {
                    var overdueQuota = quotas.FirstOrDefault(q => q.quota_number == overdueNum);
                    if (overdueQuota != null)
                    {
                        overdueQuota.status = "Distribuida";
                        overdueQuota.last_modified = DateTime.Now;
                        _context.Quotas.Update(overdueQuota);
                    }
                }

                // Redistribuir según estrategia
                if (request.redistributionType == "lastQuota")
                {
                    // Distribuir todo a la última cuota pendiente
                    var lastQuota = pendingQuotas.OrderByDescending(q => q.quota_number).First();
                    lastQuota.current_amount += totalAmount;
                    lastQuota.redistributed_amount = totalAmount;
                    lastQuota.last_modified = DateTime.Now;
                    _context.Quotas.Update(lastQuota);
                    
                    Console.WriteLine($"  - Distribuido ${totalAmount:N2} a cuota #{lastQuota.quota_number}");
                }
                else if (request.redistributionType == "custom")
                {
                    // Distribuir equitativamente entre N cuotas
                    var numQuotas = Math.Max(request.numQuotasToDistribute ?? 1, 1);
                    var targetQuotas = pendingQuotas.OrderByDescending(q => q.quota_number).Take(numQuotas).ToList();
                    var amountPerQuota = totalAmount / targetQuotas.Count;

                    foreach (var quota in targetQuotas)
                    {
                        quota.current_amount += amountPerQuota;
                        quota.redistributed_amount = (quota.redistributed_amount ?? 0) + amountPerQuota;
                        quota.last_modified = DateTime.Now;
                        _context.Quotas.Update(quota);
                        
                        Console.WriteLine($"  - Distribuido ${amountPerQuota:N2} a cuota #{quota.quota_number}");
                    }
                }

                // Guardar cambios
                await _context.SaveChangesAsync();

                // Actualizar campos de metadata en Sale
                sale.RedistributionType = request.redistributionType;
                sale.RedistributionAmount = totalAmount;
                sale.FromQuotaRange = overdueQuotaNumbers.Min();
                sale.ToQuotaRange = overdueQuotaNumbers.Max();
                sale.NewQuotaValue = pendingQuotas.FirstOrDefault()?.current_amount;
                sale.OriginalQuotaValue = pendingQuotas.FirstOrDefault()?.amount;

                _context.Sales.Update(sale);
                await _context.SaveChangesAsync();

                Console.WriteLine($"[RedistributeOverdueQuotas] ✅ Redistribución completada exitosamente");
                return new ServiceResult<string> 
                { 
                    Success = true, 
                    Message = "Redistribución completada exitosamente",
                    Data = $"Se redistribuyeron ${totalAmount:N2}"
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[RedistributeOverdueQuotas] ❌ Error: {ex.Message}");
                return new ServiceResult<string> { Success = false, Message = $"Error: {ex.Message}" };
            }
        }

        /// <summary>
        /// Revierte una redistribución usando la tabla Quotas
        /// </summary>
        public async Task<ServiceResult<string>> UndoRedistributionWithTableAsync(int saleId)
        {
            try
            {
                Console.WriteLine($"[UndoRedistribution] ⏮️ Revirtiendo redistribución para venta {saleId}");

                var sale = await _context.Sales
                    .Include(s => s.quotas)
                    .FirstOrDefaultAsync(s => s.id_Sales == saleId);

                if (sale == null)
                    return new ServiceResult<string> { Success = false, Message = "Venta no encontrada" };

                var quotas = sale.quotas?.ToList() ?? await GetQuotasBySaleIdAsync(saleId);

                // Restaurar cuotas marcadas como "Distribuida" a "Pending"
                var distribuidas = quotas.Where(q => q.status == "Distribuida").ToList();
                foreach (var quota in distribuidas)
                {
                    quota.status = "Pending";
                    quota.redistributed_amount = 0;
                    quota.last_modified = DateTime.Now;
                    _context.Quotas.Update(quota);
                }

                // Restaurar montos originales en cuotas que recibieron redistribución
                foreach (var quota in quotas)
                {
                    if (quota.redistributed_amount.HasValue && quota.redistributed_amount > 0)
                    {
                        quota.current_amount = quota.amount; // Restaurar al monto original
                        quota.redistributed_amount = 0;
                        quota.last_modified = DateTime.Now;
                        _context.Quotas.Update(quota);
                        
                        Console.WriteLine($"  - Restaurada cuota #{quota.quota_number}: ${quota.amount:N2}");
                    }
                }

                await _context.SaveChangesAsync();

                // Limpiar propiedades de redistribución en Sale
                sale.RedistributionType = null;
                sale.RedistributionAmount = null;
                sale.FromQuotaRange = null;
                sale.ToQuotaRange = null;
                sale.NewQuotaValue = null;
                sale.OriginalQuotaValue = null;
                sale.RedistributedQuotaNumbers = null;

                _context.Sales.Update(sale);
                await _context.SaveChangesAsync();

                Console.WriteLine($"[UndoRedistribution] ✅ Redistribución revertida exitosamente");
                return new ServiceResult<string> 
                { 
                    Success = true, 
                    Message = "Redistribución revertida exitosamente" 
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UndoRedistribution] ❌ Error: {ex.Message}");
                return new ServiceResult<string> { Success = false, Message = $"Error: {ex.Message}" };
            }
        }

        /// <summary>
        /// ✅ NUEVO: Migra TODAS las ventas con customQuotasJson a la tabla Quotas
        /// Útil para hacer la migración en bulk sin afectar la aplicación
        /// </summary>
        public async Task<ServiceResult<MigrationSummary>> MigrateAllQuotasAsync()
        {
            try
            {
                Console.WriteLine("\n[MigrateAllQuotas] 🔄 Iniciando migración bulk de todas las ventas...");
                
                var summary = new MigrationSummary
                {
                    TotalSales = 0,
                    MigratedSales = 0,
                    SkippedSales = 0,
                    ErrorSales = 0,
                    Errors = new List<string>()
                };

                // Encontrar ventas con customQuotasJson
                var salesToMigrate = await _context.Sales
                    .Where(s => !string.IsNullOrEmpty(s.CustomQuotasJson))
                    .ToListAsync();

                summary.TotalSales = salesToMigrate.Count;
                Console.WriteLine($"[MigrateAllQuotas] 📊 Encontradas {summary.TotalSales} ventas para migrar");

                foreach (var sale in salesToMigrate)
                {
                    try
                    {
                        // Verificar si ya tiene cuotas migradas
                        var existingQuotas = await _context.Quotas
                            .Where(q => q.id_sale == sale.id_Sales)
                            .CountAsync();

                        if (existingQuotas > 0)
                        {
                            Console.WriteLine($"  ⏭️  Sale {sale.id_Sales}: Ya tiene {existingQuotas} cuotas migradas, saltando...");
                            summary.SkippedSales++;
                            continue;
                        }

                        // Migrar desde CustomQuotasJson
                        var customQuotas = JsonSerializer.Deserialize<List<CustomQuota>>(sale.CustomQuotasJson);
                        if (customQuotas != null && customQuotas.Count > 0)
                        {
                            foreach (var customQuota in customQuotas)
                            {
                                var quota = new Quota
                                {
                                    id_sale = sale.id_Sales,
                                    quota_number = customQuota.QuotaNumber,
                                    amount = customQuota.Amount,
                                    current_amount = customQuota.Amount,
                                    due_date = customQuota.DueDate ?? DateTime.Now.AddMonths(customQuota.QuotaNumber),
                                    status = "Pending",
                                    created_at = DateTime.Now
                                };
                                _context.Quotas.Add(quota);
                            }

                            await _context.SaveChangesAsync();
                            Console.WriteLine($"  ✅ Sale {sale.id_Sales}: {customQuotas.Count} cuotas migradas");
                            summary.MigratedSales++;
                        }
                        else
                        {
                            Console.WriteLine($"  ⚠️  Sale {sale.id_Sales}: CustomQuotasJson vacío");
                            summary.SkippedSales++;
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"  ❌ Sale {sale.id_Sales}: Error - {ex.Message}");
                        summary.ErrorSales++;
                        summary.Errors.Add($"Sale {sale.id_Sales}: {ex.Message}");
                    }
                }

                Console.WriteLine($"\n[MigrateAllQuotas] ✅ Migración completada:");
                Console.WriteLine($"  - Total procesadas: {summary.TotalSales}");
                Console.WriteLine($"  - Migradas exitosamente: {summary.MigratedSales}");
                Console.WriteLine($"  - Saltadas (ya migradas): {summary.SkippedSales}");
                Console.WriteLine($"  - Con errores: {summary.ErrorSales}");

                return new ServiceResult<MigrationSummary>
                {
                    Success = summary.ErrorSales == 0,
                    Message = $"Migración completada: {summary.MigratedSales} migradas, {summary.SkippedSales} saltadas, {summary.ErrorSales} errores",
                    Data = summary
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MigrateAllQuotas] ❌ Error crítico: {ex.Message}");
                return new ServiceResult<MigrationSummary>
                {
                    Success = false,
                    Message = $"Error en migración bulk: {ex.Message}",
                    Data = null
                };
            }
        }
    }

    /// <summary>
    /// DTO para reporte de migración bulk
    /// </summary>
    public class MigrationSummary
    {
        public int TotalSales { get; set; }
        public int MigratedSales { get; set; }
        public int SkippedSales { get; set; }
        public int ErrorSales { get; set; }
        public List<string> Errors { get; set; }
    }
}
