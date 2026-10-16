using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace mym_softcom.Models
{
    public class Quota
    {
        [Key]
        public int id { get; set; }

        // FK a Sales
        [ForeignKey("sale")]
        public int id_sale { get; set; }

        [JsonIgnore]  // ✅ Rompe ciclo de referencia circular
        public Sale? sale { get; set; }

        // Datos de la cuota
        [Required]
        public int quota_number { get; set; }

        [Required]
        public decimal amount { get; set; } // Monto original de la cuota

        [Required]
        public decimal current_amount { get; set; } // Monto actual (puede cambiar en redistribución)

        [Required]
        public DateTime due_date { get; set; } // Fecha de vencimiento

        // Estado de la cuota
        [Column(TypeName = "varchar(50)")]
        public string status { get; set; } = "Pending"; // "Pending", "Distribuida", "Pagada", "Vencida"

        // Tracking de cambios
        public decimal? redistributed_amount { get; set; } = 0; // Cuánto fue redistribuido
        
        public DateTime created_at { get; set; } = DateTime.Now;

        public DateTime? updated_at { get; set; }

        public DateTime? last_modified { get; set; }
    }
}
