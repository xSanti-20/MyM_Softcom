using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace mym_softcom.Models
{
    // ============ REQUEST DTOs ============
    public class CreateTransferRequest
    {
        [Required(ErrorMessage = "El tipo de traslado es obligatorio")]
        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty; // "Completo" o "Parcial"

        [Required(ErrorMessage = "El ID de la venta origen es obligatorio")]
        [JsonPropertyName("idSalesOrigen")]
        public int IdSalesOrigen { get; set; }

        [Required(ErrorMessage = "El ID de la venta destino es obligatorio")]
        [JsonPropertyName("idSalesDestino")]
        public int IdSalesDestino { get; set; }

        [Required(ErrorMessage = "El monto a trasladar es obligatorio")]
        [JsonPropertyName("amountTransferred")]
        public decimal AmountTransferred { get; set; }

        // Obligatorio si es Parcial, opcional si es Completo
        [JsonPropertyName("accountingNote")]
        public string? AccountingNote { get; set; }
    }

    // ============ RESPONSE DTOs ============
    public class TransferResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public TransferDetailedInfo? Transfer { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
    }

    // Información detallada del traslado
    public class TransferDetailedInfo
    {
        public int Id_Transfers { get; set; }
        public DateTime Fecha_Traslado { get; set; }
        public string Tipo { get; set; } = string.Empty; // Completo o Parcial
        public decimal Monto_Trasladado { get; set; }
        public string? Nota_Contable { get; set; }
        public string Status { get; set; } = string.Empty;

        // Info Venta Origen
        public int Id_Venta_Origen { get; set; }
        public string Lote_Origen { get; set; } = string.Empty;
        public string Proyecto_Origen { get; set; } = string.Empty;
        public decimal? Saldo_Anterior_Origen { get; set; }
        public decimal? Saldo_Nuevo_Origen { get; set; }

        // Info Venta Destino
        public int Id_Venta_Destino { get; set; }
        public string Lote_Destino { get; set; } = string.Empty;
        public string Proyecto_Destino { get; set; } = string.Empty;
        public decimal? Saldo_Anterior_Destino { get; set; }
        public decimal? Saldo_Nuevo_Destino { get; set; }

        // Info Cliente
        public int Id_Cliente { get; set; }
        public string Nombre_Cliente { get; set; } = string.Empty;
        public int Documento_Cliente { get; set; }

        // Detalles de distribución
        public List<TransferQuotaDistribution>? Distribuciones { get; set; }
    }

    // Distribución de cuota
    public class TransferQuotaDistribution
    {
        public int Numero_Cuota { get; set; }
        public decimal Monto { get; set; }
    }

    // DTO para actualizar traslado
    public class UpdateTransferRequest
    {
        [JsonPropertyName("accountingNote")]
        public string? AccountingNote { get; set; }
    }

    // DTO para listar traslados
    public class TransferListItem
    {
        public int Id_Transfers { get; set; }
        public DateTime Fecha_Traslado { get; set; }
        public string Tipo { get; set; } = string.Empty;
        public decimal Monto { get; set; }
        public string Cliente { get; set; } = string.Empty;
        public int Documento { get; set; }
        public string Lote_Origen { get; set; } = string.Empty;
        public string Lote_Destino { get; set; } = string.Empty;
        public string Proyecto { get; set; } = string.Empty;
        public string Usuario { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }
}
