using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace API_PESO_PIG.Models
{
    public class Race
    {
        [Key]
        public int id_Race { get; set; }
        public string Nam_Race { get; set; }
    }
}
