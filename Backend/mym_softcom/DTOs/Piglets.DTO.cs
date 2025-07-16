using System.ComponentModel.DataAnnotations;

namespace API_PESO_PIG.DTOs
{
    public class PigletsDTO
    {
        public int Id_Piglet { get; set; }
        public string Name_Piglet { get; set; }
        public float Acum_Weight { get; set; }

        [DataType(DataType.Date)]
        public DateTime Fec_Birth { get; set; }
        public float Weight_Initial { get; set; }
        public string Sex_Piglet { get; set; }
        public int Placa_Sena { get; set; }
        public string Nam_Race { get; set; }
        public string Name_Stage { get; set; }
        public string Des_Corral { get; set; }
        public DateTime Sta_Date { get; set; }
        public bool Is_Active { get; set; } = true; 
    }
}
