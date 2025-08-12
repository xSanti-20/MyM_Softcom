using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using mym_softcom.Models;
using mym_softcom.Services;

namespace mym_softcom.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CesionController : ControllerBase
    {
        private readonly CesionServices _cesionServices;

        public CesionController(CesionServices cesionServices)
        {
            _cesionServices = cesionServices;
        }

        /// <summary>
        /// Procesa una cesión completa de lote
        /// </summary>
        [HttpPost("CreateCesion")]
        public async Task<ActionResult<CesionResponse>> ProcesarCesion([FromBody] CesionRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new CesionResponse
                    {
                        Success = false,
                        Message = "Datos de entrada inválidos",
                        Errors = ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)).ToList()
                    });
                }

                var resultado = await _cesionServices.ProcesarCesion(request);

                if (resultado.Success)
                {
                    return Ok(resultado);
                }
                else
                {
                    return BadRequest(resultado);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new CesionResponse
                {
                    Success = false,
                    Message = "Error interno del servidor",
                    Errors = { ex.Message }
                });
            }
        }

        /// <summary>
        /// Obtiene todas las cesiones registradas
        /// </summary>
        [HttpGet("GetAll")]
        public async Task<ActionResult<IEnumerable<CesionInfo>>> GetCesiones()
        {
            try
            {
                var cesiones = await _cesionServices.GetCesionesDetalladas();
                return Ok(cesiones);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al obtener las cesiones", error = ex.Message });
            }
        }

        /// <summary>
        /// Busca un cliente por documento para validación
        /// </summary>
        [HttpGet("GetClientByDocument/{documento}")]
        public async Task<ActionResult> BuscarClientePorDocumento(int documento)
        {
            try
            {
                var cliente = await _cesionServices.BuscarClientePorDocumento(documento);

                if (cliente == null)
                {
                    return NotFound(new { message = "Cliente no encontrado" });
                }

                return Ok(cliente);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al buscar cliente", error = ex.Message });
            }
        }

    }
}
