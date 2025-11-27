using mym_softcom.Functions;
using mym_softcom.Models;
using mym_softcom.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace mym_softcom.Controllers
{
    [ApiController]
    [Route("api/[Controller]")]
    public class UserController : Controller
    {
        public IConfiguration _Configuration;
        public readonly UserServices _Services;
        public Jwt Jwt { get; set; }
        public UserFunction GeneralFunction;
        private readonly AppDbContext _context;

        public UserController(IConfiguration configuration, UserServices userservices, AppDbContext context)
        {
            _Configuration = configuration;
            _Services = userservices;
            GeneralFunction = new UserFunction(configuration);
            Jwt = _Configuration.GetSection("Jwt").Get<Jwt>();
            _context = context;
        }

        [Authorize(Roles = "Administrador")]
        [HttpPut("status/{id}")]
        public async Task<IActionResult> PutStatus(int id, [FromBody] string newStatus)
        {
            var (updated, message) = await _Services.UpdateStatusAsync(id, newStatus);
            if (!updated)
                return BadRequest(new { message }); // Puede ser NotFound si prefieres.

            return Ok(new { message });
        }

        //cerrar sesion borrar el token de los cookies 
        [HttpPost("logout")]
        public IActionResult Logout()
        {
            // Borrar la cookie con el nombre que usaste para guardar el token (por ejemplo: "jwt")
            Response.Cookies.Delete("jwt_token");
            return Ok(new { message = "Sesión cerrada correctamente" });

        }

        [HttpPost("Login")]
        public async Task<IActionResult> Login([FromBody] LoginUser login)
        {
            try
            {
                if (login == null || string.IsNullOrEmpty(login.Email) || string.IsNullOrEmpty(login.Password))
                {
                    return BadRequest(new { message = "Los campos Email y Password son obligatorios." });
                }

                var user = await _Services.GetUserEmail(login.Email);
                if (user == null)
                {
                    return Unauthorized(new { message = "Usuario no encontrado." });
                }

                if (!BCrypt.Net.BCrypt.Verify(login.Password + user.Salt, user.Hashed_Password))
                {
                    return Unauthorized(new { message = "Contraseña incorrecta." });
                }
                if (user.Status == "Inactivo")
                {
                    return BadRequest(new { message = "Usuario Inactivo no puedes entrar al software" });
                }
                // 👇 Actualizamos la última vez activo
                user.LastActive = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                var key = Encoding.UTF8.GetBytes(Jwt.Key);
                var claims = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim("UserId", user.id_Users.ToString()),
                    new Claim(ClaimTypes.Role, user.Tip_Users)
        });

                var expiration = DateTime.UtcNow.AddMinutes(Convert.ToDouble(Jwt.JwtExpireTime));

                var tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = claims,
                    Audience = Jwt.Audience,   // <-- Agrega esta línea
                    Issuer = Jwt.Issuer,       // <-- Y esta línea también si no está
                    Expires = DateTime.UtcNow.AddMinutes(Convert.ToDouble(Jwt.JwtExpireTime)),
                    SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
                };

                var tokenHandler = new JwtSecurityTokenHandler();
                var token = tokenHandler.CreateToken(tokenDescriptor);
                var tokenString = tokenHandler.WriteToken(token);

                user.Token = tokenString;
                await _Services.UpdateUser(user.id_Users, user);

                // 🟡 Setear cookie segura con el token
                HttpContext.Response.Cookies.Append("jwt_token", tokenString, new CookieOptions
                {
                    HttpOnly = true,
                    // Secure = true, // solo si usas HTTPS
                    SameSite = SameSiteMode.Strict,
                    Expires = expiration
                });

                return Ok(new
                {
                    username = user.Nom_Users,
                    email = user.Email,
                    role = user.Tip_Users
                });
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog($"Error en Login: {ex.Message}");
                return StatusCode(500, new { message = "Error interno del servidor." });
            }
        }


        [HttpPost("ResetPassUser")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPassUser model)
        {
            try
            {
                var user = await _Services.GetByEmailAsync(model.Email);
                if (user == null)
                {
                    return NotFound(new { message = "El Correo no fue encontrado" });
                }

                var token = Convert.ToBase64String(Encoding.UTF8.GetBytes(Guid.NewGuid().ToString()));
                user.ResetToken = token;
                user.ResetTokenExpiration = DateTime.UtcNow.AddMinutes(30);
                await _Services.UpdateUserAsync(user);

                string resetLink = $"http://192.168.1.27:3000/user/reset_password?token={token}";

                var emailuser = await GeneralFunction.SendEmail(model.Email, resetLink);
                if (!emailuser.Status)
                {
                    return BadRequest(new { message = "Error al Enviar el Correo" });
                }

                return Ok(new { message = "Correo Enviado Correctamente" });
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        [HttpPost("ResetPasswordConfirm")]
        public async Task<IActionResult> ResetPasswordConfirm([FromBody] ResetPassUsers model)
        {
            try
            {
                // Buscar el usuario por token
                var user = await _Services.GetByTokenAsync(model.Token);

                if (user == null || user.ResetTokenExpiration < DateTime.UtcNow)
                {
                    return BadRequest(new { message = "Token inválido o expirado." });
                }

                // Hashear la nueva contraseña con sal
                string salt = BCrypt.Net.BCrypt.GenerateSalt();
                user.Hashed_Password = BCrypt.Net.BCrypt.HashPassword(model.NewPassword + salt);
                user.Salt = salt;

                // Limpiar el token
                user.ResetToken = null;
                user.ResetTokenExpiration = null;

                // Guardar cambios en la base de datos
                var updated = await _Services.UpdateUserPassword(user);

                if (!updated)
                {
                    return StatusCode(500, new { message = "No se pudo actualizar el usuario." });
                }

                return Ok(new { message = "Contraseña restablecida correctamente." });
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, new { message = "Error interno del servidor." });
            }
        }


        [HttpPost("validatepass")]
        public async Task<IActionResult> ValidateToken([FromBody] TokenRequest model)
        {
            try
            {
                if (model == null || string.IsNullOrEmpty(model.Token))
                {
                    return BadRequest(new { message = "Token no proporcionado" });
                }

                // Decodificar el token desde Base64 a string
                string decodedToken;
                try
                {
                    byte[] tokenBytes = Convert.FromBase64String(model.Token);
                    decodedToken = Encoding.UTF8.GetString(tokenBytes);
                }
                catch (FormatException)
                {
                    return Unauthorized(new { message = "Formato de token inválido" });
                }

                // Buscar el usuario con ese token
                var user = await _Services.GetByTokenAsync(model.Token);
                if (user == null || user.ResetTokenExpiration < DateTime.UtcNow)
                {
                    return Unauthorized(new { message = "Token invalido o expirado" });
                }

                return Ok(new { message = "Token valido" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error interno del servidor", error = ex.Message });
            }
        }

        [HttpGet("ValidateToken")]
        public IActionResult ValidateToken()
        {
            if (HttpContext.User.Identity.IsAuthenticated)
            {
                return Ok(new { isValid = true });
            }

            return Unauthorized(new { isValid = false });
        }

        [HttpPost("CreateUser")]
        public async Task<IActionResult> Add(User entity)
        {
            try
            {
                string salt = BCrypt.Net.BCrypt.GenerateSalt();
                entity.Hashed_Password = BCrypt.Net.BCrypt.HashPassword(entity.Hashed_Password + salt);
                entity.Salt = salt;

                // Se sigue asignando el token por si se quiere usar en futuro
                string token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
                entity.ResetToken = token;
                entity.ResetTokenExpiration = DateTime.UtcNow.AddHours(2);
                entity.Status = "Inactivo";

                _Services.Add(entity);

                // Leer los correos del administrador
                List<string> adminEmails = _Configuration.GetSection("AdminActivation").Get<List<string>>();

                var result = await GeneralFunction.SendNewUserNotification(adminEmails, entity);

                if (!result.Status)
                    return BadRequest(new { message = "Usuario creado, pero no se pudo notificar al administrador." });

                return Ok(new { message = "Usuario creado y notificación enviada al administrador." });
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }


        [HttpGet("ActivateAccount")]
        public async Task<IActionResult> ActivateAccount(string token)
        {
            var user = await _Services.GetByTokenAsync(token);

            if (user == null || user.ResetTokenExpiration < DateTime.UtcNow)
            {
                return BadRequest("El token es inválido o ha expirado.");
            }

            if (user.Status == "Activo")
            {
                return Ok("La cuenta ya estaba activa.");
            }

            user.Status = "Activo";
            user.ResetToken = null;
            user.ResetTokenExpiration = null;

            await _Services.UpdateUser(user.id_Users, user);

            return Ok("Cuenta activada exitosamente. Ya puedes iniciar sesión.");
        }



        [Authorize]
        [HttpGet("ConsultAllUser")]
        public ActionResult<IEnumerable<User>> AllUsers()
        {
            try
            {
                return Ok(_Services.GetUsers());
            }

            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }
        
        [HttpGet("GetUserId")]
        [Authorize]
        public async Task<IActionResult> GetUserId(int id_Users)
        {
            try
            {
                var user = await _Services.GetUserId(id_Users);

                if (user == null)
                {
                    return NotFound("Usuario no existe en la BD.");
                }

                return Ok(user);
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }
        [HttpPost("ConsultRange")]
        public ActionResult<IEnumerable<User>> GetAllRange(int start, int end)
        {
            try
            {
                if (end < 0)
                {
                    return BadRequest("El parámetro 'end' no puede ser negativo.");
                }
                if (start > end)
                {
                    return BadRequest("El valor de 'star' no puede ser mayor que 'end'.");
                }

                var range = _Services.GetUsers()
                    .Skip(start - 1)
                    .Take(end - start + 1)
                    .ToList();

                if (!range.Any())
                {
                    return NotFound("No se encontraron los usuarios en el rango.");
                }

                return Ok(range);
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        [HttpDelete("DeleteUser")]
        public async Task<IActionResult> DelUserS(int id_Users)
        {
            try
            {
                var result = await _Services.DelUsers(id_Users);
                if (result)
                {
                    return Ok("Usuario eliminado correctamente.");
                }
                return NotFound("El usuario no fue encontrado.");
            }

            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }
        [HttpPut("UpdateUser")]
        public async Task<IActionResult> UpdateUser(User updatedUser)
        {
            if (updatedUser == null)
            {
                return BadRequest("El usuario no es válido.");
            }

            try
            {
                var result = await _Services.UpdateUser(updatedUser.id_Users, updatedUser);

                if (!result)
                {
                    return NotFound("Usuario no existe en la BD.");
                }

                return Ok("Usuario actualizado correctamente.");
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, "Ocurrió un error inesperado.");
            }
        }
    }
}