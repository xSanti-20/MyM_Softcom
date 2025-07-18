using Microsoft.AspNetCore.Mvc;
using mym_softcom.Models;
using mym_softcom.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace mym_softcom.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WithdrawalController : ControllerBase
    {
        private readonly WithdrawalServices _withdrawalServices;

        public WithdrawalController(WithdrawalServices withdrawalServices)
        {
            _withdrawalServices = withdrawalServices;
        }

        // GET: api/Withdrawal
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Withdrawal>>> GetWithdrawals()
        {
            var withdrawals = await _withdrawalServices.GetWithdrawals();
            return Ok(withdrawals);
        }

        // GET: api/Withdrawal/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Withdrawal>> GetWithdrawal(int id)
        {
            var withdrawal = await _withdrawalServices.GetWithdrawalById(id);
            if (withdrawal == null)
            {
                return NotFound();
            }
            return Ok(withdrawal);
        }

        // POST: api/Withdrawal
        [HttpPost]
        public async Task<ActionResult<Withdrawal>> CreateWithdrawal(Withdrawal withdrawal)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _withdrawalServices.CreateWithdrawal(withdrawal);
                if (success)
                {
                    return CreatedAtAction(nameof(GetWithdrawal), new { id = withdrawal.Id_Withdrawals }, withdrawal);
                }
                return StatusCode(500, "Error al crear el desistimiento.");
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

        // PUT: api/Withdrawal/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateWithdrawal(int id, Withdrawal withdrawal)
        {
            if (id != withdrawal.Id_Withdrawals)
            {
                return BadRequest("El ID del desistimiento en la URL no coincide con el ID del desistimiento en el cuerpo de la solicitud.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _withdrawalServices.UpdateWithdrawal(id, withdrawal);
                if (success)
                {
                    return NoContent();
                }
                return NotFound("Desistimiento no encontrado o error al actualizar.");
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

        // DELETE: api/Withdrawal/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteWithdrawal(int id)
        {
            try
            {
                var success = await _withdrawalServices.DeleteWithdrawal(id);
                if (success)
                {
                    return NoContent();
                }
                return NotFound("Desistimiento no encontrado o no se pudo eliminar.");
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

        // GET: api/Withdrawal/search?term={searchTerm}
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<Withdrawal>>> SearchWithdrawals([FromQuery] string searchTerm)
        {
            var withdrawals = await _withdrawalServices.SearchWithdrawals(searchTerm);
            return Ok(withdrawals);
        }
    }
}