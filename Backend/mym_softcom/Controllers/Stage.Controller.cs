using API_PESO_PIG.Functions;
using API_PESO_PIG.Models;
using API_PESO_PIG.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API_PESO_PIG.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[Controller]")]
    public class StageController : Controller
    {
        public IConfiguration _Configuration;
        public readonly StageServices _Services;
        public UserFunction GeneralFunction;

        public StageController(IConfiguration configuration, StageServices stageServices)
        {
            _Configuration = configuration;
            _Services = stageServices;
            GeneralFunction = new UserFunction(configuration);
        }

        // Crear Etapa
        [HttpPost("CreateStage")]
        public IActionResult Add(Stage entity)
        {
            try
            {
                _Services.Add(entity);
                return Ok(new { message = "Etapa creado con éxito." });

            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        // Consultar todas las Etapas
        [HttpGet("ConsultAllStages")]
        public ActionResult<IEnumerable<Stage>> GetStages()
        {
            try
            {
                return Ok(_Services.GetStages());
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        // Consultar Etapa por ID
        [HttpGet("GetStageId")]
        public async Task<IActionResult> GetStageId(int id_Stage)
        {
            try
            {
                var stage = await _Services.GetStageId(id_Stage);

                if (stage == null)
                {
                    return NotFound("Etapa no existe en la BD.");
                }

                return Ok(stage);
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        // Consultar rango de Etapas
        [HttpPost("ConsultRange")]
        public ActionResult<IEnumerable<Stage>> GetStagesRange(int start, int end)
        {
            try
            {
                var range = _Services.GetStages().Skip(start - 1).Take(end - start + 1).ToList();

                if (!range.Any())
                {
                    return NotFound("No se encontraron pesajes en el rango.");
                }

                return Ok(range);
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        // Eliminar Etapa por ID
        [HttpDelete("DeleteStage")]
        public async Task<IActionResult> DelStage(int id_Stage)
        {
            try
            {
                var result = await _Services.DelStage(id_Stage);
                if (result)
                {
                    return Ok("Etapa eliminada correctamente.");
                }
                return NotFound("La etapa no fue encontrada.");
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        // Actualizar Etapa
        [HttpPut("UpdateStage")]
        public async Task<IActionResult> UpdateStage(Stage updatedStage)
        {
            if (updatedStage == null)
            {
                return BadRequest("La etapa no es válida.");
            }

            try
            {
                var result = await _Services.UpdateStage(updatedStage.id_Stage, updatedStage);

                if (!result)
                {
                    return NotFound("Etapa no existe en la BD.");
                }

                return Ok("Etapa actualizada correctamente.");
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }
    }
}