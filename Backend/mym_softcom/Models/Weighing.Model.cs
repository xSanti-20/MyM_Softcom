using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_PESO_PIG.Models
{
    public class Weighing
    {
        [Key]
        public int id_Weighings { get; set; }
        public float Weight_Current { get; set; }
        public float Weight_Gain { get; set; }
        public DateTime Fec_Weight { get; set; }

        // Clave foránea explícita
        public int Id_Piglet { get; set; }

        [ForeignKey("Id_Piglet")]
        public Piglet? piglet { get; set; }

        public int id_Users { get; set; }

        [ForeignKey("id_Users")]
        public User? user { get; set; }
    }

}