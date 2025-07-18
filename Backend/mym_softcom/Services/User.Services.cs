using mym_softcom.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace mym_softcom.Services
{
    public class UserServices
    {
        private string GetTimeAgo(DateTime lastActive)
        {
            var timeSpan = DateTime.UtcNow - lastActive;

            if (timeSpan.TotalSeconds < 60)
                return "Hace unos segundos";
            if (timeSpan.TotalMinutes < 60)
                return $"Hace {(int)timeSpan.TotalMinutes} minutos";
            if (timeSpan.TotalHours < 24)
                return $"Hace {(int)timeSpan.TotalHours} horas";
            if (timeSpan.TotalDays < 7)
                return $"Hace {(int)timeSpan.TotalDays} días";

            return lastActive.ToLocalTime().ToString("dd/MM/yyyy HH:mm");
        }

        private readonly AppDbContext _context;
        public UserServices(AppDbContext context)
        {
            _context = context;
        }
        public IEnumerable<object> GetUsers()
        {
            var users = _context.Users
    .OrderByDescending(u => u.Status == "Activo")
    .Select(u => new
    {
        u.id_Users,
        u.Nom_Users,
        u.Email,
        u.Tip_Users,
        u.Status,
        u.LastActive
    })
    .ToList(); // Ejecuta la consulta en la base de datos y trae los datos a memoria

            var result = users.Select(u => new
            {
                u.id_Users,
                u.Nom_Users,
                u.Email,
                u.Tip_Users,
                u.Status,
                ultimaVez = u.LastActive.HasValue ? GetTimeAgo(u.LastActive.Value) : "Nunca ha iniciado sesión"
            }).ToList();

            return result;


        }

        public async Task<User> GetUserEmail(string email)
        {
            try
            {
                return await _context.Users.FirstOrDefaultAsync(x => x.Email == email);
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public async Task<User> GetByEmailAsync(string email)
        {
            return await _context.Users
                .Where(u => u.Email == email)
                .Select(u => new User
                {
                    id_Users = u.id_Users,
                    Email = u.Email,
                    Hashed_Password = u.Hashed_Password ?? string.Empty, // Asegurarse de que no sea NULL
                    Salt = u.Salt ?? string.Empty, // Asegurarse de que no sea NULL
                    Token = u.Token ?? string.Empty, // Asegurarse de que no sea NULL
                    Blockade = u.Blockade,
                    ResetToken = u.ResetToken ?? string.Empty, // Asegurarse de que no sea NULL
                    ResetTokenExpiration = u.ResetTokenExpiration ?? DateTime.UtcNow // Si es NULL, asigna la fecha actual
                })
                .FirstOrDefaultAsync();
        }
        public async Task<User> GetUserId(int id_Users)
        {
            try
            {
                return await _context.Users.FirstOrDefaultAsync(x => x.id_Users == id_Users);
            }
            catch (Exception ex)
            {
                throw;
            }
        }
        public void Add(User entity)
        {
            _context.Users.Add(entity);
            _context.SaveChanges();
        }
        public async Task<bool> DelUsers(int id_Users)
        {
            try
            {
                var user = await _context.Users.FindAsync(id_Users);
                if (user != null)
                {
                    _context.Users.Remove(user);
                    await _context.SaveChangesAsync();
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                throw;
            }
        }
        public async Task<bool> UpdateUser(int id_Users, User updatedUser)
        {
            try
            {
                _context.Users.Update(updatedUser);
                _context.SaveChanges();

                var existingUser = await _context.Users.FindAsync(id_Users);
                if (existingUser == null)
                {
                    return false;
                }


                return true;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public async Task<bool> UpdateUserPassword(User updatedUser)
        {
            try
            {
                var existingUser = await _context.Users.FindAsync(updatedUser.id_Users);

                if (existingUser == null)
                {
                    return false;
                }

                // Actualizar solo los campos necesarios
                existingUser.Hashed_Password = updatedUser.Hashed_Password;
                existingUser.Salt = updatedUser.Salt;
                existingUser.ResetToken = null;
                existingUser.ResetTokenExpiration = null;

                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception)
            {
                throw;
            }
        }


        public async Task UpdateUserAsync(User user)
        {
            if (user == null)
            {
                throw new ArgumentNullException(nameof(user), "El modelo de usuario es nulo");
            }

            var existingResponsible = await _context.Users
                .Where(u => u.id_Users == user.id_Users)
                .FirstOrDefaultAsync();

            if (existingResponsible == null)
            {
                throw new ArgumentException("Usuario no encontrado");
            }

            existingResponsible.Email = user.Email;
            existingResponsible.Hashed_Password = user.Hashed_Password;
            existingResponsible.Salt = user.Salt;
            existingResponsible.Token = user.Token;
            existingResponsible.Blockade = user.Blockade;
            existingResponsible.ResetToken = user.ResetToken;
            existingResponsible.ResetTokenExpiration = user.ResetTokenExpiration;

            await _context.SaveChangesAsync();
        }
        public async Task<User> GetResponsibleByResetToken(string token)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.ResetToken == token && u.ResetTokenExpiration > DateTime.UtcNow);
        }

        public async Task<User> GetByTokenAsync(string token)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.ResetToken == token);
        }
        // Método para actualizar la entidad
        public async Task<(bool success, string message)> UpdateStatusAsync(int id, string newStatus)
        {
            var entity = await GetUserId(id);
            if (entity == null)
                return (false, "Usuario no encontrado.");

            if (entity.Tip_Users == "Administrador")
                return (false, "No se puede cambiar el estado de un administrador.");

            entity.Status = newStatus;
            _context.Users.Update(entity);
            await _context.SaveChangesAsync();

            return (true, "Estado actualizado correctamente.");
        }


    }
}