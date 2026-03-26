using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace mym_softcom.Models
{
    public class MaterialMovement
    {
        [Key]
        public int id_MaterialMovements { get; set; }

        [Required]
        public int id_Materials { get; set; }

        [StringLength(20)]
        public string movement_type { get; set; } = "ajuste";

        [Column(TypeName = "decimal(15,2)")]
        public decimal old_stock { get; set; }

        [Column(TypeName = "decimal(15,2)")]
        public decimal new_stock { get; set; }

        [Column(TypeName = "decimal(15,2)")]
        public decimal difference { get; set; }

        [StringLength(1000)]
        public string? observations { get; set; }

        [StringLength(200)]
        public string? supplier { get; set; }

        public int? id_Projects { get; set; }

        [StringLength(200)]
        public string? user_name { get; set; }

        public DateTime created_date { get; set; } = DateTime.Now;

        public Material? Material { get; set; }
        public Project? Project { get; set; }
    }
}
