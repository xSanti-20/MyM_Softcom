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

                // TODO: IMPLEMENTAR LÓGICA DE CLIENTES EN MORA
                // Esta lógica debe implementarse cuando se defina cómo determinar si un cliente está en mora
                // Posibles criterios:
                // - Clientes con pagos vencidos según fechas de vencimiento
                // - Clientes con cuotas atrasadas según el plan de pagos
                // - Clientes con deuda pendiente por más de X días
                var overdueClients = 0; // Temporalmente en 0 hasta implementar la lógica

                // Total adeudado (suma de todas las deudas pendientes)
                var totalOwed = await _context.Sales
                    .Where(s => s.total_debt > 0 && s.status == "Active")
                    .SumAsync(s => s.total_debt ?? 0);

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
        /// Obtiene los recaudos totales por proyecto para el MES ACTUAL (afectado por penalizaciones)
        /// </summary>
        [HttpGet("GetProjectRevenue")]
        public async Task<ActionResult<object>> GetProjectRevenue()
        {
            try
            {
                Console.WriteLine($"[DashboardController] Iniciando cálculo de recaudos por proyecto para el MES ACTUAL (con penalizaciones)");

                var currentMonth = DateTime.Now.Month;
                var currentYear = DateTime.Now.Year;

                // Obtener todas las ventas con sus lotes y proyectos para el mes y año actual
                var salesWithProjects = await _context.Sales
                    .Include(s => s.lot)
                        .ThenInclude(l => l.project)
                    .Where(s => s.lot != null && s.lot.project != null &&
                                s.sale_date.Month == currentMonth && // Filtrar por mes actual
                                s.sale_date.Year == currentYear)     // Filtrar por año actual
                    .ToListAsync();

                Console.WriteLine($"[DashboardController] Ventas con proyectos encontrados para el mes actual: {salesWithProjects.Count}");

                // Agrupar ventas por proyecto y sumar el recaudo total (total_raised) de cada venta
                var projectRevenues = salesWithProjects
                    .GroupBy(s => new {
                        ProjectId = s.lot.project.id_Projects,
                        ProjectName = s.lot.project.name
                    })
                    .Select(g => new {
                        projectId = g.Key.ProjectId,
                        projectName = g.Key.ProjectName,
                        // Suma el 'total_raised' de todas las ventas asociadas a este proyecto.
                        // Este 'total_raised' DEBE ser el valor neto después de aplicar penalizaciones por desistimiento.
                        monthlyRevenue = g.Sum(s => s.total_raised ?? 0)
                    })
                    .ToList();

                Console.WriteLine($"[DashboardController] Recaudos por proyecto calculados para el mes actual:");
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
                    totalCurrentMonthRevenue = totalCurrentMonthProjectRevenue // Renombrado para claridad en el frontend
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
                var currentYear = DateTime.Now.Year;
                var currentMonth = DateTime.Now.Month;
                //var currentYear = 2026;
                //var currentMonth = 1;

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
        /// Obtiene clientes con deudas pendientes
        /// TODO: IMPLEMENTAR LÓGICA DE CLIENTES EN MORA
        /// </summary>
        [HttpGet("GetOverdueClients")]
        public async Task<ActionResult<object>> GetOverdueClients()
        {
            try
            {
                // TODO: IMPLEMENTAR LÓGICA DE CLIENTES EN MORA
                // Esta lógica debe implementarse cuando se defina cómo determinar si un cliente está en mora
                // Posibles implementaciones:

                /*
                // OPCIÓN 1: Clientes con deuda pendiente
                var overdueClients = await _context.Sales
                    .Include(s => s.client)
                    .Include(s => s.lot)
                    .ThenInclude(l => l.project)
                    .Where(s => s.total_debt > 0 && s.status == "Active")
                    .GroupBy(s => new {
                        ClientId = s.client.id_Clients,
                        ClientName = $"{s.client.names} {s.client.surnames}"
                    })
                    .Select(g => new {
                        clientId = g.Key.ClientId,
                        clientName = g.Key.ClientName,
                        totalDebt = g.Sum(s => s.total_debt ?? 0),
                        salesCount = g.Count(),
                        projects = g.Select(s => s.lot.project.name).Distinct().ToList()
                    })
                    .OrderByDescending(c => c.totalDebt)
                    .ToListAsync();
                */

                /*
                // OPCIÓN 2: Clientes con pagos vencidos según fechas
                var overdueClients = await _context.Payments
                    .Include(p => p.sale)
                    .ThenInclude(s => s.client)
                    .Where(p => p.due_date < DateTime.Now && p.status == "Pending") // Ejemplo
                    .GroupBy(p => new {
                        ClientId = p.sale.client.id_Clients,
                        ClientName = $"{p.sale.client.names} {p.sale.client.surnames}"
                    })
                    .Select(g => new {
                        clientId = g.Key.ClientId,
                        clientName = g.Key.ClientName,
                        overdueAmount = g.Sum(p => p.amount ?? 0),
                        overduePayments = g.Count()
                    })
                    .ToListAsync();
                */

                // Por ahora retornar lista vacía hasta implementar la lógica
                return Ok(new List<object>());
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al obtener clientes en mora", details = ex.Message });
            }
        }
    }
}
