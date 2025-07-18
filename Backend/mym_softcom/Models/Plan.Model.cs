using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic; // Necesario para ICollection

namespace mym_softcom.Models
{
    public class Plan
    {
        [Key]
        public int Id_Plans { get; set; }

        [StringLength(250)]
        public string? Name { get; set; } // varchar DEFAULT NULL en SQL

        public int? Number_Quotas { get; set; } // int DEFAULT NULL en SQL

        [Column(TypeName = "decimal(10,2)")]
        public decimal? Quotas_Value { get; set; } // decimal DEFAULT NULL en SQL

        public virtual ICollection<Sale>? Sales { get; set; } // Propiedad de navegación
    }
}