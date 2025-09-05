using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;
using System.ComponentModel.Design; // Necesario para ICollection

namespace mym_softcom.Models
{
    public class Sale
    {
        [Key]
        public int id_Sales { get; set; }
        public DateTime sale_date { get; set; }
        public decimal? total_value { get; set; }
        public decimal? initial_payment { get; set; }
        public decimal? total_raised { get; set; }
        public decimal? quota_value { get; set; }
        public decimal? total_debt { get; set; } // Valor total pendiente
        public string status { get; set; } = "Active";
        public decimal? RedistributionAmount { get; set; }
        public string? RedistributionType { get; set; }
        public string? RedistributedQuotaNumbers { get; set; }
        public decimal? LastQuotaValue { get; set; } // Added LastQuotaValue property for lastQuota redistribution type


        public decimal? NewQuotaValue { get; set; }
        public decimal? OriginalQuotaValue { get; set; }

        //foránea a la tabla Clients
        public int id_Clients { get; set; }

        [ForeignKey("id_Clients")]
        public Client? client { get; set; }

        //foránea a la tabla Lots
        public int id_Lots { get; set; }

        [ForeignKey("id_Lots")]
        public Lot? lot { get; set; }

        //foránea a la tabla Users
        public int id_Users { get; set; }

        [ForeignKey("id_Users")]
        public User? user { get; set; }

        //foránea a la tabla Plans
        public int id_Plans { get; set; }

        [ForeignKey("id_Plans")]
        public Plan? plan { get; set; }
    }

    public class RedistributeQuotasRequest
    {
        public string RedistributionType { get; set; } // "uniform" o "lastQuota"
        public List<OverdueQuotaInfo> OverdueQuotas { get; set; }
    }

    public class OverdueQuotaInfo
    {
        public int QuotaNumber { get; set; }

        public decimal RemainingAmount { get; set; }
    }

    public class ServiceResult<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public T Data { get; set; }
    }
}
