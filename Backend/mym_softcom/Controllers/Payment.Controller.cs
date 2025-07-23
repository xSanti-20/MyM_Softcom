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
    public class PaymentController : ControllerBase
    {
        private readonly PaymentServices _paymentServices;

        public PaymentController(PaymentServices paymentServices)
        {
            _paymentServices = paymentServices;
        }

        /// <summary>
        /// Obtiene todos los pagos registrados en el sistema.
        /// </summary>
        /// <returns>Una lista de objetos Payment.</returns>
        // GET: api/Payment/GetAllPayments
        [HttpGet("GetAllPayments")]
        public async Task<ActionResult<IEnumerable<Payment>>> GetAllPayments()
        {
            var payments = await _paymentServices.GetAllPayments();
            return Ok(payments);
        }

        /// <summary>
        /// Obtiene un pago específico por su ID.
        /// </summary>
        /// <param name="id">El ID del pago.</param>
        /// <returns>El objeto Payment si se encuentra, de lo contrario, NotFound.</returns>
        // GET: api/Payment/GetPaymentID/{id}
        [HttpGet("GetPaymentID/{id}")]
        public async Task<ActionResult<Payment>> GetPaymentID(int id)
        {
            var payment = await _paymentServices.GetPaymentById(id);
            if (payment == null)
            {
                return NotFound("Pago no encontrado.");
            }
            return Ok(payment);
        }

        /// <summary>
        /// Obtiene todos los pagos asociados a una venta específica.
        /// </summary>
        /// <param name="saleId">El ID de la venta.</param>
        /// <returns>Una lista de objetos Payment de la venta especificada.</returns>
        // GET: api/Payment/GetPaymentsBySaleId/{saleId}
        [HttpGet("GetPaymentsBySaleId/{saleId}")]
        public async Task<ActionResult<IEnumerable<Payment>>> GetPaymentsBySaleId(int saleId)
        {
            var payments = await _paymentServices.GetPaymentsBySaleId(saleId);
            return Ok(payments);
        }

        /// <summary>
        /// Crea un nuevo pago en el sistema.
        /// </summary>
        /// <param name="payment">El objeto Payment a crear.</param>
        /// <returns>El pago creado con su ID.</returns>
        // POST: api/Payment/CreatePayment
        [HttpPost("CreatePayment")]
        public async Task<ActionResult<Payment>> CreatePayment(Payment payment)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _paymentServices.CreatePayment(payment);
                if (success)
                {
                    // Usar el nombre de la acción explícito para CreatedAtAction
                    return CreatedAtAction(nameof(GetPaymentID), new { id = payment.id_Payments }, payment);
                }
                return StatusCode(500, "Error al crear el pago.");
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message); // Captura errores de lógica de negocio (ej. venta no existe)
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message); // Captura errores de argumentos (ej. monto inválido)
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        /// <summary>
        /// Actualiza un pago existente por su ID.
        /// </summary>
        /// <param name="id">El ID del pago a actualizar.</param>
        /// <param name="payment">El objeto Payment con los datos actualizados.</param>
        /// <returns>NoContent si la actualización es exitosa, de lo contrario, BadRequest o NotFound.</returns>
        // PUT: api/Payment/UpdatePayment/{id}
        [HttpPut("UpdatePayment/{id}")]
        public async Task<IActionResult> UpdatePayment(int id, Payment payment)
        {
            if (id != payment.id_Payments)
            {
                return BadRequest("El ID del pago en la URL no coincide con el ID del pago en el cuerpo de la solicitud.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _paymentServices.UpdatePayment(id, payment);
                if (success)
                {
                    return NoContent(); // 204 No Content para una actualización exitosa sin retorno de datos
                }
                return NotFound("Pago no encontrado o error al actualizar.");
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
        /// Elimina un pago del sistema por su ID.
        /// </summary>
        /// <param name="id">El ID del pago a eliminar.</param>
        /// <returns>NoContent si la eliminación es exitosa, de lo contrario, NotFound.</returns>
        // DELETE: api/Payment/DeletePayment/{id}
        [HttpDelete("DeletePayment/{id}")]
        public async Task<IActionResult> DeletePayment(int id)
        {
            try
            {
                var success = await _paymentServices.DeletePayment(id);
                if (success)
                {
                    return NoContent();
                }
                return NotFound("Pago no encontrado o no se pudo eliminar.");
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
