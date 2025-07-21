using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic; // Necesario para ICollection

namespace mym_softcom.Models
{
    public class Sale
    {
        [Key]
        public int Id_Sales { get; set; }

        [Required]
        public int Id_Clients { get; set; } // int NOT NULL en SQL

        [Required]
        public int Id_Lots { get; set; } // int NOT NULL en SQL

        [Required]
        public int Id_Users { get; set; } // int NOT NULL en SQL

        [Required]
        public int Id_Plans { get; set; } // int NOT NULL en SQL

        [Required]
        public DateTime Sale_Date { get; set; } // date NOT NULL en SQL

        [Required]
        [Column(TypeName = "decimal(15,2)")]
        public decimal Total_Value { get; set; } // decimal NOT NULL en SQL

        [Required]
        [Column(TypeName = "decimal(15,2)")]
        public decimal Initial_Payment { get; set; } // decimal NOT NULL en SQL

        [StringLength(50)] // Para el enum 'active','cancelled'
        public string status { get; set; } = "active"; // enum DEFAULT 'active' en SQL

        [Column(TypeName = "decimal(10,2)")]
        public decimal Total_Raised { get; set; } = 0.00m; // decimal DEFAULT '0.00' en SQL

        [ForeignKey("Id_Clients")]
        public virtual Client? Client { get; set; } // Propiedad de navegación

        [ForeignKey("Id_Lots")]
        public virtual Lot? Lot { get; set; } // Propiedad de navegación

        [ForeignKey("Id_Users")]
        public virtual User? User { get; set; } // Propiedad de navegación (asumiendo que tienes el modelo User)

        [ForeignKey("Id_Plans")]
        public virtual Plan? Plan { get; set; } // Propiedad de navegación

        public virtual ICollection<Payment>? Payments { get; set; } // Propiedad de navegación
        public virtual ICollection<Withdrawal>? Withdrawals { get; set; } // Propiedad de navegación
    }
}