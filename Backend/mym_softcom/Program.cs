using mym_softcom.Functions;
using mym_softcom.Services;
using mym_softcom.BackgroundServices;
using mym_softcom.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;
using System.Net.NetworkInformation;
using System.Net.Sockets;

var builder = WebApplication.CreateBuilder(args);

// ✅ CONFIGURACIÓN PARA ACCESO PÚBLICO Y PRIVADO
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    // Escuchar en TODAS las interfaces de red (0.0.0.0 = cualquier IP)
    // Esto permite acceso desde:
    // - localhost (127.0.0.1)
    // - Red local (192.168.x.x, 10.x.x.x, etc.)
    // - Internet público (si tienes IP pública y port forwarding configurado)
    serverOptions.ListenAnyIP(5001);
    
    // Si quieres HTTPS también (recomendado para producción)
    // serverOptions.ListenAnyIP(5001, listenOptions =>
    // {
    //     listenOptions.UseHttps();
    // });
});

// 1. ✅ CONFIGURAR CORS PARA ACCESO PÚBLICO Y PRIVADO
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy
            .SetIsOriginAllowed(origin => 
            {
                // ✅ MODO DESARROLLO/TESTING: Permitir TODOS los orígenes
                // NOTA: En producción, deberías especificar los orígenes permitidos
                return true;
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
    
    // ✅ Política más restrictiva para producción (opcional)
    options.AddPolicy("AllowSpecificOrigins", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:3000",           // React local
                "http://localhost:5173",           // Vite local
                "https://tudominio.com",           // Tu dominio público
                "https://www.tudominio.com"        // Con www
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// 2. Agregar controladores y Swagger
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 3. Configurar conexión a la base de datos
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        new MySqlServerVersion(new Version(8, 0, 23))
    )
);

// 4. Registrar servicios personalizados existentes
builder.Services.AddScoped<UserServices>();
builder.Services.AddScoped<ClientServices>();
builder.Services.AddScoped<LotServices>();
builder.Services.AddScoped<PaymentServices>();
builder.Services.AddScoped<PlanServices>();
builder.Services.AddScoped<ProjectServices>();
builder.Services.AddScoped<SaleServices>();
builder.Services.AddScoped<WithdrawalServices>();
builder.Services.AddScoped<DetailServices>();
builder.Services.AddScoped<IBackupService, BackupService>();
builder.Services.AddScoped<CesionServices>();

// ✅ NUEVO: Servicio del módulo de inventario
builder.Services.AddScoped<MaterialServices>();

// ✅ NUEVO: Servicio del módulo de descuentos por referidos
builder.Services.AddScoped<DiscountServices>();

// ✅ NUEVO: Servicio del módulo de traslados de cartera
builder.Services.AddScoped<TransferService>();

// 5. Configuración de EMAIL
builder.Services.AddSingleton<ConfigServer>(provider =>
{
    var config = new ConfigServer();
    var configuration = provider.GetRequiredService<IConfiguration>();
    configuration.GetSection("ConfigServerEmail").Bind(config);

    var logger = provider.GetRequiredService<ILogger<Program>>();
    logger.LogInformation("Configuración de email cargada: Host={Host}, Port={Port}, Email={Email}, HasPassword={HasPassword}",
        config.HostName, config.PortHost, config.Email, !string.IsNullOrEmpty(config.Password));

    if (string.IsNullOrEmpty(config.Email))
        logger.LogWarning("⚠️ Email no configurado en ConfigServerEmail");
    if (string.IsNullOrEmpty(config.Password))
        logger.LogWarning("⚠️ Password no configurado en ConfigServerEmail");
    if (string.IsNullOrEmpty(config.HostName))
        logger.LogWarning("⚠️ HostName no configurado en ConfigServerEmail");

    return config;
});

// Servicios de notificaciones de mora
builder.Services.AddScoped<IOverdueDetectionService, OverdueDetectionService>();
builder.Services.AddScoped<IEmailNotificationService, EmailNotificationService>();
builder.Services.AddScoped<IOverdueNotificationService, OverdueNotificationService>();
builder.Services.AddHostedService<OverdueNotificationBackgroundService>();

// 6. Configurar JWT
var jwtKey = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:key"]);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(jwtKey),
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ClockSkew = TimeSpan.Zero
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var token = context.Request.Cookies["jwt_token"];
            if (!string.IsNullOrEmpty(token))
            {
                context.Token = token;
            }
            return Task.CompletedTask;
        },
        OnChallenge = context =>
        {
            context.HandleResponse();
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";

            if (string.IsNullOrEmpty(context.Error))
                context.Error = "No autorizado: falta token";

            if (string.IsNullOrEmpty(context.ErrorDescription))
                context.ErrorDescription = "Esta solución requiere un token de acceso JWT válido.";

            if (context.AuthenticateFailure is SecurityTokenExpiredException expiredException)
            {
                context.Response.Headers.Add("x-token-expired", expiredException.Expires.ToString("o"));
                context.ErrorDescription = $"El token expiró el {expiredException.Expires:o}";
            }

            return context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                error = context.Error,
                error_description = context.ErrorDescription
            }));
        }
    };
});

var app = builder.Build();

// ✅ AGREGAR LOGGING PARA MOSTRAR LA IP Y PUERTO AL INICIAR
var logger = app.Services.GetRequiredService<ILogger<Program>>();

// 7. Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ✅ Usar política de CORS permisiva (cambiar a "AllowSpecificOrigins" en producción)
app.UseCors("AllowAll");

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// ✅ MOSTRAR INFORMACIÓN COMPLETA DE RED AL INICIAR
app.Lifetime.ApplicationStarted.Register(() =>
{
    try
    {
        var allIPs = NetworkInterface.GetAllNetworkInterfaces()
            .Where(n => n.OperationalStatus == OperationalStatus.Up)
            .Where(n => n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
            .SelectMany(n => n.GetIPProperties()?.UnicastAddresses ?? Enumerable.Empty<UnicastIPAddressInformation>())
            .Where(a => a?.Address?.AddressFamily == AddressFamily.InterNetwork)
            .Select(a => a?.Address?.ToString())
            .Where(ip => !string.IsNullOrEmpty(ip))
            .ToList();

        var privateIP = allIPs.FirstOrDefault(ip => 
            ip?.StartsWith("192.168.") == true || 
            ip?.StartsWith("10.") == true || 
            ip?.StartsWith("172.") == true);

        logger.LogInformation("🚀 ===== SERVIDOR INICIADO =====");
        logger.LogInformation("📡 ACCESO LOCAL:");
        logger.LogInformation("   • http://localhost:5001");
        logger.LogInformation("   • http://127.0.0.1:5001");
        
        if (!string.IsNullOrEmpty(privateIP))
        {
            logger.LogInformation("");
            logger.LogInformation("🏠 ACCESO DESDE RED LOCAL (LAN):");
            logger.LogInformation("   • http://{LocalIP}:5001", privateIP);
            logger.LogInformation("   • http://{LocalIP}:5001/swagger", privateIP);
        }

        if (allIPs.Any())
        {
            logger.LogInformation("");
            logger.LogInformation("🌐 TODAS LAS INTERFACES DE RED:");
            foreach (var ip in allIPs)
            {
                var type = (ip?.StartsWith("192.168.") == true || ip?.StartsWith("10.") == true || ip?.StartsWith("172.") == true) 
                    ? "Privada (LAN)" 
                    : "Pública";
                logger.LogInformation("   • http://{IP}:5001 ({Type})", ip, type);
            }
        }

        logger.LogInformation("");
        logger.LogInformation("📱 ACCESO DESDE DISPOSITIVOS MÓVILES:");
        logger.LogInformation("   1. Conéctate a la misma red WiFi");
        if (!string.IsNullOrEmpty(privateIP))
        {
            logger.LogInformation("   2. Abre: http://{LocalIP}:5001", privateIP);
        }

        logger.LogInformation("");
        logger.LogInformation("🌍 ACCESO DESDE INTERNET (Requiere configuración adicional):");
        logger.LogInformation("   1. Configura Port Forwarding en tu router (Puerto 5001)");
        logger.LogInformation("   2. Usa tu IP pública: http://[TU_IP_PUBLICA]:5001");
        logger.LogInformation("   3. Para obtener tu IP pública: https://whatismyipaddress.com");

        logger.LogInformation("");
        logger.LogInformation("📚 SWAGGER UI: http://localhost:5001/swagger");
        logger.LogInformation("🔧 Para detener: Ctrl+C");
        logger.LogInformation("🛡️ CORS: Permitiendo TODOS los orígenes (modo desarrollo)");
        logger.LogInformation("===============================");
    }
    catch (Exception ex)
    {
        logger.LogWarning("No se pudo obtener información de red: {Error}", ex.Message);
        logger.LogInformation("🚀 Servidor iniciado en http://localhost:5001");
    }
});

app.Run();
