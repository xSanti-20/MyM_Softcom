using System.ComponentModel.DataAnnotations;

namespace mym_softcom.DTOs
{
    public class PaymentDTO
    {
        public int Id_Payments { get; set; }
        public int Id_Sales { get; set; }
        public string? Sale_Lot_Block { get; set; } // Para mostrar el bloque del lote de la venta
        public int? Sale_Lot_Number { get; set; } // Para mostrar el número del lote de la venta
        public string? Sale_Client_Names { get; set; } // Para mostrar el nombre del cliente de la venta
        public string? Sale_Client_Surnames { get; set; } // Para mostrar el apellido del cliente de la venta
        public string? Sale_Project_Name { get; set; } // Para mostrar el nombre del proyecto de la venta
        public DateTime Payment_Date { get; set; }
        public decimal Amount { get; set; }
        public string Payment_Method { get; set; }
        public string? Reference_Month { get; set; }
        public string? Observation { get; set; }
    }

    public class CreatePaymentDTO
    {
        [Required(ErrorMessage = "El ID de la venta es obligatorio.")]
        public int Id_Sales { get; set; }

        [Required(ErrorMessage = "La fecha de pago es obligatoria.")]
        public DateTime Payment_Date { get; set; }

        [Required(ErrorMessage = "El monto es obligatorio.")]
        [Range(0.01, double.MaxValue, ErrorMessage = "El monto debe ser mayor a 0.")]
        public decimal Amount { get; set; }

        [Required(ErrorMessage = "El método de pago es obligatorio.")]
        [StringLength(255, ErrorMessage = "El método de pago no puede exceder 255 caracteres.")]
        public string Payment_Method { get; set; }

        [StringLength(50, ErrorMessage = "El mes de referencia no puede exceder 50 caracteres.")]
        public string? Reference_Month { get; set; }

        public string? Observation { get; set; }
    }

    public class UpdatePaymentDTO
    {
        [Required(ErrorMessage = "La fecha de pago es obligatoria.")]
        public DateTime Payment_Date { get; set; }

        [Required(ErrorMessage = "El monto es obligatorio.")]
        [Range(0.01, double.MaxValue, ErrorMessage = "El monto debe ser mayor a 0.")]
        public decimal Amount { get; set; }

        [Required(ErrorMessage = "El método de pago es obligatorio.")]
        [StringLength(255, ErrorMessage = "El método de pago no puede exceder 255 caracteres.")]
        public string Payment_Method { get; set; }

        [StringLength(50, ErrorMessage = "El mes de referencia no puede exceder 50 caracteres.")]
        public string? Reference_Month { get; set; }

        public string? Observation { get; set; }
    }
}