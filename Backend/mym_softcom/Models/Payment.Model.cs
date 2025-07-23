using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace mym_softcom.Models
{
    public class Payment
    {
        [Key]
        public int id_Payments { get; set; }
        public DateTime payment_date { get; set; }
        public decimal? amount { get; set; }
        public string payment_method { get; set; }

        //foránea a la tabla Sales
        public int id_Sales { get; set; }

        [ForeignKey("id_Sales")]
        public Sale? sale { get; set; }
    }
}