using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic; // Necesario para ICollection

namespace mym_softcom.Models
{
    public class Lot
    {
        [Key]
        public int Id_Lots { get; set; }

        public int? Id_Projects { get; set; } // int DEFAULT NULL en SQL

        [StringLength(250)]
        public string? Block { get; set; } // varchar DEFAULT NULL en SQL

        public int? Lot_Number { get; set; } // int DEFAULT NULL en SQL

        [StringLength(50)] // Para el enum 'Libre','Vendido'
        public string Status { get; set; } = "Libre"; // enum DEFAULT 'Libre' en SQL

        [ForeignKey("Id_Projects")]
        public virtual Project? Project { get; set; } // Propiedad de navegación

        public virtual ICollection<Sale>? Sales { get; set; } // Propiedad de navegación
    }
}