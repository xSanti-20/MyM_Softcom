using mym_softcom.Functions;
using mym_softcom.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// 1. Configurar CORS (permitir frontend real)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigin", policy =>
    {
        policy
            .WithOrigins("http://localhost:3000", "http://192.168.1.21:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .SetIsOriginAllowed(origin => true); // ← IMPORTANTE para evitar bloqueos con IPs locales
    });
});


// 2. Agregar controladores y Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 3. Configurar conexión a la base de datos
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        new MySqlServerVersion(new Version(8, 0, 23))
    )
);

// 4. Registrar servicios personalizados
builder.Services.AddScoped<UserServices>();
builder.Services.AddScoped<ClientServices>();
builder.Services.AddScoped<LotServices>();
builder.Services.AddScoped<PaymentServices>();
builder.Services.AddScoped<PlanServices>();
builder.Services.AddScoped<ProjectServices>();
builder.Services.AddScoped<SaleServices>();
builder.Services.AddScoped<WithdrawalServices>();
builder.Services.AddScoped<DetailServices>();

// 5. Configurar JWT
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

    // Leer el token desde la cookie
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

// 6. Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowSpecificOrigin");
app.UseRouting();
app.UseAuthentication(); // ← Autenticación antes de autorización
app.UseAuthorization();

app.MapControllers();
app.Run();