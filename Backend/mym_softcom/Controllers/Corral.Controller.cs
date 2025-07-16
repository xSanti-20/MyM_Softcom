using API_PESO_PIG.Models;
using API_PESO_PIG.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API_PESO_PIG.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class CorralController : ControllerBase
    {
        private readonly CorralServices _corralServices;

        public CorralController(CorralServices corralServices)
        {
            _corralServices = corralServices;
        }

        [Authorize]
        [HttpGet("ConsultAllCorrals")]
        public ActionResult<IEnumerable<object>> GetCorrals()
        {
            try
            {
                var corrals = _corralServices.GetCorralsWithWeightInfo();
                return Ok(corrals);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error interno del servidor", error = ex.Message });
            }
        }

        [Authorize]
        [HttpGet("ConsultCorralById/{id}")]
        public async Task<ActionResult<object>> GetCorralById(int id)
        {
            try
            {
                var corral = await _corralServices.GetCorralWithWeightInfoById(id);
                if (corral == null)
                {
                    return NotFound(new { message = "Corral no encontrado" });
                }
                return Ok(corral);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error interno del servidor", error = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("CreateCorral")]
        public ActionResult CreateCorral([FromBody] Corral corral)
        {
            try
            {
                _corralServices.Add(corral);
                return Ok(new { message = "Corral creado exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al crear el corral", error = ex.Message });
            }
        }

        [Authorize]
        [HttpPut("UpdateCorral")]
        public async Task<ActionResult> UpdateCorral([FromBody] Corral corral)
        {
            try
            {
                var result = await _corralServices.UpdateCorral(corral.id_Corral, corral);
                if (result)
                {
                    return Ok(new { message = "Corral actualizado exitosamente" });
                }
                return NotFound(new { message = "Corral no encontrado" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al actualizar el corral", error = ex.Message });
            }
        }

        [Authorize]
        [HttpDelete("DeleteCorral")]
        public async Task<ActionResult> DeleteCorral(int id_Corral)
        {
            try
            {
                var result = await _corralServices.DelCorral(id_Corral);
                if (result)
                {
                    return Ok(new { message = "Corral eliminado exitosamente" });
                }
                return NotFound(new { message = "Corral no encontrado" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al eliminar el corral", error = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("UpdateAverageWeight/{corralId}")]
        public async Task<ActionResult> UpdateAverageWeight(int corralId)
        {
            try
            {
                await _corralServices.UpdateCorralAverageWeight(corralId);
                return Ok(new { message = "Peso promedio actualizado exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al actualizar peso promedio", error = ex.Message });
            }
        }
    }
}
