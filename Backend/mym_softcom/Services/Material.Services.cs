using mym_softcom.Models;
using Microsoft.EntityFrameworkCore;

namespace mym_softcom.Services
{
    public class MaterialServices
    {
        private readonly AppDbContext _context;

        public MaterialServices(AppDbContext context)
        {
   _context = context;
        }

        /// <summary>
     /// Obtiene todos los materiales
 /// </summary>
  public async Task<IEnumerable<Material>> GetAllMaterials()
    {
    return await _context.Materials
      .OrderBy(m => m.name)
  .ToListAsync();
        }

 /// <summary>
  /// Obtiene todos los materiales activos
      /// </summary>
  public async Task<IEnumerable<Material>> GetActiveMaterials()
      {
    return await _context.Materials
   .Where(m => m.status == "Activo")
  .OrderBy(m => m.name)
       .ToListAsync();
 }

      /// <summary>
  /// Obtiene un material por ID
        /// </summary>
    public async Task<Material?> GetMaterialById(int idMaterial)
   {
      return await _context.Materials
.FirstOrDefaultAsync(m => m.id_Materials == idMaterial);
        }

/// <summary>
     /// Crea un nuevo material
    /// </summary>
    public async Task<MaterialResponse> CreateMaterial(MaterialRequest request)
  {
  try
         {
      // Validar que no exista un material con el mismo nombre
          var exists = await _context.Materials
 .AnyAsync(m => m.name.ToLower() == request.Name.ToLower());

     if (exists)
    {
 return new MaterialResponse
    {
   Success = false,
     Message = "Ya existe un material con ese nombre",
          Errors = { "Nombre duplicado" }
 };
 }

    var material = new Material
{
   name = request.Name,
        description = request.Description,
        unit_of_measure = request.UnitOfMeasure,
 unit_cost = request.UnitCost,
        minimum_stock = request.MinimumStock,
      category = request.Category,
         current_stock = 0,
      status = "Activo",
    created_date = DateTime.Now
      };

  _context.Materials.Add(material);
          await _context.SaveChangesAsync();

return new MaterialResponse
      {
        Success = true,
 Message = "Material creado exitosamente",
          Material = material
             };
     }
catch (Exception ex)
      {
    return new MaterialResponse
    {
     Success = false,
      Message = $"Error al crear el material: {ex.Message}",
Errors = { ex.Message }
       };
  }
  }

/// <summary>
   /// Actualiza un material existente
    /// </summary>
  public async Task<MaterialResponse> UpdateMaterial(int idMaterial, MaterialRequest request)
     {
    try
      {
        var material = await GetMaterialById(idMaterial);
   if (material == null)
   {
     return new MaterialResponse
  {
   Success = false,
 Message = "Material no encontrado",
   Errors = { "Material no existe" }
    };
         }

      // Validar nombre duplicado (excepto el mismo material)
  var exists = await _context.Materials
  .AnyAsync(m => m.name.ToLower() == request.Name.ToLower() && 
   m.id_Materials != idMaterial);

     if (exists)
  {
  return new MaterialResponse
      {
       Success = false,
         Message = "Ya existe otro material con ese nombre",
      Errors = { "Nombre duplicado" }
 };
       }

    material.name = request.Name;
  material.description = request.Description;
   material.unit_of_measure = request.UnitOfMeasure;
        material.unit_cost = request.UnitCost;
    material.minimum_stock = request.MinimumStock;
     material.category = request.Category;
material.updated_date = DateTime.Now;

       _context.Materials.Update(material);
       await _context.SaveChangesAsync();

       return new MaterialResponse
    {
   Success = true,
 Message = "Material actualizado exitosamente",
     Material = material
   };
       }
       catch (Exception ex)
      {
  return new MaterialResponse
        {
   Success = false,
 Message = $"Error al actualizar el material: {ex.Message}",
 Errors = { ex.Message }
     };
    }
   }

        /// <summary>
      /// Actualiza el stock de un material directamente
        /// </summary>
  public async Task<MaterialResponse> UpdateStock(int idMaterial, decimal newStock, string? observations = null)
        {
        return await UpdateStock(idMaterial, newStock, observations, null, null, null);
     }

      /// <summary>
      /// Actualiza stock y registra la trazabilidad del movimiento
      /// </summary>
      public async Task<MaterialResponse> UpdateStock(
        int idMaterial,
        decimal newStock,
        string? observations,
        string? supplier,
        int? projectId,
        string? userName)
      {
        try
        {
          var material = await GetMaterialById(idMaterial);
          if (material == null)
          {
            return new MaterialResponse
            {
              Success = false,
              Message = "Material no encontrado",
              Errors = { "Material no existe" }
            };
          }

          if (newStock < 0)
          {
            return new MaterialResponse
            {
              Success = false,
              Message = "El stock no puede ser negativo",
              Errors = { "Stock invalido" }
            };
          }

          var oldStock = material.current_stock;
          var difference = newStock - oldStock;
          var movementType = difference > 0 ? "entrada" : difference < 0 ? "salida" : "ajuste";

          if (movementType == "entrada" && string.IsNullOrWhiteSpace(supplier))
          {
            return new MaterialResponse
            {
              Success = false,
              Message = "Debes especificar el proveedor para una entrada de stock",
              Errors = { "Proveedor requerido" }
            };
          }

          if (movementType == "salida" && !projectId.HasValue)
          {
            return new MaterialResponse
            {
              Success = false,
              Message = "Debes especificar el proyecto para una salida de stock",
              Errors = { "Proyecto requerido" }
            };
          }

          Project? project = null;
          if (projectId.HasValue)
          {
            project = await _context.Projects.FirstOrDefaultAsync(p => p.id_Projects == projectId.Value);
            if (project == null)
            {
              return new MaterialResponse
              {
                Success = false,
                Message = "El proyecto seleccionado no existe",
                Errors = { "Proyecto invalido" }
              };
            }
          }

          using var transaction = await _context.Database.BeginTransactionAsync();

          material.current_stock = newStock;
          material.updated_date = DateTime.Now;

          _context.Materials.Update(material);

          var movement = new MaterialMovement
          {
            id_Materials = material.id_Materials,
            movement_type = movementType,
            old_stock = oldStock,
            new_stock = newStock,
            difference = difference,
            observations = string.IsNullOrWhiteSpace(observations) ? "Sin observaciones" : observations.Trim(),
            supplier = string.IsNullOrWhiteSpace(supplier) ? null : supplier.Trim(),
            id_Projects = projectId,
            user_name = string.IsNullOrWhiteSpace(userName) ? "Usuario actual" : userName.Trim(),
            created_date = DateTime.Now
          };

          _context.MaterialMovements.Add(movement);
          await _context.SaveChangesAsync();
          await transaction.CommitAsync();

          var detail = difference > 0
            ? $"Entrada de +{difference}"
            : difference < 0
              ? $"Salida de {difference}"
              : "Ajuste sin cambio";

          return new MaterialResponse
          {
            Success = true,
            Message = $"Stock actualizado de {oldStock} a {newStock} {material.unit_of_measure}. {detail}",
            Material = material
          };
        }
        catch (Exception ex)
        {
          return new MaterialResponse
          {
            Success = false,
            Message = $"Error al actualizar el stock: {ex.Message}",
            Errors = { ex.Message }
          };
        }
      }

      /// <summary>
      /// Obtiene el historial de movimientos de un material
      /// </summary>
      public async Task<IEnumerable<MaterialMovementHistoryItem>> GetMovementHistory(int idMaterial, int limit = 200)
      {
        var maxRows = limit <= 0 ? 200 : Math.Min(limit, 1000);

        return await _context.MaterialMovements
          .AsNoTracking()
          .Include(m => m.Project)
          .Where(m => m.id_Materials == idMaterial)
          .OrderByDescending(m => m.created_date)
          .Take(maxRows)
          .Select(m => new MaterialMovementHistoryItem
          {
            Id = m.id_MaterialMovements,
            MaterialId = m.id_Materials,
            Date = m.created_date,
            OldStock = m.old_stock,
            NewStock = m.new_stock,
            Difference = m.difference,
            Type = m.movement_type,
            Observations = string.IsNullOrWhiteSpace(m.observations) ? "Sin observaciones" : m.observations,
            Supplier = m.supplier,
            ProjectId = m.id_Projects,
            ProjectName = m.Project != null ? m.Project.name : null,
            User = string.IsNullOrWhiteSpace(m.user_name) ? "Sistema" : m.user_name
          })
          .ToListAsync();
      }

/// <summary>
        /// Cambia el estado de un material (Activo/Inactivo)
   /// </summary>
  public async Task<InventoryResponse> ToggleMaterialStatus(int idMaterial)
 {
   try
      {
      var material = await GetMaterialById(idMaterial);
          if (material == null)
    {
  return new InventoryResponse
      {
         Success = false,
    Message = "Material no encontrado",
   Errors = { "Material no existe" }
        };
       }

material.status = material.status == "Activo" ? "Inactivo" : "Activo";
   material.updated_date = DateTime.Now;

 _context.Materials.Update(material);
 await _context.SaveChangesAsync();

         return new InventoryResponse
  {
   Success = true,
Message = $"Material marcado como {material.status}"
   };
     }
  catch (Exception ex)
    {
   return new InventoryResponse
    {
 Success = false,
     Message = $"Error al cambiar estado: {ex.Message}",
 Errors = { ex.Message }
      };
    }
}

   /// <summary>
        /// Obtiene informaci�n detallada de stock de todos los materiales
 /// </summary>
public async Task<IEnumerable<MaterialStockInfo>> GetMaterialsWithStockInfo()
        {
 return await _context.Materials
      .Select(m => new MaterialStockInfo
        {
     Id_Material = m.id_Materials,
     Nombre = m.name,
      Descripcion = m.description,
Unidad_Medida = m.unit_of_measure,
 Costo_Unitario = m.unit_cost,
     Stock_Actual = m.current_stock,
     Stock_Minimo = m.minimum_stock,
   Categoria = m.category,
Status = m.status,
   Requiere_Reposicion = m.minimum_stock.HasValue && m.current_stock < m.minimum_stock.Value,
   Valor_Total_Inventario = m.current_stock * (m.unit_cost ?? 0)
   })
.OrderBy(m => m.Nombre)
  .ToListAsync();
 }

     /// <summary>
      /// Obtiene materiales que requieren reposici�n (stock < stock m�nimo)
     /// </summary>
        public async Task<IEnumerable<MaterialStockInfo>> GetMaterialsRequiringRestock()
  {
 var allMaterials = await GetMaterialsWithStockInfo();
    return allMaterials.Where(m => m.Requiere_Reposicion && m.Status == "Activo");
      }

        /// <summary>
        /// Actualiza un movimiento de trazabilidad existente
        /// </summary>
        public async Task<InventoryResponse> UpdateMovement(
            int idMovement,
          decimal newStock,
            string? observations,
            string? supplier,
            int? projectId)
        {
            try
            {
                var movement = await _context.MaterialMovements
                    .FirstOrDefaultAsync(m => m.id_MaterialMovements == idMovement);

                if (movement == null)
                {
                    return new InventoryResponse
                    {
                        Success = false,
                        Message = "Movimiento no encontrado",
                        Errors = { "El movimiento no existe" }
                    };
                }

                    if (newStock < 0)
                    {
                      return new InventoryResponse
                      {
                        Success = false,
                        Message = "El stock no puede ser negativo",
                        Errors = { "Stock invalido" }
                      };
                    }

                    var newDifference = newStock - movement.old_stock;
                    var newType = newDifference > 0 ? "entrada" : newDifference < 0 ? "salida" : "ajuste";

                    if (newType == "entrada" && string.IsNullOrWhiteSpace(supplier))
                    {
                      return new InventoryResponse
                      {
                        Success = false,
                        Message = "Debes especificar el proveedor para una entrada de stock",
                        Errors = { "Proveedor requerido" }
                      };
                    }

                    if (newType == "salida" && !projectId.HasValue)
                    {
                      return new InventoryResponse
                      {
                        Success = false,
                        Message = "Debes especificar el proyecto para una salida de stock",
                        Errors = { "Proyecto requerido" }
                      };
                    }

                Project? project = null;
                if (projectId.HasValue)
                {
                    project = await _context.Projects.FirstOrDefaultAsync(p => p.id_Projects == projectId.Value);
                    if (project == null)
                    {
                        return new InventoryResponse
                        {
                            Success = false,
                            Message = "El proyecto seleccionado no existe",
                            Errors = { "Proyecto invalido" }
                        };
                    }
                }

                    var material = await _context.Materials.FirstOrDefaultAsync(m => m.id_Materials == movement.id_Materials);
                    if (material == null)
                    {
                      return new InventoryResponse
                      {
                        Success = false,
                        Message = "Material no encontrado para el movimiento",
                        Errors = { "Material no existe" }
                      };
                    }

                    var baselineStock = await GetMaterialBaselineStock(material.id_Materials, material.current_stock);

                    using var transaction = await _context.Database.BeginTransactionAsync();

                movement.observations = string.IsNullOrWhiteSpace(observations) ? "Sin observaciones" : observations.Trim();
                movement.supplier = string.IsNullOrWhiteSpace(supplier) ? null : supplier.Trim();
                movement.id_Projects = projectId;
                    movement.new_stock = newStock;
                    movement.difference = newDifference;
                    movement.movement_type = newType;

                _context.MaterialMovements.Update(movement);
                    await _context.SaveChangesAsync();
                    await RecalculateMaterialMovementTimeline(movement.id_Materials, material, baselineStock);
                    await transaction.CommitAsync();

                return new InventoryResponse
                {
                    Success = true,
                    Message = "Movimiento actualizado exitosamente"
                };
            }
            catch (Exception ex)
            {
                return new InventoryResponse
                {
                    Success = false,
                    Message = $"Error al actualizar el movimiento: {ex.Message}",
                    Errors = { ex.Message }
                };
            }
        }

              /// <summary>
              /// Elimina un movimiento de trazabilidad y recalcula el stock del material
              /// </summary>
              public async Task<InventoryResponse> DeleteMovement(int idMovement)
              {
                try
                {
                  var movement = await _context.MaterialMovements
                    .FirstOrDefaultAsync(m => m.id_MaterialMovements == idMovement);

                  if (movement == null)
                  {
                    return new InventoryResponse
                    {
                      Success = false,
                      Message = "Movimiento no encontrado",
                      Errors = { "El movimiento no existe" }
                    };
                  }

                  var material = await _context.Materials.FirstOrDefaultAsync(m => m.id_Materials == movement.id_Materials);
                  if (material == null)
                  {
                    return new InventoryResponse
                    {
                      Success = false,
                      Message = "Material no encontrado para el movimiento",
                      Errors = { "Material no existe" }
                    };
                  }

                  var baselineStock = await GetMaterialBaselineStock(material.id_Materials, material.current_stock);

                  using var transaction = await _context.Database.BeginTransactionAsync();

                  _context.MaterialMovements.Remove(movement);
                  await _context.SaveChangesAsync();
                  await RecalculateMaterialMovementTimeline(material.id_Materials, material, baselineStock);

                  await transaction.CommitAsync();

                  return new InventoryResponse
                  {
                    Success = true,
                    Message = "Movimiento eliminado exitosamente"
                  };
                }
                catch (Exception ex)
                {
                  return new InventoryResponse
                  {
                    Success = false,
                    Message = $"Error al eliminar el movimiento: {ex.Message}",
                    Errors = { ex.Message }
                  };
                }
              }

              private async Task<decimal> GetMaterialBaselineStock(int idMaterial, decimal currentStock)
              {
                var totalDifference = await _context.MaterialMovements
                  .Where(m => m.id_Materials == idMaterial)
                  .SumAsync(m => (decimal?)m.difference) ?? 0m;

                return currentStock - totalDifference;
              }

              private async Task RecalculateMaterialMovementTimeline(int idMaterial, Material material, decimal baselineStock)
              {
                var orderedMovements = await _context.MaterialMovements
                  .Where(m => m.id_Materials == idMaterial)
                  .OrderBy(m => m.created_date)
                  .ThenBy(m => m.id_MaterialMovements)
                  .ToListAsync();

                decimal runningStock = baselineStock;

                foreach (var timelineMovement in orderedMovements)
                {
                  timelineMovement.old_stock = runningStock;
                  timelineMovement.new_stock = runningStock + timelineMovement.difference;

                  if (timelineMovement.new_stock < 0)
                  {
                    throw new InvalidOperationException("La operación deja el stock en negativo. Verifica los movimientos posteriores.");
                  }

                  timelineMovement.movement_type = timelineMovement.difference > 0
                    ? "entrada"
                    : timelineMovement.difference < 0
                      ? "salida"
                      : "ajuste";

                  runningStock = timelineMovement.new_stock;
                }

                material.current_stock = runningStock;
                material.updated_date = DateTime.Now;

                _context.MaterialMovements.UpdateRange(orderedMovements);
                _context.Materials.Update(material);
                await _context.SaveChangesAsync();
              }
    }
}
