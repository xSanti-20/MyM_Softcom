using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace mym_softcom.Models
{
    public class Transfer
    {
        [Key]
        public int id_Transfers { get; set; }

        [Required]
        public DateTime transfer_date { get; set; } = DateTime.Now;

        [Required]
        [Column(TypeName = "enum('Completo','Parcial')")]
        public string type { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(15,2)")]
        public decimal amount_transferred { get; set; }

        public string? accounting_note { get; set; }

        [Required]
        public string status { get; set; } = "Completado";

        // Sale de origen (de donde se quita la plata)
        [Required]
        public int id_Sales_Origen { get; set; }

        [ForeignKey("id_Sales_Origen")]
        public Sale? sale_origen { get; set; }

        // Sale de destino (a donde va la plata)
        [Required]
        public int id_Sales_Destino { get; set; }

        [ForeignKey("id_Sales_Destino")]
        public Sale? sale_destino { get; set; }

        // Cliente (debe ser el mismo en ambas sales)
        [Required]
        public int id_Clients { get; set; }

        [ForeignKey("id_Clients")]
        public Client? client { get; set; }

        // Auditoría
        public DateTime created_at { get; set; } = DateTime.Now;

        // Relación de navegación a detalles
        public ICollection<TransferDetail>? transfer_details { get; set; }
    }
}
