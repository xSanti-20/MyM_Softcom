using System.ComponentModel.DataAnnotations;

namespace mym_softcom.DTOs
{
    public class WithdrawalDTO
    {
        public int Id_Withdrawals { get; set; }
        public int Id_Sales { get; set; }
        public string? Sale_Lot_Block { get; set; } // Para mostrar el bloque del lote de la venta
        public int? Sale_Lot_Number { get; set; } // Para mostrar el número del lote de la venta
        public string? Sale_Client_Names { get; set; } // Para mostrar el nombre del cliente de la venta
        public string? Sale_Client_Surnames { get; set; } // Para mostrar el apellido del cliente de la venta
        public string? Sale_Project_Name { get; set; } // Para mostrar el nombre del proyecto de la venta
        public string Reason { get; set; }
        public DateTime Withdrawal_Date { get; set; }
        public decimal Penalty { get; set; }
    }

    public class CreateWithdrawalDTO
    {
        [Required(ErrorMessage = "El ID de la venta es obligatorio.")]
        public int Id_Sales { get; set; }

        [Required(ErrorMessage = "La razón del desistimiento es obligatoria.")]
        public string Reason { get; set; }

        [Required(ErrorMessage = "La fecha de desistimiento es obligatoria.")]
        public DateTime Withdrawal_Date { get; set; }
    }

    public class UpdateWithdrawalDTO
    {
        [Required(ErrorMessage = "La razón del desistimiento es obligatoria.")]
        public string Reason { get; set; }

        [Required(ErrorMessage = "La fecha de desistimiento es obligatoria.")]
        public DateTime Withdrawal_Date { get; set; }
    }
}