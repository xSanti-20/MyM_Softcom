using Microsoft.AspNetCore.Mvc;
using mym_softcom.Models;
using mym_softcom.Services;
using mym_softcom.DTOs; // ← NUEVO: Para RedistributeQuotasRequest
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
            try
            {
                Console.WriteLine("🔍 [Sale Controller] GetAllSales iniciado");
                var sales = await _saleServices.GetAllSales();
                Console.WriteLine($"✅ [Sale Controller] Se obtuvieron {sales.Count()} ventas");
                return Ok(sales);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ [Sale Controller] Error en GetAllSales: {ex.Message}");
                Console.WriteLine($"   Stack: {ex.StackTrace}");
                return StatusCode(500, new { error = $"Error al obtener ventas: {ex.Message}", details = ex.StackTrace });
            }
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
        /// Obtiene todas las ventas de un cliente específico.
        /// </summary>
        /// <param name="clientId">El ID del cliente.</param>
        /// <returns>Una lista de ventas del cliente.</returns>
        // GET: api/Sale/GetByClientId/{clientId}
        [HttpGet("GetByClientId/{clientId}")]
        public async Task<ActionResult<IEnumerable<Sale>>> GetByClientId(int clientId)
        {
            var sales = await _saleServices.GetSalesByClientId(clientId);
            return Ok(sales);
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
                // ✅ CORREGIDO: El enum de la BD es 'Active', no 'Activa'
                // No establecer status aquí, dejar que el servicio lo maneje
                
                var success = await _saleServices.CreateSale(sale);
                if (success)
                {
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
                    return NoContent();
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

        /// <summary>
        /// ✅ ENDPOINT TEMPORAL DE DEBUGGING: Diagnostica el schema de la tabla sales
        /// </summary>
        [HttpGet("debug/schema")]
        public async Task<IActionResult> DebugSchema()
        {
            try
            {
                var result = await _saleServices.DebugSalesTableSchema();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// ✅ ENDPOINT TEMPORAL DE UTILIDAD: Corrige todas las ventas con status null
        /// </summary>
        [HttpPost("debug/fix-null-statuses")]
        public async Task<IActionResult> FixNullStatuses()
        {
            try
            {
                var result = await _saleServices.FixNullStatuses();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Redistribuye cuotas vencidas de una venta (todas a última cuota o en un rango personalizado).
        /// </summary>
        /// <param name="id">El ID de la venta a redistribuir.</param>
        /// <param name="request">Solicitud con tipo de redistribución y cuotas vencidas.</param>
        /// <returns>OK si la redistribución es exitosa, BadRequest o NotFound si hay error.</returns>
        // POST: api/Sale/{id}/redistribute-quotas
        [HttpPost("{id}/redistribute-quotas")]
        public async Task<IActionResult> RedistributeQuotas(int id, [FromBody] RedistributeQuotasRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                Console.WriteLine($"[RedistributeQuotas] 📥 Solicitud recibida para venta {id}: {request.RedistributionType}");
                
                var result = await _saleServices.RedistributeOverdueQuotas(id, request);
                
                if (result.Success)
                {
                    Console.WriteLine($"[RedistributeQuotas] ✅ Redistribución completada para venta {id}");
                    return Ok(new { success = true, message = result.Message });
                }
                else
                {
                    Console.WriteLine($"[RedistributeQuotas] ❌ Error en redistribución: {result.Message}");
                    return BadRequest(new { success = false, message = result.Message });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[RedistributeQuotas] 💥 Excepción: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Revierte una redistribución de cuotas vencidas, restaurando los valores originales.
        /// </summary>
        /// <param name="id">El ID de la venta a restaurar.</param>
        /// <returns>OK si la reversión es exitosa, NotFound o BadRequest si hay error.</returns>
        // POST: api/Sale/{id}/undo-redistribution
        [HttpPost("{id}/undo-redistribution")]
        public async Task<IActionResult> UndoRedistribution(int id)
        {
            try
            {
                Console.WriteLine($"[UndoRedistribution] 🔄 Solicitud para deshacer redistribución en venta {id}");
                
                var result = await _saleServices.UndoRedistribution(id);
                
                if (result.Success)
                {
                    Console.WriteLine($"[UndoRedistribution] ✅ Redistribución revertida para venta {id}");
                    return Ok(new { success = true, message = result.Message });
                }
                else
                {
                    Console.WriteLine($"[UndoRedistribution] ❌ Error al revertir: {result.Message}");
                    return BadRequest(new { success = false, message = result.Message });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UndoRedistribution] 💥 Excepción: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
