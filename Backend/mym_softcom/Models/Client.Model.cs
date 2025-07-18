using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic; // Necesario para ICollection

namespace mym_softcom.Models
{
    public class Client
    {
        [Key]
        public int id_Clients { get; set; }

        [DisplayName("Nombres")]
        [Required(ErrorMessage = "Los nombres son obligatorios")]
        public string names { get; set; }

        [DisplayName("Apellidos")]
        [Required(ErrorMessage = "Los apellidos son obligatorios")]
        public string surnames { get; set; }

        [DisplayName("Documento")]
        [Required(ErrorMessage = "El documento es obligatorio")]
        public int document { get; set; } // int DEFAULT NULL en SQL, pero tu modelo lo tiene como int Required

        [DisplayName("Teléfono")]
        public long? phone { get; set; } // int DEFAULT NULL en SQL, por eso es nullable (int?)

        [DisplayName("Email")]
        [EmailAddress(ErrorMessage = "El formato del email no es válido")]
        public string? email { get; set; } // varchar DEFAULT NULL en SQL, por eso es nullable (string?)

        [DisplayName("Estado")]
        public string status { get; set; } = "Activo"; // enum DEFAULT 'active' en SQL
    }
}