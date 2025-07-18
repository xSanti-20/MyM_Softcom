using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace mym_softcom.Models
{
    public class Withdrawal
    {
        [Key]
        public int Id_Withdrawals { get; set; }

        [Required]
        public int Id_Sales { get; set; } // int NOT NULL en SQL

        [Required]
        public string Reason { get; set; } // text NOT NULL en SQL

        [Required]
        public DateTime Withdrawal_Date { get; set; } // date NOT NULL en SQL

        [Required]
        [Column(TypeName = "decimal(15,2)")]
        public decimal Penalty { get; set; } // decimal NOT NULL en SQL

        [ForeignKey("Id_Sales")]
        public virtual Sale? Sale { get; set; } // Propiedad de navegación
    }
}