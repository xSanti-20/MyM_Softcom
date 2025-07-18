using System.ComponentModel.DataAnnotations;

namespace mym_softcom.DTOs
{
    public class SaleDTO
    {
        public int Id_Sales { get; set; }
        public int Id_Clients { get; set; }
        public string? Client_Names { get; set; } // Para mostrar el nombre del cliente
        public string? Client_Surnames { get; set; } // Para mostrar el apellido del cliente
        public int Id_Lots { get; set; }
        public string? Lot_Block { get; set; } // Para mostrar el bloque del lote
        public int? Lot_Number { get; set; } // Para mostrar el número del lote
        public string? Project_Name { get; set; } // Para mostrar el nombre del proyecto
        public int Id_Users { get; set; }
        public string? User_Nom_Users { get; set; } // Para mostrar el nombre del usuario
        public int Id_Plans { get; set; }
        public string? Plan_Name { get; set; } // Para mostrar el nombre del plan
        public DateTime Sale_Date { get; set; }
        public decimal Total_Value { get; set; }
        public decimal Initial_Payment { get; set; }
        public string Status { get; set; }
        public decimal Total_Raised { get; set; }
    }

    public class CreateSaleDTO
    {
        [Required(ErrorMessage = "El ID del cliente es obligatorio.")]
        public int Id_Clients { get; set; }

        [Required(ErrorMessage = "El ID del lote es obligatorio.")]
        public int Id_Lots { get; set; }

        [Required(ErrorMessage = "El ID del usuario es obligatorio.")]
        public int Id_Users { get; set; }

        [Required(ErrorMessage = "El ID del plan es obligatorio.")]
        public int Id_Plans { get; set; }

        [Required(ErrorMessage = "La fecha de venta es obligatoria.")]
        public DateTime Sale_Date { get; set; }

        [Required(ErrorMessage = "El valor total es obligatorio.")]
        [Range(0.01, double.MaxValue, ErrorMessage = "El valor total debe ser mayor a 0.")]
        public decimal Total_Value { get; set; }

        [Required(ErrorMessage = "El pago inicial es obligatorio.")]
        [Range(0, double.MaxValue, ErrorMessage = "El pago inicial debe ser mayor o igual a 0.")]
        public decimal Initial_Payment { get; set; }

        // Status y Total_Raised se inicializan en el servicio
    }

    public class UpdateSaleDTO
    {
        [Required(ErrorMessage = "La fecha de venta es obligatoria.")]
        public DateTime Sale_Date { get; set; }

        [Required(ErrorMessage = "El valor total es obligatorio.")]
        [Range(0.01, double.MaxValue, ErrorMessage = "El valor total debe ser mayor a 0.")]
        public decimal Total_Value { get; set; }

        [Required(ErrorMessage = "El pago inicial es obligatorio.")]
        [Range(0, double.MaxValue, ErrorMessage = "El pago inicial debe ser mayor o igual a 0.")]
        public decimal Initial_Payment { get; set; }

        [Required(ErrorMessage = "El estado es obligatorio.")]
        [StringLength(50, ErrorMessage = "El estado no puede exceder 50 caracteres.")]
        public string Status { get; set; }

        [Required(ErrorMessage = "El total recaudado es obligatorio.")]
        [Range(0, double.MaxValue, ErrorMessage = "El total recaudado debe ser mayor o igual a 0.")]
        public decimal Total_Raised { get; set; }

        [Required(ErrorMessage = "El ID del plan es obligatorio.")]
        public int Id_Plans { get; set; }
    }
}