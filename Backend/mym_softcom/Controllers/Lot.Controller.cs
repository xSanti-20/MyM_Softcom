using Microsoft.AspNetCore.Mvc;
using mym_softcom.Models;
using mym_softcom.Services;
using System.Collections.Generic;
using System.Threading.Tasks;
using System; // Necesario para InvalidOperationException

namespace mym_softcom.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LotController : ControllerBase
    {
        private readonly LotServices _lotServices;

        public LotController(LotServices lotServices)
        {
            _lotServices = lotServices;
        }

        // GET: api/Lot
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Lot>>> GetLots()
        {
            // CORRECCIÓN: Añadido 'await' aquí
            var lots = await _lotServices.GetLots();
            return Ok(lots);
        }

        // GET: api/Lot/available
        [HttpGet("available")]
        public async Task<ActionResult<IEnumerable<Lot>>> GetAvailableLots()
        {
            // CORRECCIÓN: Añadido 'await' aquí
            var lots = await _lotServices.GetAvailableLots();
            return Ok(lots);
        }

        // GET: api/Lot/byProject/{projectId}
        [HttpGet("byProject/{projectId}")]
        public async Task<ActionResult<IEnumerable<Lot>>> GetLotsByProject(int projectId)
        {
            // CORRECCIÓN: Añadido 'await' aquí
            var lots = await _lotServices.GetLotsByProject(projectId);
            return Ok(lots);
        }

        // GET: api/Lot/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Lot>> GetLot(int id)
        {
            var lot = await _lotServices.GetLotById(id);
            if (lot == null)
            {
                return NotFound();
            }
            return Ok(lot);
        }

        // POST: api/Lot
        [HttpPost]
        public async Task<ActionResult<Lot>> CreateLot(Lot lot)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _lotServices.CreateLot(lot);
                if (success)
                {
                    return CreatedAtAction(nameof(GetLot), new { id = lot.Id_Lots }, lot);
                }
                return StatusCode(500, "Error al crear el lote.");
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // PUT: api/Lot/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateLot(int id, Lot lot)
        {
            if (id != lot.Id_Lots)
            {
                return BadRequest("El ID del lote en la URL no coincide con el ID del lote en el cuerpo de la solicitud.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _lotServices.UpdateLot(id, lot);
                if (success)
                {
                    return NoContent();
                }
                return NotFound("Lote no encontrado o error al actualizar.");
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // PATCH: api/Lot/{id}/status
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> ChangeLotStatus(int id, [FromBody] string newStatus)
        {
            if (string.IsNullOrEmpty(newStatus))
            {
                return BadRequest("El nuevo estado no puede estar vacío.");
            }

            try
            {
                var success = await _lotServices.ChangeLotStatus(id, newStatus);
                if (success)
                {
                    return NoContent();
                }
                return NotFound("Lote no encontrado o error al cambiar el estado.");
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // DELETE: api/Lot/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLot(int id)
        {
            try
            {
                var success = await _lotServices.DeleteLot(id);
                if (success)
                {
                    return NoContent();
                }
                return NotFound("Lote no encontrado o no se pudo eliminar.");
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // GET: api/Lot/search?term={searchTerm}
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<Lot>>> SearchLots([FromQuery] string searchTerm)
        {
            var lots = await _lotServices.SearchLots(searchTerm);
            return Ok(lots);
        }

        // GET: api/Lot/select?projectId={projectId}
        [HttpGet("select")]
        public async Task<ActionResult<IEnumerable<object>>> GetLotsForSelect([FromQuery] int? projectId = null)
        {
            var lots = await _lotServices.GetLotsForSelect(projectId);
            return Ok(lots);
        }
    }
}
