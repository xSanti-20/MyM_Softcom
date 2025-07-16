using API_PESO_PIG.Models;
using API_PESO_PIG.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API_PESO_PIG.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class FeedingController : ControllerBase
    {
        private readonly FeedingServices _feedingServices;
        private readonly ILogger<FeedingController> _logger;

        public FeedingController(FeedingServices feedingServices, ILogger<FeedingController> logger)
        {
            _feedingServices = feedingServices;
            _logger = logger;
        }

        [Authorize]
        [HttpGet("ConsultAllFeedings")]
        public ActionResult<IEnumerable<object>> GetFeedings()
        {
            try
            {
                var feedings = _feedingServices.GetFeedings();
                return Ok(feedings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener alimentaciones");
                return StatusCode(500, new { message = "Error interno del servidor", error = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("CreateFeeding")]
        public async Task<ActionResult> CreateFeeding([FromBody] Feeding feeding)
        {
            try
            {
                _logger.LogInformation("=== INICIO CreateFeeding ===");
                _logger.LogInformation("Datos recibidos: {@Feeding}", feeding);

                // Validación de datos nulos
                if (feeding == null)
                {
                    _logger.LogWarning("Feeding object is null");
                    return BadRequest(new { message = "Los datos de alimentación son requeridos." });
                }

                // Log de cada campo recibido
                _logger.LogInformation("Can_Food: {CanFood}", feeding.Can_Food);
                _logger.LogInformation("Sum_Food: {SumFood}", feeding.Sum_Food);
                _logger.LogInformation("Obc_Feeding: {ObcFeeding}", feeding.Obc_Feeding);
                _logger.LogInformation("id_Users: {UserId}", feeding.id_Users);
                _logger.LogInformation("id_Corral: {CorralId}", feeding.id_Corral);
                _logger.LogInformation("id_Food: {FoodId}", feeding.id_Food);
                _logger.LogInformation("Dat_Feeding: {DateFeeding}", feeding.Dat_Feeding);

                // Validaciones básicas
                if (feeding.Can_Food <= 0)
                {
                    _logger.LogWarning("Can_Food is invalid: {CanFood}", feeding.Can_Food);
                    return BadRequest(new { message = "La ración por animal debe ser mayor a 0." });
                }

                if (string.IsNullOrWhiteSpace(feeding.Obc_Feeding))
                {
                    _logger.LogWarning("Obc_Feeding is empty");
                    return BadRequest(new { message = "La observación es requerida." });
                }

                if (feeding.id_Users <= 0)
                {
                    _logger.LogWarning("id_Users is invalid: {UserId}", feeding.id_Users);
                    return BadRequest(new { message = "Debe seleccionar un usuario válido." });
                }

                if (feeding.id_Corral <= 0)
                {
                    _logger.LogWarning("id_Corral is invalid: {CorralId}", feeding.id_Corral);
                    return BadRequest(new { message = "Debe seleccionar un corral válido." });
                }

                if (feeding.id_Food <= 0)
                {
                    _logger.LogWarning("id_Food is invalid: {FoodId}", feeding.id_Food);
                    return BadRequest(new { message = "Debe seleccionar un alimento válido." });
                }

                if (feeding.Dat_Feeding == default(DateTime))
                {
                    _logger.LogWarning("Dat_Feeding is invalid: {Date}", feeding.Dat_Feeding);
                    return BadRequest(new { message = "La fecha de alimentación es requerida." });
                }

                _logger.LogInformation("Validaciones básicas pasadas, obteniendo número de animales...");

                // Obtener número de animales para calcular Sum_Food
                var numberOfAnimals = await _feedingServices.GetNumberOfAnimalsInCorral(feeding.id_Corral);
                _logger.LogInformation("Número de animales en corral {CorralId}: {NumberOfAnimals}", feeding.id_Corral, numberOfAnimals);

                if (numberOfAnimals <= 0)
                {
                    _logger.LogWarning("No hay animales en el corral {CorralId}", feeding.id_Corral);
                    return BadRequest(new { message = "El corral seleccionado no tiene animales asignados." });
                }

                // Calcular Sum_Food
                feeding.Sum_Food = feeding.Can_Food * numberOfAnimals;
                _logger.LogInformation("Sum_Food calculado: {CanFood} * {NumberOfAnimals} = {SumFood}",
                    feeding.Can_Food, numberOfAnimals, feeding.Sum_Food);

                // Validar ModelState
                if (!ModelState.IsValid)
                {
                    var errors = ModelState
                        .Where(x => x.Value.Errors.Count > 0)
                        .Select(x => new { Field = x.Key, Errors = x.Value.Errors.Select(e => e.ErrorMessage) })
                        .ToList();

                    _logger.LogWarning("Model validation failed: {@Errors}", errors);
                    return BadRequest(new { message = "Datos inválidos", errors = errors });
                }

                _logger.LogInformation("Todas las validaciones pasaron, llamando al servicio...");

                var result = await _feedingServices.Add(feeding);

                if (result)
                {
                    _logger.LogInformation("=== Feeding creado exitosamente ===");
                    return Ok(new { message = "Alimentación registrada exitosamente. El total de alimento se calculó automáticamente." });
                }
                else
                {
                    _logger.LogWarning("El servicio retornó false");
                    return BadRequest(new { message = "No se pudo registrar la alimentación." });
                }
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid operation in CreateFeeding");
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inesperado en CreateFeeding");
                return StatusCode(500, new
                {
                    message = "Error interno del servidor",
                    error = ex.Message,
                    innerException = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        [Authorize]
        [HttpPut("UpdateFeeding")]
        public async Task<ActionResult> UpdateFeeding([FromBody] Feeding feeding)
        {
            try
            {
                if (feeding == null || feeding.id_Feeding <= 0)
                {
                    return BadRequest(new { message = "Datos de alimentación inválidos." });
                }

                var result = await _feedingServices.UpdateFeeding(feeding.id_Feeding, feeding);

                if (result)
                {
                    return Ok(new { message = "Alimentación actualizada exitosamente." });
                }
                else
                {
                    return NotFound(new { message = "Alimentación no encontrada." });
                }
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid operation in UpdateFeeding");
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in UpdateFeeding");
                return StatusCode(500, new { message = "Error interno del servidor", error = ex.Message });
            }
        }

        [Authorize]
        [HttpDelete("DeleteFeeding")]
        public async Task<ActionResult> DeleteFeeding(int id_Feeding)
        {
            try
            {
                var result = await _feedingServices.DelFeeding(id_Feeding);

                if (result)
                {
                    return Ok(new { message = "Alimentación eliminada exitosamente. El inventario ha sido restaurado." });
                }
                else
                {
                    return NotFound(new { message = "Alimentación no encontrada." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in DeleteFeeding");
                return StatusCode(500, new { message = "Error interno del servidor", error = ex.Message });
            }
        }
    }
}
