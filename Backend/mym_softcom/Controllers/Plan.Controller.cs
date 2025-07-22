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
    public class PlanController : ControllerBase
    {
        private readonly PlanServices _planServices;

        public PlanController(PlanServices planServices)
        {
            _planServices = planServices;
        }

        /// <summary>
        /// Obtiene todos los planes disponibles en el sistema.
        /// </summary>
        /// <returns>Una lista de objetos Plan.</returns>
        // GET: api/Plan/GetAllPlans
        [HttpGet("GetAllPlans")]
        public async Task<ActionResult<IEnumerable<Plan>>> GetAllPlans()
        {
            var plans = await _planServices.GetAllPlans();
            return Ok(plans);
        }

        /// <summary>
        /// Obtiene un plan específico por su ID.
        /// </summary>
        /// <param name="id">El ID del plan.</param>
        /// <returns>El objeto Plan si se encuentra, de lo contrario, NotFound.</returns>
        // GET: api/Plan/GetPlanID/{id}
        [HttpGet("GetPlanID/{id}")]
        public async Task<ActionResult<Plan>> GetPlanID(int id)
        {
            var plan = await _planServices.GetPlanById(id);
            if (plan == null)
            {
                return NotFound("Plan no encontrado.");
            }
            return Ok(plan);
        }

        /// <summary>
        /// Crea un nuevo plan en el sistema.
        /// </summary>
        /// <param name="plan">El objeto Plan a crear.</param>
        /// <returns>El plan creado con su ID.</returns>
        // POST: api/Plan/CreatePlan
        [HttpPost("CreatePlan")]
        public async Task<ActionResult<Plan>> CreatePlan(Plan plan)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _planServices.CreatePlan(plan);
                if (success)
                {
                    // Usar el nombre de la acción explícito para CreatedAtAction
                    return CreatedAtAction(nameof(GetPlanID), new { id = plan.id_Plans }, plan);
                }
                return StatusCode(500, "Error al crear el plan.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        /// <summary>
        /// Actualiza un plan existente por su ID.
        /// </summary>
        /// <param name="id">El ID del plan a actualizar.</param>
        /// <param name="plan">El objeto Plan con los datos actualizados.</param>
        /// <returns>NoContent si la actualización es exitosa, de lo contrario, BadRequest o NotFound.</returns>
        // PUT: api/Plan/UpdatePlan/{id}
        [HttpPut("UpdatePlan/{id}")]
        public async Task<IActionResult> UpdatePlan(int id, Plan plan)
        {
            if (id != plan.id_Plans)
            {
                return BadRequest("El ID del plan en la URL no coincide con el ID del plan en el cuerpo de la solicitud.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _planServices.UpdatePlan(id, plan);
                if (success)
                {
                    return NoContent(); // 204 No Content para una actualización exitosa sin retorno de datos
                }
                return NotFound("Plan no encontrado o error al actualizar.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        /// <summary>
        /// Elimina un plan del sistema por su ID.
        /// </summary>
        /// <param name="id">El ID del plan a eliminar.</param>
        /// <returns>NoContent si la eliminación es exitosa, de lo contrario, NotFound.</returns>
        // DELETE: api/Plan/DeletePlan/{id}
        [HttpDelete("DeletePlan/{id}")]
        public async Task<IActionResult> DeletePlan(int id)
        {
            try
            {
                var success = await _planServices.DeletePlan(id);
                if (success)
                {
                    return NoContent();
                }
                return NotFound("Plan no encontrado o no se pudo eliminar.");
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
    }
}
