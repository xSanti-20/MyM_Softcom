using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace mym_softcom.Models
{
    public class Discount
    {
        [Key]
        public int id_Discount { get; set; }

        [Required]
        public int id_Clients { get; set; }

        [ForeignKey("id_Clients")]
        public Client? Client { get; set; }

        public int? id_Sales { get; set; }

        [ForeignKey("id_Sales")]
        public Sale? Sale { get; set; }

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal discount_amount { get; set; }

        [Required]
        [MaxLength(50)]
        public string discount_type { get; set; } = "referral";

        [Required]
        [MaxLength(50)]
        public string apply_to { get; set; } // "cartera" o "cuota"

        [MaxLength(500)]
        public string? notes { get; set; }

        [Required]
        [Column(TypeName = "date")]
        public DateTime discount_date { get; set; }

        [Column(TypeName = "timestamp")]
        public DateTime created_at { get; set; } = DateTime.Now;

        [Column(TypeName = "timestamp")]
        public DateTime? updated_at { get; set; } = DateTime.Now;

        public bool is_active { get; set; } = true;
    }
}
