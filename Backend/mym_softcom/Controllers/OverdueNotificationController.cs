using Microsoft.AspNetCore.Mvc;
using mym_softcom.Services;
using mym_softcom.Models;

namespace mym_softcom.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OverdueNotificationController : ControllerBase
    {
        private readonly IOverdueNotificationService _overdueNotificationService;
        private readonly IOverdueDetectionService _overdueDetectionService;
        private readonly ILogger<OverdueNotificationController> _logger;

        public OverdueNotificationController(
            IOverdueNotificationService overdueNotificationService,
            IOverdueDetectionService overdueDetectionService,
            ILogger<OverdueNotificationController> logger)
        {
            _overdueNotificationService = overdueNotificationService;
            _overdueDetectionService = overdueDetectionService;
            _logger = logger;
        }

        /// <summary>
        /// Procesa todas las notificaciones de mora pendientes
        /// </summary>
        [HttpPost("process-all")]
        public async Task<IActionResult> ProcessAllNotifications()
        {
            try
            {
                var notificationsSent = await _overdueNotificationService.ProcessOverdueNotificationsAsync();
                return Ok(new
                {
                    message = "Notificaciones procesadas exitosamente",
                    notificationsSent = notificationsSent
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error procesando notificaciones");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        /// <summary>
        /// Envía notificación a un cliente específico
        /// </summary>
        [HttpPost("send-to-client/{clientId}")]
        public async Task<IActionResult> SendNotificationToClient(int clientId)
        {
            try
            {
                var result = await _overdueNotificationService.SendNotificationToClientAsync(clientId);

                if (result.Status)
                    return Ok(result);
                else
                    return BadRequest(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error enviando notificación al cliente {ClientId}", clientId);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        /// <summary>
        /// Obtiene todos los clientes con cuotas vencidas
        /// </summary>
        [HttpGet("clients-with-overdue")]
        public async Task<IActionResult> GetClientsWithOverdue()
        {
            try
            {
                var clientsWithOverdue = await _overdueNotificationService.GetClientsWithOverdueAsync();

                var result = clientsWithOverdue.Select(c => new
                {
                    Client = new
                    {
                        c.Client.id_Clients,
                        c.Client.names,
                        c.Client.surnames,
                        c.Client.document,
                        c.Client.email,
                        c.Client.phone
                    },
                    c.TotalOverdueAmount,
                    c.TotalOverdueQuotas,
                    OverdueInstallments = c.OverdueInstallments.Select(i => new
                    {
                        i.QuotaNumber,
                        i.QuotaValue,
                        i.Balance,
                        i.DueDate,
                        i.DaysOverdue,
                        ProjectName = i.Sale.lot?.project?.name,
                        LotInfo = $"{i.Sale.lot?.block}-{i.Sale.lot?.lot_number}",
                        SaleId = i.Sale.id_Sales
                    })
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo clientes con mora");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        /// <summary>
        /// Obtiene las cuotas calculadas para una venta específica
        /// </summary>
        [HttpGet("installments-by-sale/{saleId}")]
        public async Task<IActionResult> GetInstallmentsBySale(int saleId)
        {
            try
            {
                var installments = await _overdueDetectionService.CalculateInstallmentsForSaleAsync(saleId);

                var result = installments.Select(i => new
                {
                    i.QuotaNumber,
                    i.QuotaValue,
                    i.PaidAmount,
                    i.Balance,
                    i.DueDate,
                    i.Status,
                    i.DaysOverdue
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo cuotas para la venta {SaleId}", saleId);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }
    }
}

