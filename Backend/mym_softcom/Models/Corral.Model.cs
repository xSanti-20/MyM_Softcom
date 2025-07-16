using System.ComponentModel.DataAnnotations;

namespace API_PESO_PIG.Models
{
    public class Corral
    {
        [Key]
        public int id_Corral { get; set; }
        public string Des_Corral { get; set; }
        public int Tot_Animal { get; set; }
        public float Tot_Pesaje { get; set; }
        public string Est_Corral { get; set; }
    }
}
