using Microsoft.AspNetCore.Mvc;
using mym_softcom.Models;
using mym_softcom.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace mym_softcom.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WithdrawalController : ControllerBase
    {
        private readonly WithdrawalServices _withdrawalServices;
        private readonly ILogger<WithdrawalController> _logger;

        public WithdrawalController(WithdrawalServices withdrawalServices, ILogger<WithdrawalController> logger)
        {
            _withdrawalServices = withdrawalServices;
            _logger = logger;
        }

        // GET: api/Withdrawal/GetAllWithdrawals
        [HttpGet("GetAllWithdrawals")]
        public async Task<ActionResult<IEnumerable<Withdrawal>>> GetAllWithdrawals()
        {
            try
            {
                _logger.LogInformation("[WithdrawalController] Attempting to get all withdrawals.");
                var withdrawals = await _withdrawalServices.GetAllWithdrawals();
                _logger.LogInformation("[WithdrawalController] Successfully retrieved all withdrawals.");
                return Ok(withdrawals);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[WithdrawalController] Error getting all withdrawals.");
                return StatusCode(500, new { message = "Error interno del servidor al obtener desistimientos.", details = ex.Message });
            }
        }

        // GET: api/Withdrawal/GetWithdrawalID/5
        [HttpGet("GetWithdrawalID/{id_Withdrawals}")]
        public async Task<ActionResult<Withdrawal>> GetWithdrawalID(int id_Withdrawals)
        {
            try
            {
                _logger.LogInformation($"[WithdrawalController] Attempting to get withdrawal with ID: {id_Withdrawals}");
                var withdrawal = await _withdrawalServices.GetWithdrawalById(id_Withdrawals);

                if (withdrawal == null)
                {
                    _logger.LogWarning($"[WithdrawalController] Withdrawal with ID: {id_Withdrawals} not found.");
                    return NotFound(new { message = $"Desistimiento con ID {id_Withdrawals} no encontrado." });
                }

                _logger.LogInformation($"[WithdrawalController] Successfully retrieved withdrawal with ID: {id_Withdrawals}");
                return Ok(withdrawal);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[WithdrawalController] Error getting withdrawal with ID: {id_Withdrawals}");
                return StatusCode(500, new { message = $"Error interno del servidor al obtener desistimiento con ID {id_Withdrawals}.", details = ex.Message });
            }
        }

        // GET: api/Withdrawal/CalculatePenalty/5
        [HttpGet("CalculatePenalty/{id_Sales}")]
        public async Task<ActionResult<decimal>> CalculatePenalty(int id_Sales)
        {
            try
            {
                _logger.LogInformation($"[WithdrawalController] Attempting to calculate penalty for Sale ID: {id_Sales}");
                var penalty = await _withdrawalServices.CalculatePenalty(id_Sales);
                _logger.LogInformation($"[WithdrawalController] Successfully calculated penalty for Sale ID: {id_Sales}. Penalty: {penalty}");
                return Ok(new { penalty = penalty }); // Devolver como objeto para consistencia
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, $"[WithdrawalController] Business logic error during CalculatePenalty for Sale ID: {id_Sales}: {ex.Message}");
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[WithdrawalController] Error calculating penalty for Sale ID: {id_Sales}");
                return StatusCode(500, new { message = $"Error interno del servidor al calcular penalización: {ex.Message}", details = ex.Message });
            }
        }

        // POST: api/Withdrawal/CreateWithdrawal
        [HttpPost("CreateWithdrawal")]
        public async Task<ActionResult<Withdrawal>> CreateWithdrawal([FromBody] Withdrawal withdrawal)
        {
            _logger.LogInformation("[WithdrawalController] Attempting to create a new withdrawal.");
            _logger.LogInformation($"[WithdrawalController] Received Withdrawal data: {System.Text.Json.JsonSerializer.Serialize(withdrawal)}");

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("[WithdrawalController] Model state is invalid for CreateWithdrawal.");
                return BadRequest(ModelState);
            }

            try
            {
                // The service will calculate penalty and set id_Withdrawals
                var success = await _withdrawalServices.CreateWithdrawal(withdrawal);
                if (!success)
                {
                    _logger.LogError("[WithdrawalController] Withdrawal creation failed in service layer.");
                    return BadRequest(new { message = "No se pudo registrar el desistimiento." });
                }

                _logger.LogInformation($"[WithdrawalController] Successfully created withdrawal with ID: {withdrawal.id_Withdrawals}");
                return CreatedAtAction(nameof(GetWithdrawalID), new { id_Withdrawals = withdrawal.id_Withdrawals }, withdrawal);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, $"[WithdrawalController] Business logic error during CreateWithdrawal: {ex.Message}");
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[WithdrawalController] Error creating withdrawal.");
                return StatusCode(500, new { message = "Error interno del servidor al registrar el desistimiento.", details = ex.Message });
            }
        }

        // PUT: api/Withdrawal/UpdateWithdrawal/5
        [HttpPut("UpdateWithdrawal/{id_Withdrawals}")]
        public async Task<IActionResult> UpdateWithdrawal(int id_Withdrawals, [FromBody] Withdrawal updatedWithdrawal)
        {
            _logger.LogInformation($"[WithdrawalController] Attempting to update withdrawal with ID: {id_Withdrawals}");
            _logger.LogInformation($"[WithdrawalController] Received Withdrawal data for update: {System.Text.Json.JsonSerializer.Serialize(updatedWithdrawal)}");

            if (id_Withdrawals != updatedWithdrawal.id_Withdrawals)
            {
                _logger.LogWarning($"[WithdrawalController] Mismatch between URL ID ({id_Withdrawals}) and body ID ({updatedWithdrawal.id_Withdrawals}) for UpdateWithdrawal.");
                return BadRequest(new { message = "El ID del desistimiento en la URL no coincide con el ID del desistimiento en el cuerpo de la solicitud." });
            }

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("[WithdrawalController] Model state is invalid for UpdateWithdrawal.");
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _withdrawalServices.UpdateWithdrawal(id_Withdrawals, updatedWithdrawal);
                if (!success)
                {
                    _logger.LogWarning($"[WithdrawalController] Withdrawal with ID: {id_Withdrawals} not found or update failed in service layer.");
                    return NotFound(new { message = $"Desistimiento con ID {id_Withdrawals} no encontrado o no se pudo actualizar." });
                }

                _logger.LogInformation($"[WithdrawalController] Successfully updated withdrawal with ID: {id_Withdrawals}");
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, $"[WithdrawalController] Business logic error during UpdateWithdrawal: {ex.Message}");
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[WithdrawalController] Error updating withdrawal with ID: {id_Withdrawals}");
                return StatusCode(500, new { message = $"Error interno del servidor al actualizar el desistimiento con ID {id_Withdrawals}.", details = ex.Message });
            }
        }

        // DELETE: api/Withdrawal/DeleteWithdrawal/5
        [HttpDelete("DeleteWithdrawal/{id_Withdrawals}")]
        public async Task<IActionResult> DeleteWithdrawal(int id_Withdrawals)
        {
            _logger.LogInformation($"[WithdrawalController] Attempting to delete withdrawal with ID: {id_Withdrawals}");
            try
            {
                var success = await _withdrawalServices.DeleteWithdrawal(id_Withdrawals);
                if (!success)
                {
                    _logger.LogWarning($"[WithdrawalController] Withdrawal with ID: {id_Withdrawals} not found for deletion.");
                    return NotFound(new { message = $"Desistimiento con ID {id_Withdrawals} no encontrado." });
                }

                _logger.LogInformation($"[WithdrawalController] Successfully deleted withdrawal with ID: {id_Withdrawals}");
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, $"[WithdrawalController] Business logic error during DeleteWithdrawal: {ex.Message}");
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[WithdrawalController] Error deleting withdrawal with ID: {id_Withdrawals}");
                return StatusCode(500, new { message = $"Error interno del servidor al eliminar el desistimiento con ID {id_Withdrawals}.", details = ex.Message });
            }
        }
    }
}
