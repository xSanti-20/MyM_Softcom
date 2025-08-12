using System;
using System.ComponentModel.DataAnnotations;

namespace mym_softcom.Models
{
    public class CesionRequest
    {
        [Required(ErrorMessage = "Los datos del nuevo cliente son obligatorios")]
        public Client NuevoCliente { get; set; } = new Client();

        [Required(ErrorMessage = "El documento del cliente cedente es obligatorio")]
        public int DocumentoCedente { get; set; }

        [Required(ErrorMessage = "El motivo de la cesión es obligatorio")]
        public string MotivoCesion { get; set; } = string.Empty;

        public decimal? CostoCesion { get; set; } = 0;

        public string? Observaciones { get; set; }

        [Required(ErrorMessage = "El ID del usuario es obligatorio")]
        public int IdUsuario { get; set; }
    }

    public class CesionResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public Cesion? Cesion { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
    }

    public class CesionInfo
    {
        public int Id_Cesiones { get; set; }
        public DateTime Fecha_Cesion { get; set; }
        public string Motivo { get; set; } = string.Empty;
        public decimal? Costo { get; set; }
        public string Status { get; set; } = string.Empty;

        // Información del cedente
        public string Cedente_Nombre { get; set; } = string.Empty;
        public int Cedente_Documento { get; set; }

        // Información del cesionario
        public string Cesionario_Nombre { get; set; } = string.Empty;
        public int Cesionario_Documento { get; set; }

        // Información de la venta
        public int Id_Venta { get; set; }
        public string Lote_Nombre { get; set; } = string.Empty;
        public string Proyecto_Nombre { get; set; } = string.Empty;
        public decimal? Valor_Total_Venta { get; set; }
        public decimal? Valor_Pagado_Antes { get; set; }
        public decimal? Deuda_Antes { get; set; }

        public string? Observaciones { get; set; }
    }
}
