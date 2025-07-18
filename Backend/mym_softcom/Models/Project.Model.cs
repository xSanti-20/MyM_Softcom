using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic; // Necesario para ICollection
using System; // Necesario para DateTime

namespace mym_softcom.Models // ¡Este es el namespace correcto!
{
    public class Project
    {
        [Key]
        public int id_Projects { get; set; }

        [Required(ErrorMessage = "El nombre del proyecto es obligatorio")]
        public string name { get; set; }
    }
}