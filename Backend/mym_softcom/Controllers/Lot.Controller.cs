using Microsoft.AspNetCore.Mvc;
using mym_softcom.Models;
using mym_softcom.Services;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

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

        [HttpGet("GetAllLot")]
        public async Task<ActionResult<IEnumerable<Lot>>> GetLots()
        {
            var lots = await _lotServices.GetLots();
            return Ok(lots);
        }

        [HttpGet("GetAvailableLots")]
        public async Task<ActionResult<IEnumerable<Lot>>> GetAvailableLots()
        {
            var lots = await _lotServices.GetAvailableLots();
            return Ok(lots);
        }

        [HttpGet("GetLotsByProject/{projectId}")]
        public async Task<ActionResult<IEnumerable<Lot>>> GetLotsByProject(int projectId)
        {
            var lots = await _lotServices.GetLotsByProject(projectId);
            return Ok(lots);
        }

        [HttpGet("GetLotById/{id}")]
        public async Task<ActionResult<Lot>> GetLot(int id)
        {
            var lot = await _lotServices.GetLotById(id);
            if (lot == null)
            {
                return NotFound("Lote no encontrado.");
            }
            return Ok(lot);
        }

        [HttpPost("CreateLot")]
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
                    // Usar el nombre de la acción explícito para CreatedAtAction
                    return CreatedAtAction(nameof(GetLot), new { id = lot.id_Lots }, lot);
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

        [HttpPut("UpdateLot/{id}")]
        public async Task<IActionResult> UpdateLot(int id, Lot lot)
        {
            if (id != lot.id_Lots)
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

        [HttpPatch("ChangeLotStatus/{id}")]
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

        [HttpDelete("DeleteLot/{id}")]
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

  
        [HttpGet("SearchLots")]
        public async Task<ActionResult<IEnumerable<Lot>>> SearchLots([FromQuery] string searchTerm)
        {
            var lots = await _lotServices.SearchLots(searchTerm);
            return Ok(lots);
        }

        [HttpGet("GetLotsForSelect")]
        public async Task<ActionResult<IEnumerable<object>>> GetLotsForSelect([FromQuery] int? projectId = null)
        {
            var lots = await _lotServices.GetLotsForSelect(projectId);
            return Ok(lots);
        }

        [HttpGet("GetLotStatsByProject/{projectId}")]
        public async Task<ActionResult<object>> GetLotStatsByProject(int projectId)
        {
            var stats = await _lotServices.GetLotStatsByProject(projectId);
            return Ok(stats);
        }

        [HttpGet("GetAllLotStats")]
        public async Task<ActionResult<IEnumerable<object>>> GetAllLotStats()
        {
            var stats = await _lotServices.GetAllLotStats();
            return Ok(stats);
        }

    }
}
