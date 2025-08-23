using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic; // Necesario para ICollection

namespace mym_softcom.Models
{
    public class Lot
    {
        [Key]
        public int id_Lots { get; set; }
        public string block { get; set; }
        public int lot_number { get; set; }
        public int lot_area { get; set; }
        public string status { get; set; } = "Libre";

        //foránea a la tabla Projects
        public int id_Projects { get; set; }

        [ForeignKey("id_Projects")]
        public Project? project { get; set; }
    }
}