using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace mym_softcom.Models
{
    public class Payment
    {
        [Key]
        public int Id_Payments { get; set; }

        [Required]
        public int Id_Sales { get; set; } // int NOT NULL en SQL

        [Required]
        public DateTime Payment_Date { get; set; } // date NOT NULL en SQL

        [Required]
        [Column(TypeName = "decimal(15,2)")]
        public decimal Amount { get; set; } // decimal NOT NULL en SQL

        [Required]
        [StringLength(250)]
        public string Payment_Method { get; set; } // varchar NOT NULL en SQL

        [StringLength(50)]
        public string? Reference_Month { get; set; } // varchar DEFAULT NULL en SQL

        public string? Observation { get; set; } // text DEFAULT NULL en SQL

        [ForeignKey("Id_Sales")]
        public virtual Sale? Sale { get; set; } // Propiedad de navegación
    }
}