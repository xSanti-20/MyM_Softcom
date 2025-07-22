using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic; // Necesario para ICollection

namespace mym_softcom.Models
{
    public class Plan
    {
        [Key]
        public int id_Plans { get; set; }

        [StringLength(250)]
        public string? name { get; set; } // varchar DEFAULT NULL en SQL
        public int? number_quotas { get; set; } // int DEFAULT NULL en SQL
    }
}