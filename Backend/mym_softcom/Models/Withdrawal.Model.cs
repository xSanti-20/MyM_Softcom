using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace mym_softcom.Models
{
    public class Withdrawal
    {
        [Key]
        public int id_Withdrawals { get; set; }
        public string reason { get; set; }
        public DateTime withdrawal_date { get; set; }
        public decimal? penalty { get; set; }

        //foránea a la tabla Sales
        public int id_Sales { get; set; }

        [ForeignKey("id_Sales")]
        public Sale? sale { get; set; }
    }
}