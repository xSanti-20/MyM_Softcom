// CONFIGURACIÓN DE SEGURIDAD BACKEND - C# .NET
// Archivo: Program.cs o Startup.cs

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using System.Security.Cryptography;
using BCrypt.Net;

public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        // ============================================
        // AUTENTICACIÓN Y COOKIES SEGURAS
        // ============================================
        
        services.ConfigureApplicationCookie(options =>
        {
            // ✅ HttpOnly: Previene acceso desde JavaScript (XSS)
            options.Cookie.HttpOnly = true;
            
            // ✅ Secure: Solo se envía por HTTPS en producción
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            
            // ✅ SameSite: Protege contra CSRF
            options.Cookie.SameSite = SameSiteMode.Strict;
            
            // ✅ Expiration: Sesión de 1 hora
            options.ExpireTimeSpan = TimeSpan.FromHours(1);
            
            // ✅ Redirige a login si no autenticado
            options.LoginPath = new PathString("/user/login");
            options.AccessDeniedPath = new PathString("/unauthorized");
        });

        // ============================================
        // POLÍTICA DE CORS (Restringida)
        // ============================================
        
        services.AddCors(options =>
        {
            options.AddPolicy("AuthenticatedOnly", builder =>
            {
                builder
                    .WithOrigins("http://localhost:3001", "https://yourdomain.com")  // Específico
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials()  // ✅ Permite cookies
                    .WithExposedHeaders("X-Total-Count");  // Para paginación
            });
        });

        // ============================================
        // PROTECCIÓN CONTRA FUERZA BRUTA
        // ============================================
        
        // Opción 1: Usar paquete NuGet "AspNetCoreRateLimit"
        // services.AddMemoryCache();
        // services.Configure<IpRateLimitOptions>(Configuration.GetSection("IpRateLimit"));
        // services.AddInMemoryRateLimiting();
        // services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

        // Opción 2: Implementación manual (recomendado para control)
        services.AddSingleton<ILoginAttemptService, LoginAttemptService>();
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        // Usar CORS
        app.UseCors("AuthenticatedOnly");

        // Forzar HTTPS en producción
        if (!env.IsDevelopment())
        {
            app.UseHsts();
            app.UseHttpsRedirection();
        }

        app.UseRouting();
        app.UseAuthentication();
        app.UseAuthorization();
    }
}

// ============================================
// SERVICIO PARA RASTREAR INTENTOS DE LOGIN
// ============================================

public interface ILoginAttemptService
{
    Task<bool> IsBlockedAsync(string identifier);  // email o IP
    Task RecordFailedAttemptAsync(string identifier);
    Task ResetAttemptsAsync(string identifier);
}

public class LoginAttemptService : ILoginAttemptService
{
    private readonly IMemoryCache _cache;
    private const int MaxAttempts = 5;
    private const int LockoutMinutes = 15;
    private const string CacheKeyPrefix = "LoginAttempt_";

    public LoginAttemptService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public async Task<bool> IsBlockedAsync(string identifier)
    {
        return await Task.FromResult(
            _cache.TryGetValue($"{CacheKeyPrefix}{identifier}", out int attempts) && 
            attempts >= MaxAttempts
        );
    }

    public async Task RecordFailedAttemptAsync(string identifier)
    {
        var key = $"{CacheKeyPrefix}{identifier}";
        _cache.TryGetValue(key, out int attempts);
        
        var newAttempts = attempts + 1;
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(TimeSpan.FromMinutes(LockoutMinutes));

        _cache.Set(key, newAttempts, cacheOptions);

        await Task.CompletedTask;
    }

    public async Task ResetAttemptsAsync(string identifier)
    {
        _cache.Remove($"{CacheKeyPrefix}{identifier}");
        await Task.CompletedTask;
    }
}

// ============================================
// CONTROLADOR DE AUTENTICACIÓN SEGURO
// ============================================

[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly ILoginAttemptService _loginAttemptService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<UserController> _logger;
    private readonly IEmailService _emailService;

    public UserController(
        ILoginAttemptService loginAttemptService,
        ApplicationDbContext context,
        ILogger<UserController> logger,
        IEmailService emailService)
    {
        _loginAttemptService = loginAttemptService;
        _context = context;
        _logger = logger;
        _emailService = emailService;
    }

    // ============================================
    // LOGIN SEGURO
    // ============================================
    
    [HttpPost("Login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // ✅ Validación de entrada
        if (!ModelState.IsValid)
            return BadRequest(new { message = "Datos inválidos" });

        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return Unauthorized(new { message = "Credenciales inválidas" });

        try
        {
            // ✅ Obtener IP del cliente
            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            
            // ✅ Verificar si está bloqueado
            if (await _loginAttemptService.IsBlockedAsync(request.Email))
            {
                _logger.LogWarning($"Blocked login attempt for {request.Email} from IP {clientIp}");
                
                // Mensaje genérico (no revelar que está bloqueado)
                return Unauthorized(new { message = "Credenciales inválidas" });
            }

            // ✅ Buscar usuario (parametrizado, previene SQL injection)
            var user = await _context.Users
                .Where(u => u.Email == request.Email)
                .FirstOrDefaultAsync();

            // ✅ Verificar contraseña con BCrypt
            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                // Registrar intento fallido
                await _loginAttemptService.RecordFailedAttemptAsync(request.Email);
                
                _logger.LogWarning($"Failed login attempt for {request.Email} from IP {clientIp}");
                
                // Mensaje genérico
                return Unauthorized(new { message = "Credenciales inválidas" });
            }

            // ✅ Éxito: Resetear intentos
            await _loginAttemptService.ResetAttemptsAsync(request.Email);

            // ✅ Crear sesión/JWT
            // (Aquí va tu código de generación de sesión o JWT)
            
            _logger.LogInformation($"Successful login for {user.Email}");

            return Ok(new
            {
                username = user.NomUsers,
                email = user.Email,
                role = user.Role ?? "User",
                id_Users = user.IdUsers
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Unexpected error in Login: {ex.Message}");
            
            // ✅ Error genérico al usuario
            return StatusCode(500, new { message = "Error procesando solicitud" });
        }
    }

    // ============================================
    // REGISTRO SEGURO
    // ============================================
    
    [HttpPost("CreateUser")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        // ✅ Validación de entrada
        if (!ModelState.IsValid)
            return BadRequest(new { message = "Datos incompletos" });

        // ✅ Validar formato email
        if (!IsValidEmail(request.Email))
            return BadRequest(new { message = "Email inválido" });

        // ✅ Validar contraseña
        if (string.IsNullOrWhiteSpace(request.HashedPassword) || 
            request.HashedPassword.Length < 8)
            return BadRequest(new { message = "Contraseña mínimo 8 caracteres" });

        // ✅ Validar username
        if (string.IsNullOrWhiteSpace(request.NomUsers) || 
            request.NomUsers.Length < 3 || 
            request.NomUsers.Length > 50)
            return BadRequest(new { message = "Usuario entre 3 y 50 caracteres" });

        try
        {
            // ✅ Verificar email único (UNIQUE constraint en BD)
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                _logger.LogWarning($"Registro attempt with existing email: {request.Email}");
                return BadRequest(new { message = "Email ya registrado" });
            }

            // ✅ Hashear contraseña con BCrypt (cost factor 12)
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.HashedPassword, 12);

            var newUser = new User
            {
                Email = request.Email,
                NomUsers = request.NomUsers,
                PasswordHash = passwordHash,  // ✅ NUNCA guardar plain
                Role = "User",
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"New user registered: {request.Email}");

            // ✅ TODO: Enviar email de confirmación
            // await _emailService.SendConfirmationEmailAsync(newUser.Email, confirmationToken);

            return Ok(new { message = "Usuario creado exitosamente. Por favor verifica tu email." });
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError($"Database error in CreateUser: {ex.Message}");
            return StatusCode(500, new { message = "Error procesando solicitud" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Unexpected error in CreateUser: {ex.Message}");
            return StatusCode(500, new { message = "Error procesando solicitud" });
        }
    }

    // ============================================
    // RECUPERACIÓN DE CONTRASEÑA SEGURA
    // ============================================
    
    [HttpPost("ResetPassUser")]
    public async Task<IActionResult> ResetPassUser([FromBody] ResetPassRequest request)
    {
        // ✅ Validación
        if (!ModelState.IsValid || !IsValidEmail(request.Email))
        {
            // Mensaje genérico (no revelar si existe el email)
            return Ok(new { message = "Si la cuenta existe, recibirás instrucciones" });
        }

        try
        {
            var user = await _context.Users
                .Where(u => u.Email == request.Email)
                .FirstOrDefaultAsync();

            // ✅ NO revelar si el usuario existe
            if (user == null)
            {
                _logger.LogWarning($"Password reset attempt for non-existent email: {request.Email}");
                return Ok(new { message = "Si la cuenta existe, recibirás instrucciones" });
            }

            // ✅ Generar token seguro (32 bytes = 256 bits)
            var tokenBytes = RandomNumberGenerator.GetBytes(32);
            var token = Convert.ToBase64String(tokenBytes);

            // ✅ Hashear token antes de guardar
            var tokenHash = BCrypt.Net.BCrypt.HashPassword(token, 12);

            var resetRecord = new PasswordReset
            {
                UserId = user.IdUsers,
                TokenHash = tokenHash,  // ✅ NUNCA guardar token plain
                ExpiresAt = DateTime.UtcNow.AddHours(1),
                CreatedAt = DateTime.UtcNow,
                CreatedIp = HttpContext.Connection.RemoteIpAddress?.ToString()
            };

            _context.PasswordResets.Add(resetRecord);
            await _context.SaveChangesAsync();

            // ✅ Enviar email (NO incluir token en logs)
            var resetLink = $"https://yourdomain.com/user/reset_password?token={Uri.EscapeDataString(token)}";
            await _emailService.SendPasswordResetEmailAsync(user.Email, resetLink);

            _logger.LogInformation($"Password reset requested for {request.Email}");

            return Ok(new { message = "Si la cuenta existe, recibirás instrucciones" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error in ResetPassUser: {ex.Message}");
            return StatusCode(500, new { message = "Error procesando solicitud" });
        }
    }

    // ============================================
    // VALIDAR TOKEN DE RECUPERACIÓN
    // ============================================
    
    [HttpPost("ValidatePass")]
    public async Task<IActionResult> ValidatePass([FromBody] ValidatePassRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            return BadRequest(new { message = "Token inválido" });

        try
        {
            var reset = await _context.PasswordResets
                .Include(r => r.User)
                .Where(r => r.ExpiresAt > DateTime.UtcNow && r.UsedAt == null)
                .FirstOrDefaultAsync();

            if (reset == null)
                return BadRequest(new { message = "Token inválido o expirado" });

            // ✅ Verificar token hasheado
            if (!BCrypt.Net.BCrypt.Verify(request.Token, reset.TokenHash))
                return BadRequest(new { message = "Token inválido" });

            return Ok(new { message = "Token valido" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error in ValidatePass: {ex.Message}");
            return StatusCode(500, new { message = "Error validando token" });
        }
    }

    // ============================================
    // CONFIRMAR NUEVA CONTRASEÑA
    // ============================================
    
    [HttpPost("ResetPasswordConfirm")]
    public async Task<IActionResult> ResetPasswordConfirm([FromBody] ResetPasswordConfirmRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || 
            string.IsNullOrWhiteSpace(request.NewPassword) ||
            request.NewPassword.Length < 8)
            return BadRequest(new { message = "Datos inválidos" });

        try
        {
            var reset = await _context.PasswordResets
                .Include(r => r.User)
                .Where(r => r.ExpiresAt > DateTime.UtcNow && r.UsedAt == null)
                .FirstOrDefaultAsync();

            if (reset == null)
            {
                _logger.LogWarning("Invalid password reset attempt");
                return BadRequest(new { message = "Token inválido o expirado" });
            }

            // ✅ Verificar token
            if (!BCrypt.Net.BCrypt.Verify(request.Token, reset.TokenHash))
                return BadRequest(new { message = "Token inválido" });

            // ✅ Hashear nueva contraseña
            var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, 12);

            // ✅ Actualizar usuario
            reset.User.PasswordHash = newPasswordHash;
            reset.User.UpdatedAt = DateTime.UtcNow;

            // ✅ Marcar token como utilizado (one-time use)
            reset.UsedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Password reset completed for user {reset.User.Email}");

            return Ok(new { message = "Contraseña actualizada correctamente" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error in ResetPasswordConfirm: {ex.Message}");
            return StatusCode(500, new { message = "Error actualizando contraseña" });
        }
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    private bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }
}

// ============================================
// MODELOS DE REQUEST/RESPONSE
// ============================================

public class LoginRequest
{
    public string Email { get; set; }
    public string Password { get; set; }
}

public class CreateUserRequest
{
    public string NomUsers { get; set; }
    public string Email { get; set; }
    public string HashedPassword { get; set; }
    public string ConfirmPassword { get; set; }
}

public class ResetPassRequest
{
    public string Email { get; set; }
}

public class ValidatePassRequest
{
    public string Token { get; set; }
}

public class ResetPasswordConfirmRequest
{
    public string Token { get; set; }
    public string NewPassword { get; set; }
}

// ============================================
// ENTIDADES DE BASE DE DATOS
// ============================================

public class User
{
    public int IdUsers { get; set; }
    public string Email { get; set; }
    public string NomUsers { get; set; }
    public string PasswordHash { get; set; }  // ✅ NUNCA plain
    public string Role { get; set; } = "User";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class PasswordReset
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; }
    public string TokenHash { get; set; }  // ✅ Hash del token
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public string CreatedIp { get; set; }  // Para auditoría
}

// ============================================
// NuGET PACKAGES REQUERIDOS
// ============================================

/*
dotnet add package BCrypt.Net-Core
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package AspNetCoreRateLimit  (opcional)
*/
