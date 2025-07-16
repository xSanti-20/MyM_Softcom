using System.ComponentModel.DataAnnotations;
namespace API_PESO_PIG.DTOs
{
    public class EntriesDTO
    {
        public int id_Entries { get; set; }
        public int id_Food { get; set; }
        public DateTime Fec_Entries { get; set; }
        public DateTime Fec_Expiration { get; set; }
        public int Can_Food { get; set; }
        public int vlr_Unitary { get; set; }
        public int vlr_Total { get; set; }
        public int Vlr_Promedio { get; set; }
        public string Nam_Food { get; set; }
        
    }
}