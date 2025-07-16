using System.ComponentModel.DataAnnotations;
namespace API_PESO_PIG.DTOs
{
    public class FeedingDTO
    {
        public int id_Feeding { get; set; }
        public string Obc_Feeding { get; set; }
        public int Can_Food { get; set; }
        public int Sum_Food  {get; set; }
        public string Nom_Users { get; set; }
        public string Nam_Corral { get; set; }
        public string Nam_Food { get; set;}
        public DateTime Dat_Feeding { get; set; }
    }
}


