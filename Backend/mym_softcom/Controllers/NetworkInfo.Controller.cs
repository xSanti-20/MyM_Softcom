using Microsoft.AspNetCore.Mvc;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Net;
using System.Net.Http;

namespace mym_softcom.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NetworkInfoController : ControllerBase
    {
        private readonly ILogger<NetworkInfoController> _logger;
        private readonly IHttpClientFactory _httpClientFactory;
        private static string? _cachedPublicIP = null;
        private static DateTime _lastPublicIPCheck = DateTime.MinValue;

        public NetworkInfoController(ILogger<NetworkInfoController> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Obtiene informaci�n completa de red del servidor (IPs privadas y p�blica)
        /// </summary>
        [HttpGet("info")]
        public async Task<IActionResult> GetNetworkInfo()
        {
            try
            {
                var networkInterfaces = NetworkInterface.GetAllNetworkInterfaces()
                    .Where(n => n.OperationalStatus == OperationalStatus.Up)
                    .Where(n => n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                    .SelectMany(n => n.GetIPProperties()?.UnicastAddresses ?? Enumerable.Empty<UnicastIPAddressInformation>())
                    .Where(a => a?.Address?.AddressFamily == AddressFamily.InterNetwork)
                    .Select(a => new
                    {
                        ip = a?.Address?.ToString(),
                        isPrivate = IsPrivateIP(a?.Address?.ToString() ?? ""),
                        type = GetIPType(a?.Address?.ToString() ?? ""),
                        accessUrl = $"http://{a?.Address}:5000"
                    })
                    .Where(x => !string.IsNullOrEmpty(x.ip))
                    .ToList();

                var privateIP = networkInterfaces.FirstOrDefault(x => x.isPrivate)?.ip;
                var publicIP = await GetPublicIPAsync();

                return Ok(new
                {
                    serverStatus = "running",
                    timestamp = DateTime.Now,
                    localAccess = new
                    {
                        localhost = "http://localhost:5000",
                        loopback = "http://127.0.0.1:5000"
                    },
                    privateNetwork = new
                    {
                        ip = privateIP,
                        accessUrl = !string.IsNullOrEmpty(privateIP) ? $"http://{privateIP}:5000" : null,
                        swaggerUrl = !string.IsNullOrEmpty(privateIP) ? $"http://{privateIP}:5000/swagger" : null,
                        description = "Accesible desde dispositivos en la misma red local (LAN/WiFi)"
                    },
                    publicNetwork = new
                    {
                        ip = publicIP,
                        accessUrl = !string.IsNullOrEmpty(publicIP) ? $"http://{publicIP}:5000" : null,
                        swaggerUrl = !string.IsNullOrEmpty(publicIP) ? $"http://{publicIP}:5000/swagger" : null,
                        description = "Requiere Port Forwarding en el router para acceso desde internet",
                        portForwardingRequired = true,
                        setupInstructions = new[]
                        {
                            "1. Accede a la configuraci�n de tu router (usualmente 192.168.1.1 o 192.168.0.1)",
                            "2. Busca la secci�n de 'Port Forwarding' o 'Virtual Servers'",
                            $"3. Redirige el puerto externo 5000 al puerto interno 5000 de la IP {privateIP}",
                            "4. Guarda los cambios y reinicia el router si es necesario",
                            $"5. Usa tu IP p�blica para acceder: http://{publicIP ?? "[TU_IP_PUBLICA]"}:5000"
                        }
                    },
                    allInterfaces = networkInterfaces,
                    instructions = new
                    {
                        mobile = new[] {
                            "?? DESDE M�VIL/TABLET (Misma WiFi):",
                            "1. Conecta tu dispositivo m�vil a la misma red WiFi",
                            "2. Abre el navegador en tu dispositivo",
                            $"3. Ve a: {(!string.IsNullOrEmpty(privateIP) ? $"http://{privateIP}:5000" : "http://[IP_PRIVADA]:5000")}"
                        },
                        desktop = new[] {
                            "?? DESDE OTRA PC (Misma Red):",
                            "1. Aseg�rate de que el dispositivo est� en la misma red",
                            $"2. Abre el navegador y ve a: {(!string.IsNullOrEmpty(privateIP) ? $"http://{privateIP}:5000" : "http://[IP_PRIVADA]:5000")}"
                        },
                        internet = new[] {
                            "?? DESDE INTERNET (Cualquier lugar):",
                            "1. Configura Port Forwarding en tu router (ver publicNetwork.setupInstructions)",
                            "2. Aseg�rate de que el Firewall de Windows permita el puerto 5000",
                            $"3. Usa la IP p�blica: {(!string.IsNullOrEmpty(publicIP) ? $"http://{publicIP}:5000" : "http://[TU_IP_PUBLICA]:5000")}",
                            "4. Considera usar un servicio de DNS din�mico (DynDNS, No-IP) si tu IP p�blica cambia"
                        }
                    },
                    security = new
                    {
                        warning = "?? IMPORTANTE: Para acceso p�blico, considera implementar HTTPS y autenticaci�n robusta",
                        recommendations = new[]
                        {
                            "Usar HTTPS con certificado SSL (Let's Encrypt gratis)",
                            "Implementar rate limiting para prevenir ataques",
                            "Mantener actualizadas las dependencias de seguridad",
                            "Usar contrase�as fuertes y autenticaci�n de dos factores",
                            "Revisar logs regularmente para actividad sospechosa"
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo informaci�n de red");
                return StatusCode(500, new { error = "Error obteniendo informaci�n de red", details = ex.Message });
            }
        }

        /// <summary>
        /// Obtiene la IP p�blica del servidor
        /// </summary>
        [HttpGet("public-ip")]
        public async Task<IActionResult> GetPublicIP()
        {
            try
            {
                var publicIP = await GetPublicIPAsync();
                
                if (string.IsNullOrEmpty(publicIP))
                {
                    return Ok(new 
                    { 
                        success = false,
                        message = "No se pudo obtener la IP p�blica",
                        publicIP = (string?)null
                    });
                }

                return Ok(new
                {
                    success = true,
                    publicIP = publicIP,
                    accessUrl = $"http://{publicIP}:5000",
                    swaggerUrl = $"http://{publicIP}:5000/swagger",
                    note = "Requiere Port Forwarding en el router para acceso desde internet"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo IP p�blica");
                return StatusCode(500, new { error = "Error obteniendo IP p�blica", details = ex.Message });
            }
        }

        /// <summary>
        /// Obtiene la IP p�blica usando servicios externos (con cach�)
        /// </summary>
        private async Task<string?> GetPublicIPAsync()
        {
            // Usar cach� si no han pasado m�s de 5 minutos
            if (_cachedPublicIP != null && (DateTime.Now - _lastPublicIPCheck).TotalMinutes < 5)
            {
                return _cachedPublicIP;
            }

            var services = new[]
            {
                "https://api.ipify.org",
                "https://icanhazip.com",
                "https://ipinfo.io/ip",
                "https://checkip.amazonaws.com"
            };

            using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };

            foreach (var service in services)
            {
                try
                {
                    var response = await httpClient.GetStringAsync(service);
                    var ip = response.Trim();
                    
                    if (IPAddress.TryParse(ip, out _))
                    {
                        _cachedPublicIP = ip;
                        _lastPublicIPCheck = DateTime.Now;
                        _logger.LogInformation("IP p�blica obtenida: {IP} (desde {Service})", ip, service);
                        return ip;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("No se pudo obtener IP desde {Service}: {Error}", service, ex.Message);
                }
            }

            return null;
        }

        /// <summary>
        /// Determina el tipo de IP
        /// </summary>
        private static string GetIPType(string ip)
        {
            if (string.IsNullOrEmpty(ip)) return "Unknown";
            
            if (ip.StartsWith("127.")) return "Loopback";
            if (ip.StartsWith("192.168.")) return "Private (Class C)";
            if (ip.StartsWith("10.")) return "Private (Class A)";
            if (ip.StartsWith("172."))
            {
                if (IPAddress.TryParse(ip, out var ipAddress))
                {
                    var bytes = ipAddress.GetAddressBytes();
                    if (bytes[1] >= 16 && bytes[1] <= 31)
                        return "Private (Class B)";
                }
            }
            
            return "Public";
        }

        /// <summary>
        /// Verifica si una IP es privada (red local)
        /// </summary>
        private static bool IsPrivateIP(string ip)
        {
            if (string.IsNullOrEmpty(ip) || !IPAddress.TryParse(ip, out var ipAddress))
                return false;

            byte[] bytes = ipAddress.GetAddressBytes();

            // 10.0.0.0/8
            if (bytes[0] == 10)
                return true;

            // 172.16.0.0/12
            if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
                return true;

            // 192.168.0.0/16
            if (bytes[0] == 192 && bytes[1] == 168)
                return true;

            return false;
        }

        /// <summary>
        /// Endpoint para verificar conectividad desde otro dispositivo
        /// </summary>
        [HttpGet("ping")]
        public IActionResult Ping()
        {
            var clientIP = HttpContext.Connection.RemoteIpAddress?.ToString();
            
            return Ok(new
            {
                message = "�Conexi�n exitosa!",
                timestamp = DateTime.Now,
                server = "MyM Softcom API",
                version = "1.0.0",
                status = "operational",
                yourIP = clientIP,
                connectionType = IsPrivateIP(clientIP ?? "") ? "Local Network" : "Public Internet"
            });
        }

        /// <summary>
        /// Obtiene estad�sticas b�sicas del servidor
        /// </summary>
        [HttpGet("status")]
        public IActionResult GetServerStatus()
        {
            try
            {
                var uptime = DateTime.Now - System.Diagnostics.Process.GetCurrentProcess().StartTime;

                return Ok(new
                {
                    status = "healthy",
                    uptime = new
                    {
                        days = uptime.Days,
                        hours = uptime.Hours,
                        minutes = uptime.Minutes,
                        totalMinutes = Math.Round(uptime.TotalMinutes, 2)
                    },
                    timestamp = DateTime.Now,
                    environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
                    version = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0",
                    corsEnabled = true,
                    corsPolicy = "AllowAll (Development Mode)"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo estado del servidor");
                return StatusCode(500, new { error = "Error obteniendo estado del servidor" });
            }
        }
    }
}