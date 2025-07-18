using Microsoft.AspNetCore.Mvc;
using mym_softcom.Models;
using mym_softcom.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

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

        // GET: api/Payment
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Payment>>> GetPayments()
        {
            var payments = await _paymentServices.GetPayments();
            return Ok(payments);
        }

        // GET: api/Payment/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Payment>> GetPayment(int id)
        {
            var payment = await _paymentServices.GetPaymentById(id);
            if (payment == null)
            {
                return NotFound();
            }
            return Ok(payment);
        }

        // POST: api/Payment
        [HttpPost]
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
                    return CreatedAtAction(nameof(GetPayment), new { id = payment.Id_Payments }, payment);
                }
                return StatusCode(500, "Error al crear el pago.");
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

        // PUT: api/Payment/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePayment(int id, Payment payment)
        {
            if (id != payment.Id_Payments)
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
                    return NoContent();
                }
                return NotFound("Pago no encontrado o error al actualizar.");
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

        // DELETE: api/Payment/{id}
        [HttpDelete("{id}")]
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

        // GET: api/Payment/search?term={searchTerm}
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<Payment>>> SearchPayments([FromQuery] string searchTerm)
        {
            var payments = await _paymentServices.SearchPayments(searchTerm);
            return Ok(payments);
        }
    }
}