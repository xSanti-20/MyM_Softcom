using API_PESO_PIG.DTOs;
using API_PESO_PIG.Functions;
using API_PESO_PIG.Models;
using API_PESO_PIG.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API_PESO_PIG.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[Controller]")]
    public class WeighingController : Controller
    {
        public IConfiguration _Configuration;
        public readonly WeighingServices _Services;
        public UserFunction GeneralFunction;

        public WeighingController(IConfiguration configuration, WeighingServices weighingServices)
        {
            _Configuration = configuration;
            _Services = weighingServices;
            GeneralFunction = new UserFunction(configuration);
        }

        // ✅ MÉTODO CORREGIDO CON LOGGING
        [HttpPost("CreateWeighing")]
        public async Task<IActionResult> Add(Weighing entity)
        {
            try
            {
                Console.WriteLine($"DEBUG: Creando pesaje - Lechón: {entity.Id_Piglet}, Peso: {entity.Weight_Current}, Ganancia: {entity.Weight_Gain}");

                await _Services.CreateWeighingAndUpdateCorral(entity);
                return Ok(new { message = "Pesaje creado con éxito, corral actualizado y etapa verificada." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR en CreateWeighing: {ex.Message}");
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, new { message = "Error interno del servidor", error = ex.Message });
            }
        }

        [HttpGet("ConsultAllWeighings")]
        public ActionResult<IEnumerable<Weighing>> GetWeighings()
        {
            try
            {
                var weighing = _Services.GetWeighings().Select(p => new WeighingDTO
                {
                    Id_Weighing = p.id_Weighings,
                    Weight_Current = p.Weight_Current,
                    Weight_Gain = p.Weight_Gain,
                    Fec_Weight = p.Fec_Weight,
                    Name_Piglet = p.piglet.Name_Piglet,
                    Nom_Users = p.user.Nom_Users,
                }).ToList();

                return Ok(weighing);
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, new { message = "Error interno del servidor", error = ex.Message });
            }
        }

        [HttpGet("GetWeighingId")]
        public async Task<IActionResult> GetWeighingId(int id_Weighings)
        {
            try
            {
                var weighing = await _Services.GetWeighingId(id_Weighings);

                if (weighing == null)
                {
                    return NotFound("Pesaje no existe en la BD.");
                }

                return Ok(weighing);
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, new { message = "Error interno del servidor", error = ex.Message });
            }
        }

        // ✅ MÉTODO CRÍTICO CORREGIDO - ESTE ERA EL PROBLEMA PRINCIPAL
        [Authorize]
        [HttpGet("GetWeighingsByPiglet")]
        public async Task<IActionResult> GetWeighingsByPiglet(int id_Piglet)
        {
            try
            {
                Console.WriteLine($"DEBUG: Endpoint GetWeighingsByPiglet llamado con id_Piglet: {id_Piglet}");

                var weighings = await _Services.GetWeighingsByPigletId(id_Piglet);

                Console.WriteLine($"DEBUG: Encontrados {weighings?.Count() ?? 0} pesajes para lechón {id_Piglet}");

                if (weighings == null || !weighings.Any())
                {
                    Console.WriteLine($"DEBUG: No se encontraron pesajes para lechón {id_Piglet}");
                    // ✅ CAMBIO CRÍTICO: Devolver 200 con array vacío en lugar de 404
                    return Ok(new List<object>());
                }

                // ✅ DEVOLVER LOS PESAJES EN EL FORMATO CORRECTO
                var result = weighings.Select(w => new
                {
                    id_Weighings = w.id_Weighings,
                    weight_Current = w.Weight_Current,
                    weight_Gain = w.Weight_Gain,
                    fec_Weight = w.Fec_Weight,
                    id_Piglet = w.Id_Piglet,
                    id_Users = w.id_Users
                }).ToList();

                Console.WriteLine($"DEBUG: Devolviendo {result.Count} pesajes");
                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR en GetWeighingsByPiglet: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, new { message = "Error interno del servidor", error = ex.Message });
            }
        }

        [HttpPost("ConsultRange")]
        public ActionResult<IEnumerable<Weighing>> GetWeighingsRange(int start, int end)
        {
            try
            {
                var range = _Services.GetWeighings().Skip(start - 1).Take(end - start + 1).ToList();

                if (!range.Any())
                {
                    return NotFound("No se encontraron pesajes en el rango.");
                }

                return Ok(range);
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, new { message = "Error interno del servidor", error = ex.Message });
            }
        }

        [HttpDelete("DeleteWeighing")]
        public async Task<IActionResult> DelWeighing(int id_Weighings)
        {
            try
            {
                var result = await _Services.DelWeighing(id_Weighings);
                if (result)
                {
                    return Ok(new { message = "Pesaje eliminado correctamente y etapas verificadas." });
                }
                return NotFound("El pesaje no fue encontrado.");
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, new { message = "Error interno del servidor", error = ex.Message });
            }
        }

        [HttpPut("UpdateWeighing")]
        public async Task<IActionResult> UpdateWeighing(Weighing updatedWeighing)
        {
            if (updatedWeighing == null)
            {
                return BadRequest("El pesaje no es válido.");
            }

            try
            {
                Console.WriteLine($"DEBUG: Actualizando pesaje - ID: {updatedWeighing.id_Weighings}, Peso: {updatedWeighing.Weight_Current}, Ganancia: {updatedWeighing.Weight_Gain}");

                var result = await _Services.UpdateWeighing(updatedWeighing.id_Weighings, updatedWeighing);

                if (!result)
                {
                    return NotFound("Pesaje no existe en la BD.");
                }

                return Ok(new { message = "Pesaje actualizado correctamente y etapa verificada." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR en UpdateWeighing: {ex.Message}");
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, new { message = "Error interno del servidor", error = ex.Message });
            }
        }

        [HttpPost("RecalculatePigletWeight")]
        public async Task<IActionResult> RecalculatePigletWeight(int id_Piglet, float newInitialWeight)
        {
            try
            {
                await _Services.RecalculatePigletAccumulatedWeight(id_Piglet, newInitialWeight);
                return Ok(new { message = "Peso del cerdo recalculado correctamente." });
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, new { message = "Error interno del servidor", error = ex.Message });
            }
        }
    }
}
