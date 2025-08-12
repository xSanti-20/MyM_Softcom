using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace mym_softcom.Models
{
    public class Cesion
    {
        [Key]
        public int id_Cesiones { get; set; }

        [Required]
        public DateTime cesion_date { get; set; } = DateTime.Now;

        [Required]
        public string cesion_reason { get; set; } = string.Empty;

        public decimal? cesion_cost { get; set; } = 0;

        public string status { get; set; } = "Completada";

        // Cliente que cede (cedente)
        [Required]
        public int id_Client_Cedente { get; set; }

        [ForeignKey("id_Client_Cedente")]
        public Client? client_cedente { get; set; }

        // Cliente que recibe (cesionario)
        [Required]
        public int id_Client_Cesionario { get; set; }

        [ForeignKey("id_Client_Cesionario")]
        public Client? client_cesionario { get; set; }

        // Venta que se cede
        [Required]
        public int id_Sales { get; set; }

        [ForeignKey("id_Sales")]
        public Sale? sale { get; set; }

        // Usuario que registra la cesión
        [Required]
        public int id_Users { get; set; }

        [ForeignKey("id_Users")]
        public User? user { get; set; }

        // Campos adicionales para auditoría
        public decimal? valor_pagado_antes_cesion { get; set; }
        public decimal? deuda_antes_cesion { get; set; }
        public string? observaciones { get; set; }
    }
}
