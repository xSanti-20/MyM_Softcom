using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace mym_softcom.Models
{
    /// <summary>
    /// Representa un material de construcción con su stock
    /// </summary>
    public class Material
    {
        [Key]
        public int id_Materials { get; set; }

        [Required(ErrorMessage = "El nombre del material es obligatorio")]
        [StringLength(200)]
        public string name { get; set; } = string.Empty;

        [StringLength(500)]
        public string? description { get; set; }

        [Required(ErrorMessage = "La unidad de medida es obligatoria")]
        [StringLength(50)]
        public string unit_of_measure { get; set; } = string.Empty; // Bulto, Metro, Unidad, Kilo, etc.

        [Column(TypeName = "decimal(15,2)")]
        public decimal? unit_cost { get; set; }

        [Column(TypeName = "decimal(15,2)")]
        public decimal current_stock { get; set; } = 0; // Stock actual

        [Column(TypeName = "decimal(15,2)")]
        public decimal? minimum_stock { get; set; }

        [StringLength(100)]
        public string? category { get; set; }

        [StringLength(20)]
        public string status { get; set; } = "Activo";

        public DateTime created_date { get; set; } = DateTime.Now;

        public DateTime? updated_date { get; set; }
    }
}
