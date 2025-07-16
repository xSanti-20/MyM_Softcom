using API_PESO_PIG.Functions;
using Microsoft.AspNetCore.Mvc;
using API_PESO_PIG.Models;
using API_PESO_PIG.Services;
using Microsoft.AspNetCore.Authorization;
using API_PESO_PIG.DTOs;

namespace PESO_PIG.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class FoodController : Controller
    {
        public IConfiguration _Configuration;
        public readonly FoodServices _Services;
        public UserFunction GeneralFunction;

        public FoodController(IConfiguration configuration, FoodServices foodServices)
        {
            _Configuration = configuration;
            _Services = foodServices;
            GeneralFunction = new UserFunction(configuration);
        }

        // Crear Food
        [Authorize]
        [HttpPost("CreateFood")]
        public IActionResult Add(Food entity)
        {
            try
            {
                _Services.Add(entity);
                return Ok(new { message = "Food creado con éxito." });

            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        // Consultar todos los Foods
        [Authorize]
        [HttpGet("ConsultAllFoods")]
        public ActionResult<IEnumerable<FoodDTO>> GetFoods()
        {
            var foods = _Services.GetFoods().Select(p => new FoodDTO
            {
                Id_Food = p.id_Food,
                Nam_Food = p.Nam_Food,
                Existence = (int)p.Existence,
                Vlr_Unit = p.Vlr_Unit,
                Und_Extent = p.Und_Extent,
                Rat_Food = p.Rat_Food,
                Name_Stage = p.stage.Name_Stage,
                Id_Stage = p.id_Stage
            }).ToList();

            return Ok(foods);
        }

        // Consultar Food por ID
        [Authorize]
        [HttpGet("GetFoodId")]
        public async Task<IActionResult> GetFoodById(int id_Food)
        {
            try
            {
                var food = await _Services.GetFoodById(id_Food);

                if (food == null)
                {
                    return NotFound("Food no existe en la BD.");
                }

                return Ok(food);
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        // Consultar rango de Foods
        [Authorize]
        [HttpGet("ConsultRangeFood")]
        public ActionResult<IEnumerable<Food>> GetFoodsRange(int start, int end)
        {
            try
            {
                var range = _Services.GetFoods()
                    .Where(f => f.id_Food >= start && f.id_Food <= end)
                    .ToList();

                if (!range.Any())
                {
                    return NotFound("No se encontraron Foods en el rango especificado.");
                }

                return Ok(range);
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }


        // Eliminar Food por ID
        [Authorize]
        [HttpDelete("DeleteFood")]
        public async Task<IActionResult> DelFood(int id_Food)
        {
            try
            {
                var result = await _Services.DelFood(id_Food);
                if (result)
                {
                    return Ok("Food eliminado correctamente.");
                }
                return NotFound("El Food no fue encontrado.");
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, ex.ToString());
            }
        }

        // Actualizar Food
        [Authorize]
        [HttpPut("UpdateFood")]
        public async Task<IActionResult> UpdateFood(Food updatedFood)
        {
            if (updatedFood == null)
            {
                return BadRequest("El Food no es válido.");
            }

            try
            {
                var result = await _Services.UpdateFood(updatedFood.id_Food, updatedFood);

                if (!result)
                {
                    return NotFound("Food no existe en la BD.");
                }

                return Ok("Food actualizado correctamente.");
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return StatusCode(500, "Ocurrió un error inesperado.");
            }
        }
    }
}
