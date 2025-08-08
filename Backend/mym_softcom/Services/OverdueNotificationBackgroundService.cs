using mym_softcom.Services;

namespace mym_softcom.BackgroundServices
{
    public class OverdueNotificationBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<OverdueNotificationBackgroundService> _logger;
        private readonly IConfiguration _configuration;

        // ✅ CONFIGURACIÓN FLEXIBLE
        private readonly TimeSpan _checkInterval;
        private readonly TimeSpan _startDelay;
        private readonly bool _isEnabled;

        public OverdueNotificationBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<OverdueNotificationBackgroundService> logger,
            IConfiguration configuration)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _configuration = configuration;

            // ✅ CONFIGURACIÓN DESDE appsettings.json
            _checkInterval = TimeSpan.FromHours(_configuration.GetValue<int>("OverdueNotifications:CheckIntervalHours", 24));
            _startDelay = TimeSpan.FromMinutes(_configuration.GetValue<int>("OverdueNotifications:StartDelayMinutes", 1));
            _isEnabled = _configuration.GetValue<bool>("OverdueNotifications:Enabled", true);

            _logger.LogInformation("Background Service configurado: Habilitado={Enabled}, Intervalo={Interval}h, Delay inicial={Delay}min",
                _isEnabled, _checkInterval.TotalHours, _startDelay.TotalMinutes);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_isEnabled)
            {
                _logger.LogInformation("Background Service de notificaciones está DESHABILITADO");
                return;
            }

            _logger.LogInformation("🚀 Iniciando Background Service de notificaciones de mora...");

            // Esperar un poco antes de la primera ejecución
            await Task.Delay(_startDelay, stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var startTime = DateTime.Now;
                    _logger.LogInformation("⏰ Ejecutando verificación automática de mora - {Time}", startTime.ToString("dd/MM/yyyy HH:mm:ss"));

                    using var scope = _serviceProvider.CreateScope();
                    var overdueNotificationService = scope.ServiceProvider
                        .GetRequiredService<IOverdueNotificationService>();

                    var notificationsSent = await overdueNotificationService.ProcessOverdueNotificationsAsync();

                    var duration = DateTime.Now - startTime;
                    _logger.LogInformation("✅ Verificación completada en {Duration}ms. Notificaciones enviadas: {Count}",
                        duration.TotalMilliseconds, notificationsSent);

                    if (notificationsSent > 0)
                    {
                        _logger.LogInformation("📧 Se enviaron {Count} notificaciones de mora exitosamente", notificationsSent);
                    }
                    else
                    {
                        _logger.LogInformation("✨ No hay clientes con cuotas vencidas en este momento");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ Error en la verificación automática de notificaciones");
                }

                // ✅ PRÓXIMA EJECUCIÓN
                var nextRun = DateTime.Now.Add(_checkInterval);
                _logger.LogInformation("⏳ Próxima verificación programada para: {NextRun}", nextRun.ToString("dd/MM/yyyy HH:mm:ss"));

                // Esperar hasta la próxima ejecución
                await Task.Delay(_checkInterval, stoppingToken);
            }
        }

        public override async Task StopAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("🛑 Deteniendo Background Service de notificaciones de mora...");
            await base.StopAsync(stoppingToken);
        }
    }
}
