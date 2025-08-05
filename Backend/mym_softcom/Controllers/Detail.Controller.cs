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
    public class DetailController : ControllerBase
    {
        private readonly DetailServices _detailServices;

        public DetailController(DetailServices detailServices)
        {
            _detailServices = detailServices;
        }

        /// <summary>
        /// Obtiene todos los detalles registrados en el sistema.
        /// </summary>
        /// <returns>Una lista de objetos Detail.</returns>
        // GET: api/Detail/GetAllDetails
        [HttpGet("GetAllDetails")]
        public async Task<ActionResult<IEnumerable<Detail>>> GetAllDetails()
        {
            var details = await _detailServices.GetAllDetails();
            return Ok(details);
        }

        /// <summary>
        /// Obtiene un detalle específico por su ID.
        /// </summary>
        /// <param name="id">El ID del detalle.</param>
        /// <returns>El objeto Detail si se encuentra, de lo contrario, NotFound.</returns>
        // GET: api/Detail/GetDetailID/{id}
        [HttpGet("GetDetailID/{id}")]
        public async Task<ActionResult<Detail>> GetDetailID(int id)
        {
            var detail = await _detailServices.GetDetailById(id);
            if (detail == null)
            {
                return NotFound("Detalle no encontrado.");
            }
            return Ok(detail);
        }

        /// <summary>
        /// Obtiene todos los detalles asociados a un pago específico.
        /// </summary>
        /// <param name="paymentId">El ID del pago.</param>
        /// <returns>Una lista de objetos Detail del pago especificado.</returns>
        // GET: api/Detail/GetDetailsByPaymentId/{paymentId}
        [HttpGet("GetDetailsByPaymentId/{paymentId}")]
        public async Task<ActionResult<IEnumerable<Detail>>> GetDetailsByPaymentId(int paymentId)
        {
            var details = await _detailServices.GetDetailsByPaymentId(paymentId);
            return Ok(details);
        }

        /// <summary>
        /// Obtiene todos los detalles asociados a una venta específica.
        /// </summary>
        /// <param name="saleId">El ID de la venta.</param>
        /// <returns>Una lista de objetos Detail de la venta especificada.</returns>
        // GET: api/Detail/GetDetailsBySaleId/{saleId}
        [HttpGet("GetDetailsBySaleId/{saleId}")]
        public async Task<ActionResult<IEnumerable<Detail>>> GetDetailsBySaleId(int saleId)
        {
            var details = await _detailServices.GetDetailsBySaleId(saleId);
            return Ok(details);
        }

        /// <summary>
        /// Obtiene un resumen de cuotas pagadas para una venta específica.
        /// </summary>
        /// <param name="saleId">El ID de la venta.</param>
        /// <returns>Un resumen de las cuotas y montos pagados.</returns>
        // GET: api/Detail/GetQuotaSummaryBySaleId/{saleId}
        [HttpGet("GetQuotaSummaryBySaleId/{saleId}")]
        public async Task<ActionResult<object>> GetQuotaSummaryBySaleId(int saleId)
        {
            try
            {
                var summary = await _detailServices.GetQuotaSummaryBySaleId(saleId);
                return Ok(summary);
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
        /// Crea un nuevo detalle en el sistema.
        /// </summary>
        /// <param name="detail">El objeto Detail a crear.</param>
        /// <returns>El detalle creado con su ID.</returns>
        // POST: api/Detail/CreateDetail
        [HttpPost("CreateDetail")]
        public async Task<ActionResult<Detail>> CreateDetail(Detail detail)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _detailServices.CreateDetail(detail);
                if (success)
                {
                    return CreatedAtAction(nameof(GetDetailID), new { id = detail.id_Details }, detail);
                }
                return StatusCode(500, "Error al crear el detalle.");
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Actualiza un detalle existente por su ID.
        /// </summary>
        /// <param name="id">El ID del detalle a actualizar.</param>
        /// <param name="detail">El objeto Detail con los datos actualizados.</param>
        /// <returns>NoContent si la actualización es exitosa, de lo contrario, BadRequest o NotFound.</returns>
        // PUT: api/Detail/UpdateDetail/{id}
        [HttpPut("UpdateDetail/{id}")]
        public async Task<IActionResult> UpdateDetail(int id, Detail detail)
        {
            if (id != detail.id_Details)
            {
                return BadRequest("El ID del detalle en la URL no coincide con el ID del detalle en el cuerpo de la solicitud.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _detailServices.UpdateDetail(id, detail);
                if (success)
                {
                    return NoContent();
                }
                return NotFound("Detalle no encontrado o error al actualizar.");
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        /// <summary>
        /// Elimina un detalle del sistema por su ID.
        /// </summary>
        /// <param name="id">El ID del detalle a eliminar.</param>
        /// <returns>NoContent si la eliminación es exitosa, de lo contrario, NotFound.</returns>
        // DELETE: api/Detail/DeleteDetail/{id}
        [HttpDelete("DeleteDetail/{id}")]
        public async Task<IActionResult> DeleteDetail(int id)
        {
            try
            {
                var success = await _detailServices.DeleteDetail(id);
                if (success)
                {
                    return NoContent();
                }
                return NotFound("Detalle no encontrado o no se pudo eliminar.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
    }
}
