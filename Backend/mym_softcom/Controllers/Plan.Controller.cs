using Microsoft.AspNetCore.Mvc;
using mym_softcom.Models;
using mym_softcom.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

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

        // GET: api/Plan
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Plan>>> GetPlans()
        {
            var plans = await _planServices.GetPlans();
            return Ok(plans);
        }

        // GET: api/Plan/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Plan>> GetPlan(int id)
        {
            var plan = await _planServices.GetPlanById(id);
            if (plan == null)
            {
                return NotFound();
            }
            return Ok(plan);
        }

        // POST: api/Plan
        [HttpPost]
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
                    return CreatedAtAction(nameof(GetPlan), new { id = plan.Id_Plans }, plan);
                }
                return StatusCode(500, "Error al crear el plan.");
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

        // PUT: api/Plan/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePlan(int id, Plan plan)
        {
            if (id != plan.Id_Plans)
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
                    return NoContent();
                }
                return NotFound("Plan no encontrado o error al actualizar.");
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

        // DELETE: api/Plan/{id}
        [HttpDelete("{id}")]
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

        // GET: api/Plan/search?term={searchTerm}
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<Plan>>> SearchPlans([FromQuery] string searchTerm)
        {
            var plans = await _planServices.SearchPlans(searchTerm);
            return Ok(plans);
        }

        // GET: api/Plan/select
        [HttpGet("select")]
        public async Task<ActionResult<IEnumerable<object>>> GetPlansForSelect()
        {
            var plans = await _planServices.GetPlansForSelect();
            return Ok(plans);
        }
    }
}