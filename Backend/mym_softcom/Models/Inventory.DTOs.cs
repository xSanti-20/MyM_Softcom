using System.ComponentModel.DataAnnotations;

namespace mym_softcom.Models
{
    // ============================
    // REQUEST DTOs
    // ============================

 /// <summary>
    /// Request para crear o actualizar un material
    /// </summary>
    public class MaterialRequest
    {
     [Required(ErrorMessage = "El nombre del material es obligatorio")]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

 [Required(ErrorMessage = "La unidad de medida es obligatoria")]
 public string UnitOfMeasure { get; set; } = string.Empty;

  public decimal? UnitCost { get; set; }

        public decimal? MinimumStock { get; set; }

public string? Category { get; set; }
    }

    /// <summary>
    /// Request para actualizar el stock de un material
    /// </summary>
    public class UpdateStockRequest
    {
 [Required(ErrorMessage = "El ID del material es obligatorio")]
   public int IdMaterial { get; set; }

      [Required(ErrorMessage = "El nuevo stock es obligatorio")]
    [Range(0, double.MaxValue, ErrorMessage = "El stock no puede ser negativo")]
  public decimal NewStock { get; set; }

   public string? Observations { get; set; }

   public string? Supplier { get; set; }

   public int? ProjectId { get; set; }
    }

    /// <summary>
    /// Request para editar un movimiento de trazabilidad
    /// </summary>
    public class UpdateMovementRequest
    {
        [Required(ErrorMessage = "El ID del movimiento es obligatorio")]
        public int IdMovement { get; set; }

      [Required(ErrorMessage = "El nuevo stock es obligatorio")]
      [Range(0, double.MaxValue, ErrorMessage = "El stock no puede ser negativo")]
      public decimal NewStock { get; set; }

        public string? Observations { get; set; }

        public string? Supplier { get; set; }

        public int? ProjectId { get; set; }
    }

    // ============================
    // RESPONSE DTOs
    // ============================

    /// <summary>
    /// Respuesta gen�rica para operaciones de inventario
    /// </summary>
    public class InventoryResponse
    {
  public bool Success { get; set; }
      public string Message { get; set; } = string.Empty;
    public List<string> Errors { get; set; } = new List<string>();
    }

    /// <summary>
 /// Respuesta con informaci�n de un material
    /// </summary>
  public class MaterialResponse : InventoryResponse
    {
public Material? Material { get; set; }
    }

 // ============================
// INFO DTOs (para consultas detalladas)
    // ============================

    /// <summary>
    /// Informaci�n detallada de stock por material
 /// </summary>
    public class MaterialStockInfo
{
        public int Id_Material { get; set; }
  public string Nombre { get; set; } = string.Empty;
      public string? Descripcion { get; set; }
   public string Unidad_Medida { get; set; } = string.Empty;
        public decimal? Costo_Unitario { get; set; }
  public decimal Stock_Actual { get; set; }
        public decimal? Stock_Minimo { get; set; }
  public string? Categoria { get; set; }
 public string Status { get; set; } = string.Empty;
     public bool Requiere_Reposicion { get; set; }
   public decimal? Valor_Total_Inventario { get; set; } // stock * costo_unitario
  }

      /// <summary>
      /// Historial de movimientos de inventario por material
      /// </summary>
      public class MaterialMovementHistoryItem
      {
         public int Id { get; set; }
         public int MaterialId { get; set; }
         public DateTime Date { get; set; }
         public decimal OldStock { get; set; }
         public decimal NewStock { get; set; }
         public decimal Difference { get; set; }
         public string Type { get; set; } = string.Empty;
         public string Observations { get; set; } = "Sin observaciones";
         public string? Supplier { get; set; }
         public int? ProjectId { get; set; }
         public string? ProjectName { get; set; }
         public string User { get; set; } = "Sistema";
      }
}
