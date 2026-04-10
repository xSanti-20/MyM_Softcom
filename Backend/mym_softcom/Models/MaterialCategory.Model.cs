using System.ComponentModel.DataAnnotations;

namespace mym_softcom.Models
{
    public class MaterialCategory
    {
        [Key]
        public int id_Categories { get; set; }

        [Required]
        [StringLength(120)]
        public string name { get; set; } = string.Empty;

        [StringLength(250)]
        public string? description { get; set; }

        [StringLength(20)]
        public string status { get; set; } = "Activo";

        public DateTime created_date { get; set; } = DateTime.Now;

        public DateTime? updated_date { get; set; }
    }
}
