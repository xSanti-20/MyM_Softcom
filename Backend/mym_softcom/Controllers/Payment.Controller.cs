using Microsoft.AspNetCore.Mvc;
using mym_softcom.Models;
using mym_softcom.Services;
using mym_softcom.DTOs;
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
            try
            {
                Console.WriteLine("🔍 [Payment Controller] GetAllPayments iniciado");
                var payments = await _paymentServices.GetAllPayments();
                Console.WriteLine($"✅ [Payment Controller] Se obtuvieron {payments.Count()} pagos");
                return Ok(payments);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ [Payment Controller] Error en GetAllPayments: {ex.Message}");
                Console.WriteLine($"   Stack: {ex.StackTrace}");
                return StatusCode(500, new { error = $"Error al obtener pagos: {ex.Message}", details = ex.StackTrace });
            }
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
        /// <param name="paymentDTO">El DTO con los datos del pago a crear.</param>
        /// <returns>El pago creado con su ID.</returns>
        // POST: api/Payment/CreatePayment
        [HttpPost("CreatePayment")]
        public async Task<ActionResult<Payment>> CreatePayment(CreatePaymentDTO paymentDTO)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // ← NUEVO: Pasar el DTO al servicio para que procese PaymentDetails
                var success = await _paymentServices.CreatePaymentFromDTO(paymentDTO);
                if (success)
                {
                    return Ok(new { message = "Pago registrado con éxito.", success = true });
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
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Actualiza un pago existente.
        /// </summary>
        /// <param name="id">El ID del pago a actualizar.</param>
        /// <param name="paymentDTO">El DTO con los datos actualizados.</param>
        /// <returns>NoContent si la actualización es exitosa.</returns>
        // PUT: api/Payment/UpdatePayment/{id}
        [HttpPut("UpdatePayment/{id}")]
        public async Task<IActionResult> UpdatePayment(int id, CreatePaymentDTO paymentDTO)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // ← NUEVO: Usar UpdatePaymentFromDTO que respeta KeepOriginalQuotas
                var success = await _paymentServices.UpdatePaymentFromDTO(id, paymentDTO);
                if (success)
                {
                    return Ok(new { message = "Pago actualizado con éxito.", success = true });
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
