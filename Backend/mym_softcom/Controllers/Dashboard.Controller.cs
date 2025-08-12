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

        /// <summary>
        /// Obtiene los recaudos totales por proyecto para el MES ACTUAL (basado en pagos del mes)
        /// </summary>
        [HttpGet("GetProjectRevenue")]
        public async Task<ActionResult<object>> GetProjectRevenue()
        {
            try
            {
                Console.WriteLine($"[DashboardController] Iniciando cálculo de recaudos por proyecto para el MES ACTUAL (basado en total_raised actual de ventas con pagos del mes)");

                var currentMonth = DateTime.Now.Month;
                var currentYear = DateTime.Now.Year;
                Console.WriteLine($"[DashboardController] Buscando ventas con pagos para: Mes {currentMonth}, Año {currentYear}");

                // This ensures that withdrawals (which update total_raised) are reflected in the dashboard
                var projectRevenues = await (from payment in _context.Payments
                                             join sale in _context.Sales on payment.id_Sales equals sale.id_Sales
                                             join lot in _context.Lots on sale.id_Lots equals lot.id_Lots
                                             join project in _context.Projects on lot.id_Projects equals project.id_Projects
                                             where payment.payment_date.Month == currentMonth &&
                                                   payment.payment_date.Year == currentYear
                                             group sale by new
                                             {
                                                 ProjectId = project.id_Projects,
                                                 ProjectName = project.name,
                                                 SaleId = sale.id_Sales
                                             } into g
                                             select new
                                             {
                                                 ProjectId = g.Key.ProjectId,
                                                 ProjectName = g.Key.ProjectName,
                                                 SaleId = g.Key.SaleId,
                                                 TotalRaised = g.First().total_raised // Use current total_raised (reflects withdrawals)
                                             })
                    .GroupBy(x => new { x.ProjectId, x.ProjectName })
                    .Select(g => new {
                        projectId = g.Key.ProjectId,
                        projectName = g.Key.ProjectName,
                        monthlyRevenue = g.Sum(x => x.TotalRaised)
                    })
                    .ToListAsync();

                Console.WriteLine($"[DashboardController] Recaudos por proyecto calculados para el mes actual (considerando desistimientos):");
                foreach (var revenue in projectRevenues)
                {
                    Console.WriteLine($"[DashboardController] Proyecto: {revenue.projectName} (ID: {revenue.projectId}), Recaudo: ${revenue.monthlyRevenue}");
                }

                // Asegurar que todos los proyectos aparezcan, incluso con 0
                var allProjects = await _context.Projects.ToListAsync();
                Console.WriteLine($"[DashboardController] Total proyectos en BD: {allProjects.Count}");

                var result = allProjects.Select(project => {
                    var revenue = projectRevenues.FirstOrDefault(pr => pr.projectId == project.id_Projects);
                    var monthlyRevenue = revenue?.monthlyRevenue ?? 0;

                    Console.WriteLine($"[DashboardController] Proyecto {project.name} (ID: {project.id_Projects}): ${monthlyRevenue}");

                    return new
                    {
                        projectId = project.id_Projects,
                        projectName = project.name,
                        monthlyRevenue = monthlyRevenue
                    };
                }).ToList();

                // Calcular el total como suma de todos los proyectos del mes actual
                var totalCurrentMonthProjectRevenue = result.Sum(r => r.monthlyRevenue);
                Console.WriteLine($"[DashboardController] Recaudo total de proyectos para el mes actual: ${totalCurrentMonthProjectRevenue}");

                return Ok(new
                {
                    projects = result,
                    totalCurrentMonthRevenue = totalCurrentMonthProjectRevenue
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DashboardController] Error en GetProjectRevenue: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[DashboardController] Inner Exception: {ex.InnerException.Message}");
                }
                return StatusCode(500, new { message = "Error al obtener recaudos por proyecto del mes actual", details = ex.Message });
            }
        }

        /// <summary>
        /// Obtiene los recaudos históricos mensuales por proyecto para el AÑO ACTUAL.
        /// </summary>
        [HttpGet("GetHistoricalProjectRevenue")]
        public async Task<ActionResult<object>> GetHistoricalProjectRevenue()
        {
            try
            {
                // Simulación para pruebas: Descomenta la línea de abajo para probar con un año y mes específico
                // var currentYear = 2026;
                // var currentMonth = 1; // Enero
                // Comenta las líneas de abajo para usar la fecha actual del sistema
                var currentYear = DateTime.Now.Year;
                var currentMonth = DateTime.Now.Month;
                //var currentYear = 2026;
                //var currentMonth = 1; // Enero

                Console.WriteLine($"[DashboardController] Iniciando cálculo de recaudos históricos por proyecto para el AÑO ACTUAL: {currentYear}.");

                // Obtener todos los pagos con sus ventas, lotes y proyectos para el año actual
                var paymentsForYear = await _context.Payments
                    .Include(p => p.sale)
                        .ThenInclude(s => s.lot)
                            .ThenInclude(l => l.project)
                    .Where(p => p.sale != null && p.sale.lot != null && p.sale.lot.project != null &&
                                p.payment_date.Year == currentYear) // Filtrar por el año de la fecha de pago
                    .ToListAsync();

                Console.WriteLine($"[DashboardController] Pagos con proyectos encontrados para el año actual: {paymentsForYear.Count}");

                // Agrupar pagos por Año, Mes y Proyecto, y sumar el monto del pago
                var historicalData = paymentsForYear
                    .GroupBy(p => new {
                        Year = p.payment_date.Year,
                        Month = p.payment_date.Month,
                        ProjectId = p.sale.lot.project.id_Projects,
                        ProjectName = p.sale.lot.project.name
                    })
                    .Select(g => new {
                        g.Key.Year,
                        g.Key.Month,
                        g.Key.ProjectId,
                        g.Key.ProjectName,
                        MonthlyRevenue = g.Sum(p => p.amount ?? 0) // Sumar el monto del pago
                    })
                    .OrderBy(g => g.Year)
                    .ThenBy(g => g.Month)
                    .ToList();

                // Obtener todos los nombres de proyectos únicos para las columnas del frontend
                var allProjectNames = await _context.Projects.Select(p => p.name).Distinct().ToListAsync();

                // Preparar la estructura de datos para el frontend, incluyendo todos los meses del año hasta el actual
                var result = new List<object>();

                for (int month = 1; month <= currentMonth; month++) // Iterar desde Enero hasta el mes actual
                {
                    var monthData = new Dictionary<string, object>
                    {
                        { "month", month },
                        { "year", currentYear }
                    };

                    foreach (var projectName in allProjectNames)
                    {
                        var revenue = historicalData
                            .FirstOrDefault(hd => hd.Year == currentYear && hd.Month == month && hd.ProjectName == projectName);
                        monthData[projectName] = revenue?.MonthlyRevenue ?? 0;
                    }
                    result.Add(monthData);
                }

                // Ordenar de forma descendente por mes (más reciente primero)
                result = result.OrderByDescending(d => ((IDictionary<string, object>)d)["year"])
                               .ThenByDescending(d => ((IDictionary<string, object>)d)["month"])
                               .ToList();

                Console.WriteLine($"[DashboardController] Datos históricos por proyecto calculados para el año actual: {result.Count} meses.");

                return Ok(new
                {
                    historicalData = result,
                    projectNames = allProjectNames // Enviar los nombres de los proyectos para las columnas
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DashboardController] Error en GetHistoricalProjectRevenue: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[DashboardController] Inner Exception: {ex.InnerException.Message}");
                }
                return StatusCode(500, new { message = "Error al obtener recaudos históricos por proyecto", details = ex.Message });
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
