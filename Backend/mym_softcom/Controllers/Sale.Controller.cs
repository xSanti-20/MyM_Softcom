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
    public class SaleController : ControllerBase
    {
        private readonly SaleServices _saleServices;

        public SaleController(SaleServices saleServices)
        {
            _saleServices = saleServices;
        }

        // GET: api/Sale
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Sale>>> GetSales()
        {
            // CORRECCIÓN: Añadido 'await' aquí
            var sales = await _saleServices.GetSales();
            return Ok(sales);
        }

        // GET: api/Sale/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Sale>> GetSale(int id)
        {
            var sale = await _saleServices.GetSaleById(id);
            if (sale == null)
            {
                return NotFound();
            }
            return Ok(sale);
        }

        // POST: api/Sale
        [HttpPost]
        public async Task<ActionResult<Sale>> CreateSale(Sale sale)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _saleServices.CreateSale(sale);
                if (success)
                {
                    return CreatedAtAction(nameof(GetSale), new { id = sale.Id_Sales }, sale);
                }
                return StatusCode(500, "Error al crear la venta.");
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

        // PUT: api/Sale/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSale(int id, Sale sale)
        {
            if (id != sale.Id_Sales)
            {
                return BadRequest("El ID de la venta en la URL no coincide con el ID de la venta en el cuerpo de la solicitud.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _saleServices.UpdateSale(id, sale);
                if (success)
                {
                    return NoContent();
                }
                return NotFound("Venta no encontrada o error al actualizar.");
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

        // DELETE: api/Sale/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSale(int id)
        {
            try
            {
                var success = await _saleServices.DeleteSale(id);
                if (success)
                {
                    return NoContent();
                }
                return NotFound("Venta no encontrada o no se pudo eliminar.");
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

        // GET: api/Sale/search?term={searchTerm}
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<Sale>>> SearchSales([FromQuery] string searchTerm)
        {
            var sales = await _saleServices.SearchSales(searchTerm);
            return Ok(sales);
        }

        // GET: api/Sale/select?clientId={clientId}
        [HttpGet("select")]
        public async Task<ActionResult<IEnumerable<object>>> GetSalesForSelect([FromQuery] int? clientId = null)
        {
            var sales = await _saleServices.GetSalesForSelect(clientId);
            return Ok(sales);
        }
    }
}
