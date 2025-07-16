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
    public class RaceController : Controller
    {
        public IConfiguration _Configuration;
        public readonly RaceServices _Services;
        public UserFunction GeneralFunction;

        public RaceController(IConfiguration configuration, RaceServices raceServices)
        {
            _Configuration = configuration;
            _Services = raceServices;
            GeneralFunction = new UserFunction(configuration);
        }

        // Crear Raza
        [HttpPost("CreateRace")]
        public IActionResult Add(Race entity)
        {
            try
            {
                _Services.Add(entity);
                return Ok(new { message = "Raza creado con éxito." });

            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        // Consultar todas las Razas
        [HttpGet("ConsultAllRaces")]
        public ActionResult<IEnumerable<Race>> GetRaces()
        {
            try
            {
                return Ok(_Services.GetRaces());
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        // Consultar Raza por ID
        [HttpGet("GetRaceId")]
        public async Task<IActionResult> GetRaceId(int id_Race)
        {
            try
            {
                var race = await _Services.GetRaceId(id_Race);

                if (race == null)
                {
                    return NotFound("Raza no existe en la BD.");
                }

                return Ok(race);
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        // Consultar rango de Razas
        [HttpPost("ConsultRange")]
        public ActionResult<IEnumerable<Race>> GetRacesRange(int start, int end)
        {
            try
            {
                var range = _Services.GetRaces().Skip(start - 1).Take(end - start + 1).ToList();

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

        // Eliminar Raza por ID
        [HttpDelete("DeleteRace")]
        public async Task<IActionResult> DelRace(int id_Race)
        {
            try
            {
                var result = await _Services.DelRace(id_Race);
                if (result)
                {
                    return Ok("Raza eliminada correctamente.");
                }
                return NotFound("La raza no fue encontrada.");
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        // Actualizar Raza
        [HttpPut("UpdateRace")]
        public async Task<IActionResult> UpdateRace(Race updatedRace)
        {
            if (updatedRace == null)
            {
                return BadRequest("La raza no es válida.");
            }

            try
            {
                var result = await _Services.UpdateRace(updatedRace.id_Race, updatedRace);

                if (!result)
                {
                    return NotFound("Raza no existe en la BD.");
                }

                return Ok("Raza actualizada correctamente.");
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, "Ocurrió un error inesperado.");
            }
        }
    }
}