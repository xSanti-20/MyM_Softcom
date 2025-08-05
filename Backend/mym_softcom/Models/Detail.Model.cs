using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace mym_softcom.Models
{
    public class Detail
    {
        [Key]
        public int id_Details { get; set; }

        public int number_quota { get; set; }

        [Column(TypeName = "decimal(15,2)")]
        public decimal? covered_amount { get; set; }

        // Foránea a la tabla Payments
        public int id_Payments { get; set; }

        [ForeignKey("id_Payments")]
        public Payment? payment { get; set; }

        // Foránea a la tabla Sales
        public int id_Sales { get; set; }

        [ForeignKey("id_Sales")]
        public Sale? sale { get; set; }
    }
}
