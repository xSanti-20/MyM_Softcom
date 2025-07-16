using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace API_PESO_PIG.Models
{
    public class LoginUser
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }

    public class ResetPassUser
    {
        public string Email { get; set; }
    }

    public class ResetPassUsers
    {
        public string Token { get; set; }
        public string NewPassword { get; set; }
    }

    public class TokenRequest
    {
        public string Token { get; set; }
    }

    public class User
    {
        [Key]
        public int id_Users { get; set; }

        [DisplayName("Nombre Usuario")]
        public string Nom_Users { get; set; }

        [DisplayName("Tipo Usuario")]
        public string? Tip_Users { get; set; } = "Aprendiz";

        [DisplayName("Correo")]
        public string Email { get; set; }

        [DisplayName("Bloqueo")]
        public bool Blockade { get; set; }

        [DisplayName("Token de Usuario")]
        public string? Token { get; set; }

        [DisplayName("Intentos")]
        public int Attempts { get; set; } = 0;
        public string Hashed_Password { get; set; }
        public string? Salt { get; set; }
        public string? ResetToken { get; set; }
        public DateTime? ResetTokenExpiration { get; set; }
        public string Status { get; set; } = "Activo";
        public DateTime? LastActive { get; set; }

    }


    public class MessageConcat
    {
        public string Message { get; set; }
    }
}