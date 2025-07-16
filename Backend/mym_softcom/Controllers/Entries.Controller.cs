using API_PESO_PIG.Functions;
using Microsoft.AspNetCore.Mvc;
using API_PESO_PIG.Models;
using API_PESO_PIG.Services;
using Microsoft.AspNetCore.Authorization;
using API_PESO_PIG.DTOs;

namespace API_PESO_PIG.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[Controller]")]
    public class EntriesController : Controller
    {
        public IConfiguration _Configuration;
        public readonly EntriesServices _Services;
        public UserFunction GeneralFunction;

        public EntriesController(IConfiguration configuration, EntriesServices entriesServices)
        {
            _Configuration = configuration;
            _Services = entriesServices;
            GeneralFunction = new UserFunction(configuration);
        }

        // Crear Entradas
        [HttpPost("CreateEntries")]
        public IActionResult Add(Entries entity)
        {
            try
            {
                _Services.Add(entity);
                return Ok(new { message = "Entrada creada con éxito." });

            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        // Consultar todas las entradas
        [HttpGet("ConsultAllEntries")]
        public ActionResult<IEnumerable<EntriesDTO>> GetEntries()
        {
            var entries = _Services.GetEntries().Select(p => new EntriesDTO
            {
                id_Entries = p.id_Entries,
                vlr_Total = p.vlr_Total,
                vlr_Unitary = p.vlr_Unitary,
                Fec_Entries = p.Fec_Entries,
                Fec_Expiration = p.Fec_Expiration,
                Can_Food = p.Can_Food,
                Vlr_Promedio = p.Vlr_Promedio,
                Nam_Food = p.food.Nam_Food,
                id_Food = p.id_Food

            }).ToList();

            return Ok(entries);
        }

        // Consultar Enbtrada por ID
        [HttpGet("GetEntriesId")]
        public async Task<IActionResult> GetEntriesId(int id_Entries)
        {
            try
            {
                var Entries = await _Services.GetEntriesById(id_Entries);

                if (Entries == null)
                {
                    return NotFound("Entrada no existe en la BD.");
                }

                return Ok(Entries);
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        // Consultar rango de Entradas
        [HttpGet("ConsultRangeEntries")]
        public ActionResult<IEnumerable<Entries>> GetEntriesRange(string start, string end)
        {
            try
            {
                if (!DateTime.TryParse(start, out DateTime startDate) || !DateTime.TryParse(end, out DateTime endDate))
                {
                    return BadRequest("Formato de fecha inválido. Usa el formato correcto (yyyy-MM-dd).");
                }

                var range = _Services.GetEntries()
                    .Where(e => e.Fec_Entries >= startDate && e.Fec_Entries <= endDate)
                    .ToList();

                if (!range.Any())
                {
                    return NotFound("No se encontraron entradas en el rango.");
                }

                return Ok(range);
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }


        // Eliminar Entrada por ID
        [HttpDelete("DeleteEntries")]
        public async Task<IActionResult> DelEntries(int id_Entries)
        {
            try
            {
                var result = await _Services.DelEntries(id_Entries);
                if (result)
                {
                    return Ok("Entradas eliminado correctamente.");
                }
                return NotFound("El Entradas no fue encontrado.");
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        // Actualizar Entrada
        [HttpPut("UpdateEntries")]
        public async Task<IActionResult> UpdateEntries(Entries updatedEntries)
        {
            if (updatedEntries == null)
            {
                return BadRequest("El entrada no es válido.");
            }

            try
            {
                var result = await _Services.UpdateEntries(updatedEntries.id_Entries, updatedEntries);

                if (!result)
                {
                    return NotFound("Entrada no existe en la BD.");
                }

                return Ok("Entrada actualizada correctamente.");
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, "Ocurrió un error inesperado.");
            }
        }
    }
}