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
        public string? initial_payment_method { get; set; } // Método de pago de la cuota inicial: "Efectivo", "Banco Ahorros", "Banco Corriente"
        public decimal? total_raised { get; set; }
        public decimal? quota_value { get; set; }
        public decimal? total_debt { get; set; } // Valor total pendiente

        // ✅ CORREGIDO: Sin valor por defecto en C#, la BD lo manejará
        [Column(TypeName = "enum('Active','Desistida','Escriturar')")]
        public string? status { get; set; }

        [NotMapped]
        public decimal? RedistributionAmount { get; set; }
        [NotMapped]
        public string? RedistributionType { get; set; }
        [NotMapped]
        public string? RedistributedQuotaNumbers { get; set; }
        [NotMapped]
        public decimal? LastQuotaValue { get; set; } // Added LastQuotaValue property for lastQuota redistribution type

        [NotMapped]
        public decimal? NewQuotaValue { get; set; }
        [NotMapped]
        public decimal? OriginalQuotaValue { get; set; }
        [NotMapped]
        public int? CustomNumQuotasToUpdate { get; set; } // ← NUEVO: Para redistribución personalizada, cuántas cuotas finales se actualizan
        [NotMapped]
        public int? FromQuotaRange { get; set; } // ← NUEVO: Cuota inicial del rango para redistribución personalizada
        [NotMapped]
        public int? ToQuotaRange { get; set; } // ← NUEVO: Cuota final del rango para redistribución personalizada

        [NotMapped]
        public string? PaymentPlanType { get; set; } = "Automatic"; // "Automatic", "Custom", "House"
        [NotMapped]
        public string? CustomQuotasJson { get; set; } // JSON array for custom quotas: [{"quotaNumber": 1, "amount": 1000000}, ...]
        [NotMapped]
        public decimal? HouseInitialPercentage { get; set; } = 30; // For house type, default 30%
        [NotMapped]
        public decimal? HouseInitialAmount { get; set; } // Calculated amount for house initial payment

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

    public class CustomQuota
    {
        public int QuotaNumber { get; set; }
        public decimal Amount { get; set; }
        public DateTime? DueDate { get; set; } // ✅ NUEVO: Fecha de vencimiento personalizada (opcional para compatibilidad)
    }

    public class ServiceResult<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public T Data { get; set; }
    }
}
