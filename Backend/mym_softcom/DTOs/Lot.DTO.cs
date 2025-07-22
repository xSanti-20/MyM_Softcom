using System.ComponentModel.DataAnnotations;

namespace mym_softcom.DTOs
{
    public class LotDTO
    {
        public int Id_Lots { get; set; }
        public string Block { get; set; }
        public int Lot_Number { get; set; }
        public string Status { get; set; }

        // Información del proyecto
        public int Id_Projects { get; set; }
        public string Project_Name { get; set; }

        // Propiedades calculadas
        public string Full_Description { get; set; }
        public bool Is_Available { get; set; }
        public decimal? Sale_Value { get; set; }
        public string Client_Name { get; set; }
        public DateTime? Sale_Date { get; set; }
    }

    public class CreateLotDTO
    {
        [Required(ErrorMessage = "El bloque es obligatorio")]
        [StringLength(250, ErrorMessage = "El bloque no puede exceder 250 caracteres")]
        public string Block { get; set; }

        [Required(ErrorMessage = "El número de lote es obligatorio")]
        public int Lot_Number { get; set; }

        [Required(ErrorMessage = "El proyecto es obligatorio")]
        public int Id_Projects { get; set; }
    }

    public class UpdateLotDTO
    {
        [Required(ErrorMessage = "El bloque es obligatorio")]
        [StringLength(250, ErrorMessage = "El bloque no puede exceder 250 caracteres")]
        public string Block { get; set; }

        [Required(ErrorMessage = "El número de lote es obligatorio")]
        public int Lot_Number { get; set; }

        [Required(ErrorMessage = "El estado es obligatorio")]
        public string Status { get; set; }
    }
}