using System.ComponentModel.DataAnnotations;
namespace API_PESO_PIG.DTOs
{
    public class WeighingDTO
    {
        public int Id_Weighing { get; set; }
        public float Weight_Current { get; set; }
        public float Weight_Gain { get; set; }

        [DataType(DataType.Date)]
        public DateTime Fec_Weight { get; set; }
        public string Name_Piglet { get; set; }
        public string Nom_Users { get; set; }

    }
}
