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
    public class SaleController : ControllerBase
    {
        private readonly SaleServices _saleServices;

        public SaleController(SaleServices saleServices)
        {
            _saleServices = saleServices;
        }

        /// <summary>
        /// Obtiene todas las ventas registradas en el sistema.
        /// </summary>
        /// <returns>Una lista de objetos Sale.</returns>
        // GET: api/Sale/GetAllSales
        [HttpGet("GetAllSales")]
        public async Task<ActionResult<IEnumerable<Sale>>> GetAllSales()
        {
            var sales = await _saleServices.GetAllSales();
            return Ok(sales);
        }

        /// <summary>
        /// Obtiene una venta específica por su ID.
        /// </summary>
        /// <param name="id">El ID de la venta.</param>
        /// <returns>El objeto Sale si se encuentra, de lo contrario, NotFound.</returns>
        // GET: api/Sale/GetSaleID/{id}
        [HttpGet("GetSaleID/{id}")]
        public async Task<ActionResult<Sale>> GetSaleID(int id)
        {
            var sale = await _saleServices.GetSaleById(id);
            if (sale == null)
            {
                return NotFound("Venta no encontrada.");
            }
            return Ok(sale);
        }

        /// <summary>
        /// Crea una nueva venta en el sistema.
        /// </summary>
        /// <param name="sale">El objeto Sale a crear.</param>
        /// <returns>La venta creada con su ID.</returns>
        // POST: api/Sale/CreateSale
        [HttpPost("CreateSale")]
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
                    // Usar el nombre de la acción explícito para CreatedAtAction
                    return CreatedAtAction(nameof(GetSaleID), new { id = sale.id_Sales }, sale);
                }
                return StatusCode(500, "Error al crear la venta.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        /// <summary>
        /// Actualiza una venta existente por su ID.
        /// </summary>
        /// <param name="id">El ID de la venta a actualizar.</param>
        /// <param name="sale">El objeto Sale con los datos actualizados.</param>
        /// <returns>NoContent si la actualización es exitosa, de lo contrario, BadRequest o NotFound.</returns>
        // PUT: api/Sale/UpdateSale/{id}
        [HttpPut("UpdateSale/{id}")]
        public async Task<IActionResult> UpdateSale(int id, Sale sale)
        {
            if (id != sale.id_Sales)
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
                    return NoContent(); // 204 No Content para una actualización exitosa sin retorno de datos
                }
                return NotFound("Venta no encontrada o error al actualizar.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        /// <summary>
        /// Elimina una venta del sistema por su ID.
        /// </summary>
        /// <param name="id">El ID de la venta a eliminar.</param>
        /// <returns>NoContent si la eliminación es exitosa, de lo contrario, NotFound.</returns>
        // DELETE: api/Sale/DeleteSale/{id}
        [HttpDelete("DeleteSale/{id}")]
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
    }
}
