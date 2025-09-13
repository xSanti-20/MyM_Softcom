using Microsoft.AspNetCore.Mvc;
using mym_softcom.Models;
using mym_softcom.Services;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq;

namespace mym_softcom.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly PaymentServices _paymentServices;
        private readonly SaleServices _saleServices;
        private readonly ClientServices _clientServices;
        private readonly WithdrawalServices _withdrawalServices;

        public DashboardController(
            AppDbContext context,
            PaymentServices paymentServices,
            SaleServices saleServices,
            ClientServices clientServices,
            WithdrawalServices withdrawalServices)
        {
            _context = context;
            _paymentServices = paymentServices;
            _saleServices = saleServices;
            _clientServices = clientServices;
            _withdrawalServices = withdrawalServices;
        }

        /// <summary>
        /// Obtiene las estadísticas principales del dashboard
        /// </summary>
        [HttpGet("GetMainStats")]
        public async Task<ActionResult<object>> GetMainStats()
        {
            try
            {
                var currentMonth = DateTime.Now.Month;
                var currentYear = DateTime.Now.Year;

                // Clientes activos
                var activeClients = await _context.Clients
                    .Where(c => c.status == "Activo")
                    .CountAsync();

                // CLIENTES EN MORA - Implementación basada en fechas de vencimiento de cuotas
                var currentDate = DateTime.Now.Date;

                // Obtener todas las ventas activas con sus detalles de pago
                var activeSalesWithDetails = await _context.Sales
                    .Include(s => s.client)
                    .Include(s => s.plan)
                    .Where(s => s.status == "Active" && s.total_debt > 0)
                    .ToListAsync();

                var overdueClientIds = new HashSet<int>();
                decimal totalOwedByOverdueClients = 0;

                foreach (var sale in activeSalesWithDetails)
                {
                    if (sale.plan?.number_quotas > 0 && sale.quota_value > 0)
                    {
                        var saleDate = sale.sale_date.Date;
                        var quotaValue = sale.quota_value.Value;
                        var totalQuotas = sale.plan.number_quotas.Value;

                        // Obtener detalles de pagos para esta venta
                        var paymentDetails = await _context.Details
                            .Where(pd => pd.id_Sales == sale.id_Sales)
                            .ToListAsync();

                        // Calcular montos cubiertos por cuota
                        var coveredAmountsPerQuota = paymentDetails
                            .GroupBy(pd => pd.number_quota)
                            .ToDictionary(g => g.Key, g => g.Sum(pd => pd.covered_amount ?? 0));

                        // Verificar cada cuota para determinar si hay mora
                        bool hasOverdueQuotas = false;
                        decimal overdueAmountForThisSale = 0;

                        for (int i = 1; i <= totalQuotas; i++)
                        {
                            // Calcular fecha de vencimiento de la cuota
                            var dueDate = saleDate.AddMonths(i);
                            var coveredAmount = coveredAmountsPerQuota.GetValueOrDefault(i, 0);
                            var remainingAmount = quotaValue - coveredAmount;

                            // Si la cuota está vencida y no está completamente pagada
                            if (dueDate < currentDate && remainingAmount > 0)
                            {
                                hasOverdueQuotas = true;
                                overdueAmountForThisSale += remainingAmount;
                            }
                        }

                        // Si esta venta tiene cuotas vencidas, agregar el cliente y el monto
                        if (hasOverdueQuotas)
                        {
                            overdueClientIds.Add(sale.id_Clients);
                            totalOwedByOverdueClients += overdueAmountForThisSale;
                        }
                    }
                }

                var overdueClients = overdueClientIds.Count;
                var totalOwed = totalOwedByOverdueClients;

                Console.WriteLine($"[DashboardController] Clientes en mora encontrados: {overdueClients}");
                Console.WriteLine($"[DashboardController] Total adeudado por clientes en mora: ${totalOwed}");

                // Desistimientos del mes actual
                var withdrawalsThisMonth = await _context.Withdrawals
                    .Where(w => w.withdrawal_date.Month == currentMonth &&
                               w.withdrawal_date.Year == currentYear)
                    .CountAsync();

                // Recaudo total del mes (pagos del mes actual) - Este es solo de pagos del mes
                var monthlyRevenue = await _context.Payments
                    .Where(p => p.payment_date.Month == currentMonth &&
                               p.payment_date.Year == currentYear)
                    .SumAsync(p => p.amount ?? 0);

                // NOTA: La suma de penalizaciones no se expone aquí directamente,
                // ya que se espera que afecte el 'total_raised' de la venta o se maneje internamente.

                return Ok(new
                {
                    activeClients,
                    overdueClients,
                    totalOwed,
                    withdrawalsThisMonth,
                    monthlyRevenue // Recaudo de pagos del mes actual
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al obtener estadísticas principales", details = ex.Message });
            }
        }

        [HttpGet("GetProjectRevenue")]
        public IActionResult GetProjectRevenue()
        {
            try
            {
                var currentMonth = DateTime.Now.Month;
                var currentYear = DateTime.Now.Year;
                var projects = _context.Projects.ToList();

                var result = projects.Select(project =>
                {
                    // Pagos del mes
                    var totalPayments = _context.Payments
                        .Where(p => p.sale != null &&
                                    p.sale.lot != null &&
                                    p.sale.lot.id_Projects == project.id_Projects &&
                                    p.payment_date.Month == currentMonth &&
                                    p.payment_date.Year == currentYear)
                        .Sum(p => (decimal?)p.amount) ?? 0;

                    // Devoluciones (monto a devolver al cliente) del mes
                    var totalRefunds = _context.Withdrawals
                        .Where(w => w.sale != null &&
                                    w.sale.lot != null &&
                                    w.sale.lot.id_Projects == project.id_Projects &&
                                    w.withdrawal_date.Month == currentMonth &&
                                    w.withdrawal_date.Year == currentYear)
                        .Sum(w => (decimal?)(w.sale.total_value * 0.10m)) ?? 0;

                    // ✅ Neto del mes = Pagos – Devoluciones
                    decimal totalRevenue = totalPayments - totalRefunds;

                    return new
                    {
                        projectId = project.id_Projects,
                        projectName = project.name,
                        totalRevenue
                    };
                }).ToList();

                var totalGeneralRevenue = result.Sum(r => r.totalRevenue);

                return Ok(new
                {
                    projects = result,
                    totalGeneralRevenue 
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Error al obtener recaudo mensual: {ex.Message}" });
            }
        }


        /// <summary>
        /// Obtiene los recaudos históricos mensuales por proyecto para el AÑO ACTUAL.
        /// CORREGIDO: Ahora calcula los pagos reales de cada mes, no el total_raised actual.
        /// </summary>
        [HttpGet("GetHistoricalProjectRevenue")]
        public IActionResult GetHistoricalProjectRevenue()
        {
            try
            {
                var currentYear = DateTime.Now.Year;
                int currentMonth = DateTime.Now.Month;

                var projects = _context.Projects.ToList();

                var data = Enumerable.Range(1, currentMonth).Select(month =>
                {
                    var row = new Dictionary<string, object>
            {
                { "month", month },
                { "year", currentYear }
            };

                    foreach (var project in projects)
                    {
                        // Pagos en ese mes
                        var totalPayments = _context.Payments
                            .Where(p => p.sale != null &&
                                        p.sale.lot != null &&
                                        p.sale.lot.id_Projects == project.id_Projects &&
                                        p.payment_date.Month == month &&
                                        p.payment_date.Year == currentYear)
                            .Sum(p => (decimal?)p.amount) ?? 0;

                        // Devoluciones en ese mes (10% del valor total de la venta desistida)
                        var totalRefunds = _context.Withdrawals
                            .Where(w => w.sale != null &&
                                        w.sale.lot != null &&
                                        w.sale.lot.id_Projects == project.id_Projects &&
                                        w.withdrawal_date.Month == month &&
                                        w.withdrawal_date.Year == currentYear)
                            .Sum(w => (decimal?)(w.sale.total_value * 0.10m)) ?? 0;

                        // ✅ Neto del mes = Pagos – Devoluciones
                        decimal totalRevenue = totalPayments - totalRefunds;

                        row[project.name] = totalRevenue;
                    }

                    return row;
                })
                // 👇 De más reciente a más antiguo
                .OrderByDescending(r => (int)r["month"])
                .ToList();

                return Ok(new
                {
                    historicalData = data,
                    projectNames = projects.Select(p => p.name).ToList()
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Error al obtener recaudos históricos: {ex.Message}" });
            }
        }



        /// <summary>
        /// Obtiene los últimos pagos con información completa
        /// </summary>
        [HttpGet("GetRecentPayments")]
        public async Task<ActionResult<object>> GetRecentPayments([FromQuery] int limit = 10)
        {
            try
            {
                var recentPayments = await _context.Payments
                    .Include(p => p.sale)
                    .ThenInclude(s => s.client)
                    .Include(p => p.sale)
                    .ThenInclude(s => s.lot)
                    .ThenInclude(l => l.project)
                    .OrderByDescending(p => p.payment_date)
                    .Take(limit)
                    .Select(p => new {
                        id = p.id_Payments,
                        clientName = $"{p.sale.client.names} {p.sale.client.surnames}",
                        projectName = p.sale.lot.project.name,
                        amount = p.amount,
                        paymentDate = p.payment_date,
                        paymentMethod = p.payment_method,
                        saleStatus = p.sale.status
                    })
                    .ToListAsync();

                return Ok(recentPayments);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al obtener pagos recientes", details = ex.Message });
            }
        }

        /// <summary>
        /// Obtiene actividad reciente (pagos y desistimientos)
        /// </summary>
        [HttpGet("GetRecentActivity")]
        public async Task<ActionResult<object>> GetRecentActivity([FromQuery] int limit = 8)
        {
            try
            {
                // Obtener pagos recientes
                var recentPayments = await _context.Payments
                    .Include(p => p.sale)
                    .ThenInclude(s => s.client)
                    .OrderByDescending(p => p.payment_date)
                    .Take(limit / 2)
                    .Select(p => new {
                        type = "payment",
                        action = "Pago registrado",
                        details = $"{p.sale.client.names} {p.sale.client.surnames} - ${p.amount:N0}",
                        date = p.payment_date,
                        color = "green"
                    })
                    .ToListAsync();

                // Obtener desistimientos recientes
                var recentWithdrawals = await _context.Withdrawals
                    .Include(w => w.sale)
                    .ThenInclude(s => s.client)
                    .OrderByDescending(w => w.withdrawal_date)
                    .Take(limit / 2)
                    .Select(w => new {
                        type = "withdrawal",
                        action = "Desistimiento registrado",
                        details = $"{w.sale.client.names} {w.sale.client.surnames} - {w.reason}",
                        date = w.withdrawal_date,
                        color = "red"
                    })
                    .ToListAsync();

                // Combinar y ordenar por fecha
                var allActivity = recentPayments.Cast<object>()
                    .Concat(recentWithdrawals.Cast<object>())
                    .OrderByDescending(a => ((dynamic)a).date)
                    .Take(limit)
                    .ToList();

                return Ok(allActivity);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al obtener actividad reciente", details = ex.Message });
            }
        }

        /// <summary>
        /// Obtiene clientes con cuotas vencidas (en mora) basado en fechas de vencimiento
        /// </summary>
        [HttpGet("GetOverdueClients")]
        public async Task<ActionResult<object>> GetOverdueClients()
        {
            try
            {
                var currentDate = DateTime.Now.Date;
                var overdueClients = new List<object>();

                // Obtener todas las ventas activas con deuda pendiente
                var activeSalesWithDetails = await _context.Sales
                    .Include(s => s.client)
                    .Include(s => s.plan)
                    .Include(s => s.lot)
                    .ThenInclude(l => l.project)
                    .Where(s => s.status == "Active" && s.total_debt > 0)
                    .ToListAsync();

                foreach (var sale in activeSalesWithDetails)
                {
                    if (sale.plan?.number_quotas > 0 && sale.quota_value > 0)
                    {
                        var saleDate = sale.sale_date.Date;
                        var quotaValue = sale.quota_value.Value;
                        var totalQuotas = sale.plan.number_quotas.Value;

                        // Obtener detalles de pagos para esta venta
                        var paymentDetails = await _context.Details
                            .Where(pd => pd.id_Sales == sale.id_Sales)
                            .ToListAsync();

                        // Calcular montos cubiertos por cuota
                        var coveredAmountsPerQuota = paymentDetails
                            .GroupBy(pd => pd.number_quota)
                            .ToDictionary(g => g.Key, g => g.Sum(pd => pd.covered_amount ?? 0));

                        // Verificar cuotas vencidas
                        var overdueQuotas = new List<object>();
                        decimal totalOverdueAmount = 0;

                        for (int i = 1; i <= totalQuotas; i++)
                        {
                            var dueDate = saleDate.AddMonths(i);
                            var coveredAmount = coveredAmountsPerQuota.GetValueOrDefault(i, 0);
                            var remainingAmount = quotaValue - coveredAmount;

                            if (dueDate < currentDate && remainingAmount > 0)
                            {
                                overdueQuotas.Add(new
                                {
                                    quotaNumber = i,
                                    dueDate = dueDate,
                                    quotaValue = quotaValue,
                                    coveredAmount = coveredAmount,
                                    remainingAmount = remainingAmount,
                                    daysOverdue = (currentDate - dueDate).Days
                                });
                                totalOverdueAmount += remainingAmount;
                            }
                        }

                        // Si hay cuotas vencidas, agregar el cliente a la lista
                        if (overdueQuotas.Count > 0)
                        {
                            overdueClients.Add(new
                            {
                                clientId = sale.client.id_Clients,
                                clientName = $"{sale.client.names} {sale.client.surnames}",
                                clientDocument = sale.client.document,
                                clientPhone = sale.client.phone,
                                saleId = sale.id_Sales,
                                projectName = sale.lot?.project?.name ?? "Sin proyecto",
                                lotInfo = $"{sale.lot?.block}-{sale.lot?.lot_number}",
                                totalSaleValue = sale.total_value,
                                totalRaised = sale.total_raised,
                                totalDebt = sale.total_debt,
                                overdueAmount = totalOverdueAmount,
                                overdueQuotasCount = overdueQuotas.Count,
                                overdueQuotas = overdueQuotas,
                                saleDate = sale.sale_date
                            });
                        }
                    }
                }

                // Ordenar por monto en mora (mayor a menor)
                var sortedOverdueClients = overdueClients
                    .OrderByDescending(c => ((dynamic)c).overdueAmount)
                    .ToList();

                Console.WriteLine($"[DashboardController] Clientes en mora detallados: {sortedOverdueClients.Count}");

                return Ok(sortedOverdueClients);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DashboardController] Error en GetOverdueClients: {ex.Message}");
                return StatusCode(500, new { message = "Error al obtener clientes en mora", details = ex.Message });
            }
        }
    }
}
