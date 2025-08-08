using Microsoft.EntityFrameworkCore;
using mym_softcom.Models;

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
                .Where(i => i.DueDate.Date < today && i.Status != "Pagado")
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
                var balance = quotaValue - paidAmount;
                var dueDate = sale.sale_date.AddMonths(i);
                var today = DateTime.Now.Date;

                string status;
                if (balance <= 0)
                    status = "Pagado";
                else if (dueDate.Date < today)
                    status = "Mora";
                else if (paidAmount > 0)
                    status = "Abonado";
                else
                    status = "Pendiente";

                // ✅ CORRECCIÓN: Cálculo más preciso de días de atraso
                var daysOverdue = 0;
                if (dueDate.Date < today)
                {
                    daysOverdue = (int)(today - dueDate.Date).TotalDays;

                    // Log para debug
                    _logger.LogDebug("Cuota {QuotaNumber}: Vencimiento={DueDate:yyyy-MM-dd}, Hoy={Today:yyyy-MM-dd}, Días={Days}",
                        i, dueDate.Date, today, daysOverdue);
                }

                installments.Add(new CalculatedInstallment
                {
                    QuotaNumber = i,
                    QuotaValue = quotaValue,
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
