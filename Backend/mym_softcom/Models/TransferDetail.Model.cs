using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace mym_softcom.Models
{
    public class TransferDetail
    {
        [Key]
        public int id_TransferDetails { get; set; }

        // Referencia al traslado maestro
        [Required]
        public int id_Transfers { get; set; }

        [ForeignKey("id_Transfers")]
        public Transfer? transfer { get; set; }

        // Número de cuota del lote destino que recibe dinero
        [Required]
        public int number_quota { get; set; }

        // Monto distribuido en esta cuota
        [Required]
        [Column(TypeName = "decimal(15,2)")]
        public decimal amount { get; set; }

        // Auditoría
        public DateTime created_at { get; set; } = DateTime.Now;
    }
}
