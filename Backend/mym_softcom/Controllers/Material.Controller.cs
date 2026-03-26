using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using mym_softcom.Models;
using mym_softcom.Services;

namespace mym_softcom.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MaterialController : ControllerBase
    {
        private readonly MaterialServices _materialServices;

   public MaterialController(MaterialServices materialServices)
        {
   _materialServices = materialServices;
        }

  /// <summary>
        /// Obtiene todos los materiales
  /// GET: api/Material/GetAll
        /// </summary>
  [HttpGet("GetAll")]
        public async Task<ActionResult<IEnumerable<Material>>> GetAllMaterials()
        {
  try
      {
     var materials = await _materialServices.GetAllMaterials();
       return Ok(materials);
       }
  catch (Exception ex)
  {
       return StatusCode(500, new { message = "Error al obtener los materiales", error = ex.Message });
     }
  }

  /// <summary>
        /// Obtiene todos los materiales activos
     /// GET: api/Material/GetActive
        /// </summary>
  [HttpGet("GetActive")]
public async Task<ActionResult<IEnumerable<Material>>> GetActiveMaterials()
{
        try
      {
    var materials = await _materialServices.GetActiveMaterials();
   return Ok(materials);
  }
    catch (Exception ex)
      {
      return StatusCode(500, new { message = "Error al obtener los materiales activos", error = ex.Message });
 }
 }

        /// <summary>
     /// Obtiene un material por ID
        /// GET: api/Material/GetById/5
  /// </summary>
  [HttpGet("GetById/{id}")]
 public async Task<ActionResult<Material>> GetMaterialById(int id)
        {
       try
 {
        var material = await _materialServices.GetMaterialById(id);
   if (material == null)
  {
   return NotFound(new { message = "Material no encontrado" });
     }
   return Ok(material);
 }
 catch (Exception ex)
 {
     return StatusCode(500, new { message = "Error al obtener el material", error = ex.Message });
     }
  }

  /// <summary>
   /// Crea un nuevo material
  /// POST: api/Material/Create
        /// </summary>
  [HttpPost("Create")]
  public async Task<ActionResult<MaterialResponse>> CreateMaterial([FromBody] MaterialRequest request)
{
try
    {
   if (!ModelState.IsValid)
    {
  return BadRequest(new MaterialResponse
    {
       Success = false,
 Message = "Datos de entrada inv�lidos",
   Errors = ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)).ToList()
 });
    }

     var result = await _materialServices.CreateMaterial(request);

  if (result.Success)
    {
    return Ok(result);
  }
 else
      {
    return BadRequest(result);
    }
      }
   catch (Exception ex)
            {
 return StatusCode(500, new MaterialResponse
 {
  Success = false,
 Message = "Error interno del servidor",
    Errors = { ex.Message }
    });
   }
        }

        /// <summary>
    /// Actualiza un material existente
        /// PUT: api/Material/Update/5
        /// </summary>
   [HttpPut("Update/{id}")]
  public async Task<ActionResult<MaterialResponse>> UpdateMaterial(int id, [FromBody] MaterialRequest request)
        {
   try
 {
          if (!ModelState.IsValid)
{
 return BadRequest(new MaterialResponse
     {
      Success = false,
  Message = "Datos de entrada inv�lidos",
Errors = ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)).ToList()
    });
   }

   var result = await _materialServices.UpdateMaterial(id, request);

       if (result.Success)
 {
        return Ok(result);
     }
      else
 {
  return result.Errors.Contains("Material no existe") ? NotFound(result) : BadRequest(result);
      }
  }
catch (Exception ex)
{
return StatusCode(500, new MaterialResponse
  {
  Success = false,
  Message = "Error interno del servidor",
  Errors = { ex.Message }
});
            }
  }

 /// <summary>
 /// Actualiza el stock de un material
        /// PUT: api/Material/UpdateStock/5
  /// </summary>
  [HttpPut("UpdateStock/{id}")]
  public async Task<ActionResult<MaterialResponse>> UpdateStock(int id, [FromBody] UpdateStockRequest request)
        {
   try
   {
if (id != request.IdMaterial)
  {
   return BadRequest(new MaterialResponse
      {
       Success = false,
       Message = "El ID del material no coincide",
      Errors = { "ID inv�lido" }
    });
  }

      var currentUser = User?.Identity?.Name
                ?? User?.Claims?.FirstOrDefault(c => c.Type == "email")?.Value
                ?? User?.Claims?.FirstOrDefault(c => c.Type == "name")?.Value;

      var result = await _materialServices.UpdateStock(
        request.IdMaterial,
        request.NewStock,
        request.Observations,
        request.Supplier,
        request.ProjectId,
        currentUser
      );

  if (result.Success)
   {
  return Ok(result);
 }
      else
 {
   return result.Errors.Contains("Material no existe") ? NotFound(result) : BadRequest(result);
   }
            }
catch (Exception ex)
   {
return StatusCode(500, new MaterialResponse
   {
   Success = false,
 Message = "Error interno del servidor",
   Errors = { ex.Message }
    });
   }
   }

 /// <summary>
 /// Obtiene la trazabilidad de movimientos de un material
 /// GET: api/Material/GetMovementHistory/5?limit=200
 /// </summary>
 [HttpGet("GetMovementHistory/{id}")]
 public async Task<ActionResult<IEnumerable<MaterialMovementHistoryItem>>> GetMovementHistory(int id, [FromQuery] int limit = 200)
 {
      try
 {
    var material = await _materialServices.GetMaterialById(id);
    if (material == null)
    {
      return NotFound(new { message = "Material no encontrado" });
    }

    var movements = await _materialServices.GetMovementHistory(id, limit);
    return Ok(movements);
 }
  catch (Exception ex)
   {
     return StatusCode(500, new { message = "Error al obtener historial de movimientos", error = ex.Message });
    }
  }

 /// <summary>
 /// Edita un movimiento de trazabilidad
 /// PUT: api/Material/UpdateMovement
 /// </summary>
 [HttpPut("UpdateMovement")]
 public async Task<ActionResult<InventoryResponse>> UpdateMovement([FromBody] UpdateMovementRequest request)
 {
      try
 {
    if (!ModelState.IsValid)
    {
      return BadRequest(new InventoryResponse
      {
        Success = false,
        Message = "Datos de entrada inválidos",
        Errors = ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)).ToList()
      });
    }

    var result = await _materialServices.UpdateMovement(
      request.IdMovement,
      request.NewStock,
      request.Observations,
      request.Supplier,
      request.ProjectId
    );

    if (result.Success)
    {
      return Ok(result);
    }
    else
    {
      return BadRequest(result);
    }
 }
  catch (Exception ex)
   {
     return StatusCode(500, new InventoryResponse
     {
       Success = false,
       Message = "Error interno del servidor",
       Errors = { ex.Message }
     });
    }
  }

 /// <summary>
 /// Elimina un movimiento de trazabilidad y recalcula stock
 /// DELETE: api/Material/DeleteMovement/10
 /// </summary>
 [HttpDelete("DeleteMovement/{id}")]
 public async Task<ActionResult<InventoryResponse>> DeleteMovement(int id)
 {
      try
 {
    var result = await _materialServices.DeleteMovement(id);

    if (result.Success)
    {
      return Ok(result);
    }
    else
    {
      return BadRequest(result);
    }
 }
  catch (Exception ex)
   {
     return StatusCode(500, new InventoryResponse
     {
       Success = false,
       Message = "Error interno del servidor",
       Errors = { ex.Message }
     });
    }
  }

/// <summary>
/// Cambia el estado de un material (Activo/Inactivo)
   /// PATCH: api/Material/ToggleStatus/5
        /// </summary>
     [HttpPatch("ToggleStatus/{id}")]
   public async Task<ActionResult<InventoryResponse>> ToggleMaterialStatus(int id)
   {
   try
 {
    var result = await _materialServices.ToggleMaterialStatus(id);

      if (result.Success)
  {
   return Ok(result);
 }
 else
 {
return result.Errors.Contains("Material no existe") ? NotFound(result) : BadRequest(result);
     }
 }
        catch (Exception ex)
  {
    return StatusCode(500, new InventoryResponse
    {
 Success = false,
Message = "Error interno del servidor",
    Errors = { ex.Message }
   });
      }
   }

/// <summary>
 /// Obtiene informaci�n detallada de stock de todos los materiales
  /// GET: api/Material/GetStockInfo
 /// </summary>
 [HttpGet("GetStockInfo")]
 public async Task<ActionResult<IEnumerable<MaterialStockInfo>>> GetMaterialsWithStockInfo()
{
      try
 {
       var stockInfo = await _materialServices.GetMaterialsWithStockInfo();
    return Ok(stockInfo);
 }
  catch (Exception ex)
   {
     return StatusCode(500, new { message = "Error al obtener informaci�n de stock", error = ex.Message });
    }
  }

  /// <summary>
   /// Obtiene materiales que requieren reposici�n
   /// GET: api/Material/GetRequiringRestock
  /// </summary>
 [HttpGet("GetRequiringRestock")]
   public async Task<ActionResult<IEnumerable<MaterialStockInfo>>> GetMaterialsRequiringRestock()
  {
       try
      {
    var materials = await _materialServices.GetMaterialsRequiringRestock();
  return Ok(materials);
   }
   catch (Exception ex)
   {
       return StatusCode(500, new { message = "Error al obtener materiales para reposici�n", error = ex.Message });
     }
   }
    }
}
