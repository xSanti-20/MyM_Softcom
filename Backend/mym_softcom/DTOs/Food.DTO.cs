using System.ComponentModel.DataAnnotations;
namespace API_PESO_PIG.DTOs
{
    public class FoodDTO 

    {
        public int Id_Food { get; set; }
        public string Nam_Food { get; set; }
        public float Existence { get; set; }
        public float Vlr_Unit { get; set; }
        public float Rat_Food { get; set; }
        public string Und_Extent { get; set; }
        public string Name_Stage { get; set; }
        public int Id_Stage { get; set; }



    }
}
