using Microsoft.EntityFrameworkCore;
using mym_softcom.Models;
using System.Text.Json;

namespace mym_softcom.Services
{
    public interface IOverdueDetectionService
    {
        Task<List<ClientOverdueInfo>> GetClientsWithOverdueInstallmentsAsync();
        Task<List<CalculatedInstallment>> GetOverdueInstallmentsBySaleAsync(int saleId);
        Task<List<CalculatedInstallment>> CalculateInstallmentsForSaleAsync(int saleId);
        Task<bool> ShouldSendNotificationAsync(int clientId);
        Task UpdateLastNotificationSentAsync(int clientId);
    }

    public class OverdueDetectionService : IOverdueDetectionService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<OverdueDetectionService> _logger;

        public OverdueDetectionService(AppDbContext context, ILogger<OverdueDetectionService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// ✅ NUEVO: Calcula la fecha de vencimiento ajustándola al último día del mes si es necesario
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

        public async Task<List<ClientOverdueInfo>> GetClientsWithOverdueInstallmentsAsync()
        {
            var clientsWithOverdue = new List<ClientOverdueInfo>();

            // Obtener todas las ventas activas con sus relaciones
            var activeSales = await _context.Sales
                .Include(s => s.client)
                .Include(s => s.plan)
                .Include(s => s.lot)
                    .ThenInclude(l => l.project)
                .Where(s => s.status == "Active" && s.total_debt > 0)
                .ToListAsync();

            foreach (var sale in activeSales)
            {
                var overdueInstallments = await GetOverdueInstallmentsBySaleAsync(sale.id_Sales);

                if (overdueInstallments.Any())
                {
                    var existingClientInfo = clientsWithOverdue
                        .FirstOrDefault(c => c.Client.id_Clients == sale.client.id_Clients);

                    if (existingClientInfo == null)
                    {
                        clientsWithOverdue.Add(new ClientOverdueInfo
                        {
                            Client = sale.client,
                            OverdueInstallments = overdueInstallments,
                            TotalOverdueAmount = overdueInstallments.Sum(i => i.Balance),
                            TotalOverdueQuotas = overdueInstallments.Count
                        });
                    }
                    else
                    {
                        existingClientInfo.OverdueInstallments.AddRange(overdueInstallments);
                        existingClientInfo.TotalOverdueAmount += overdueInstallments.Sum(i => i.Balance);
                        existingClientInfo.TotalOverdueQuotas += overdueInstallments.Count;
                    }
                }
            }

            return clientsWithOverdue;
        }

        public async Task<List<CalculatedInstallment>> GetOverdueInstallmentsBySaleAsync(int saleId)
        {
            var allInstallments = await CalculateInstallmentsForSaleAsync(saleId);
            var today = DateTime.Now.Date;

            return allInstallments
                .Where(i => i.DueDate.Date < today && i.Status != "Pagado" && i.Status != "Distribuida")
                .ToList();
        }

        public async Task<List<CalculatedInstallment>> CalculateInstallmentsForSaleAsync(int saleId)
        {
            var sale = await _context.Sales
                .Include(s => s.client)
                .Include(s => s.plan)
                .Include(s => s.lot)
                    .ThenInclude(l => l.project)
                .FirstOrDefaultAsync(s => s.id_Sales == saleId);

            if (sale == null || sale.plan == null)
                return new List<CalculatedInstallment>();

            List<int> redistributedQuotaNumbers = new List<int>();
            if (!string.IsNullOrEmpty(sale.RedistributedQuotaNumbers))
            {
                try
                {
                    redistributedQuotaNumbers = JsonSerializer.Deserialize<List<int>>(sale.RedistributedQuotaNumbers) ?? new List<int>();
                    _logger.LogDebug("Sale {SaleId} has redistributed quotas: {QuotaNumbers}", saleId, string.Join(", ", redistributedQuotaNumbers));
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error deserializing redistributed quota numbers for sale {SaleId}", saleId);
                }
            }

            // ✅ NUEVO: Cargar cuotas personalizadas con fechas de vencimiento
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
                        _logger.LogDebug("Sale {SaleId} has {Count} custom quotas with dates", saleId, customQuotas.Count);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error deserializing custom quotas for sale {SaleId}", saleId);
                }
            }

            // Obtener todos los detalles de pagos para esta venta
            var paymentDetails = await _context.Details
                .Where(d => d.id_Sales == saleId)
                .GroupBy(d => d.number_quota)
                .Select(g => new
                {
                    QuotaNumber = g.Key,
                    TotalPaid = g.Sum(d => d.covered_amount ?? 0)
                })
                .ToDictionaryAsync(x => x.QuotaNumber, x => x.TotalPaid);

            var installments = new List<CalculatedInstallment>();
            var quotaValue = sale.quota_value ?? 0;
            var totalQuotas = sale.plan.number_quotas ?? 0;

            for (int i = 1; i <= totalQuotas; i++)
            {
                var paidAmount = paymentDetails.GetValueOrDefault(i, 0);
                decimal currentQuotaValue;
                DateTime dueDate;

                if (customQuotaData != null && customQuotaData.ContainsKey(i))
                {
                    var customData = customQuotaData[i];
                    currentQuotaValue = customData.Amount;

                    if (customData.DueDate.HasValue)
                    {
                        dueDate = customData.DueDate.Value;
                        _logger.LogDebug("Quota {QuotaNumber} for sale {SaleId}: Using custom due date {DueDate:yyyy-MM-dd}",
                            i, saleId, dueDate);
                    }
                    else
                    {
                        dueDate = CalculateDueDateWithMonthEndAdjustment(sale.sale_date, i);
                        _logger.LogDebug("Quota {QuotaNumber} for sale {SaleId}: Custom quota without DueDate, calculated {DueDate:yyyy-MM-dd}",
                            i, saleId, dueDate);
                    }
                }
                else
                {
                    currentQuotaValue = quotaValue;
                    dueDate = CalculateDueDateWithMonthEndAdjustment(sale.sale_date, i);
                }

                var balance = currentQuotaValue - paidAmount;
                var today = DateTime.Now.Date;

                string status;

                if (redistributedQuotaNumbers.Contains(i))
                {
                    status = "Distribuida";
                    _logger.LogDebug("Quota {QuotaNumber} for sale {SaleId} marked as Distribuida", i, saleId);
                }
                else if (balance <= 0)
                    status = "Pagado";
                else if (dueDate.Date < today)
                    status = "Mora";
                else if (paidAmount > 0)
                    status = "Abonado";
                else
                    status = "Pendiente";

                // ✅ CORRECCIÓN: Cálculo más preciso de días de atraso
                var daysOverdue = 0;
                if (dueDate.Date < today && status != "Distribuida")
                {
                    daysOverdue = (int)(today - dueDate.Date).TotalDays;

                    // Log para debug
                    _logger.LogDebug("Cuota {QuotaNumber}: Vencimiento={DueDate:yyyy-MM-dd}, Hoy={Today:yyyy-MM-dd}, Días={Days}",
                        i, dueDate.Date, today, daysOverdue);
                }

                installments.Add(new CalculatedInstallment
                {
                    QuotaNumber = i,
                    QuotaValue = currentQuotaValue,
                    PaidAmount = paidAmount,
                    Balance = Math.Max(0, balance),
                    DueDate = dueDate,
                    Status = status,
                    DaysOverdue = daysOverdue,
                    Sale = sale,
                    Client = sale.client
                });
            }

            return installments;
        }

        public async Task<bool> ShouldSendNotificationAsync(int clientId)
        {
            // ✅ MEJORA: Control de frecuencia de notificaciones
            // Por ahora permitimos envío diario, pero puedes ajustar la lógica

            // Aquí podrías implementar lógica más sofisticada como:
            // - Enviar solo una vez por semana
            // - Enviar solo si han pasado X días desde la última notificación
            // - Escalar frecuencia según días de atraso

            return true; // Por ahora siempre permite envío
        }

        public async Task UpdateLastNotificationSentAsync(int clientId)
        {
            // Aquí actualizarías el registro de última notificación enviada
            _logger.LogInformation("Notificación registrada para cliente {ClientId} en {Date}",
                clientId, DateTime.Now);
        }
    }
}
