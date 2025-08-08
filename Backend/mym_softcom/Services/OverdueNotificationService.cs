using mym_softcom.Models;

namespace mym_softcom.Services
{
    public interface IOverdueNotificationService
    {
        Task<int> ProcessOverdueNotificationsAsync();
        Task<List<ClientOverdueInfo>> GetClientsWithOverdueAsync();
        Task<ResponseSend> SendNotificationToClientAsync(int clientId);
    }

    public class OverdueNotificationService : IOverdueNotificationService
    {
        private readonly IOverdueDetectionService _overdueDetectionService;
        private readonly IEmailNotificationService _emailNotificationService;
        private readonly ILogger<OverdueNotificationService> _logger;

        public OverdueNotificationService(
            IOverdueDetectionService overdueDetectionService,
            IEmailNotificationService emailNotificationService,
            ILogger<OverdueNotificationService> logger)
        {
            _overdueDetectionService = overdueDetectionService;
            _emailNotificationService = emailNotificationService;
            _logger = logger;
        }

        public async Task<int> ProcessOverdueNotificationsAsync()
        {
            try
            {
                _logger.LogInformation("Iniciando proceso de notificaciones de mora...");

                var clientsWithOverdue = await _overdueDetectionService.GetClientsWithOverdueInstallmentsAsync();

                var notificationsSent = 0;
                var notificationsFailed = 0;

                foreach (var clientOverdueInfo in clientsWithOverdue)
                {
                    try
                    {
                        // Verificar si debe enviar notificación
                        var shouldSend = await _overdueDetectionService.ShouldSendNotificationAsync(
                            clientOverdueInfo.Client.id_Clients);

                        if (!shouldSend)
                        {
                            _logger.LogInformation("Saltando notificación para cliente {ClientId} - ya se envió hoy",
                                clientOverdueInfo.Client.id_Clients);
                            continue;
                        }

                        // Enviar notificación
                        var result = await _emailNotificationService.SendOverdueNotificationAsync(clientOverdueInfo);

                        if (result.Status)
                        {
                            await _overdueDetectionService.UpdateLastNotificationSentAsync(
                                clientOverdueInfo.Client.id_Clients);

                            notificationsSent++;
                            _logger.LogInformation("Notificación enviada exitosamente al cliente {ClientId} ({Email})",
                                clientOverdueInfo.Client.id_Clients, clientOverdueInfo.Client.email);
                        }
                        else
                        {
                            notificationsFailed++;
                            _logger.LogWarning("Falló el envío de notificación al cliente {ClientId}: {Message}",
                                clientOverdueInfo.Client.id_Clients, result.Message);
                        }
                    }
                    catch (Exception ex)
                    {
                        notificationsFailed++;
                        _logger.LogError(ex, "Error procesando notificación para cliente {ClientId}",
                            clientOverdueInfo.Client.id_Clients);
                    }
                }

                _logger.LogInformation("Proceso completado. Enviadas: {Sent}, Fallidas: {Failed}",
                    notificationsSent, notificationsFailed);

                return notificationsSent;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en el proceso de notificaciones de mora");
                throw;
            }
        }

        public async Task<List<ClientOverdueInfo>> GetClientsWithOverdueAsync()
        {
            return await _overdueDetectionService.GetClientsWithOverdueInstallmentsAsync();
        }

        public async Task<ResponseSend> SendNotificationToClientAsync(int clientId)
        {
            try
            {
                var clientsWithOverdue = await _overdueDetectionService.GetClientsWithOverdueInstallmentsAsync();
                var clientOverdueInfo = clientsWithOverdue.FirstOrDefault(c => c.Client.id_Clients == clientId);

                if (clientOverdueInfo == null)
                {
                    return new ResponseSend
                    {
                        Status = false,
                        Message = "Cliente no tiene cuotas vencidas"
                    };
                }

                var result = await _emailNotificationService.SendOverdueNotificationAsync(clientOverdueInfo);

                if (result.Status)
                {
                    await _overdueDetectionService.UpdateLastNotificationSentAsync(clientId);
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error enviando notificación manual al cliente {ClientId}", clientId);
                return new ResponseSend
                {
                    Status = false,
                    Message = $"Error: {ex.Message}"
                };
            }
        }
    }
}
