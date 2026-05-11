using Microsoft.AspNetCore.Mvc;
using mym_softcom.Models;
using mym_softcom.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace mym_softcom.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DiscountController : ControllerBase
    {
        private readonly DiscountServices _discountServices;

        public DiscountController(DiscountServices discountServices)
        {
            _discountServices = discountServices;
        }

        /// <summary>
        /// Obtiene todos los descuentos por referidos
        /// GET: api/Discount/GetReferralDiscounts
        /// </summary>
        [HttpGet("GetReferralDiscounts")]
        public async Task<ActionResult<IEnumerable<dynamic>>> GetReferralDiscounts()
        {
            try
            {
                var discounts = await _discountServices.GetAllReferralDiscounts();
                return Ok(discounts);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Obtiene un descuento específico por ID
        /// GET: api/Discount/GetByID/{id}
        /// </summary>
        [HttpGet("GetByID/{id}")]
        public async Task<ActionResult<Discount>> GetDiscountById(int id)
        {
            try
            {
                var discount = await _discountServices.GetDiscountById(id);
                if (discount == null)
                    return NotFound(new { message = "Descuento no encontrado" });

                return Ok(discount);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Obtiene descuentos por cliente
        /// GET: api/Discount/GetByClient/{clientId}
        /// </summary>
        [HttpGet("GetByClient/{clientId}")]
        public async Task<ActionResult<IEnumerable<Discount>>> GetDiscountsByClient(int clientId)
        {
            try
            {
                var discounts = await _discountServices.GetDiscountsByClient(clientId);
                return Ok(discounts);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Crea un nuevo descuento por referido
        /// POST: api/Discount/CreateReferralDiscount
        /// </summary>
        [HttpPost("CreateReferralDiscount")]
        public async Task<ActionResult<Discount>> CreateReferralDiscount([FromBody] Discount discount)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var newDiscount = await _discountServices.CreateDiscount(discount);
                return CreatedAtAction(nameof(GetDiscountById), new { id = newDiscount.id_Discount }, newDiscount);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Actualiza un descuento existente
        /// PUT: api/Discount/UpdateDiscount/{id}
        /// </summary>
        [HttpPut("UpdateDiscount/{id}")]
        public async Task<ActionResult<Discount>> UpdateDiscount(int id, [FromBody] Discount discount)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var updatedDiscount = await _discountServices.UpdateDiscount(id, discount);
                return Ok(updatedDiscount);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Desactiva un descuento (eliminación lógica)
        /// DELETE: api/Discount/DeleteDiscount/{id}
        /// </summary>
        [HttpDelete("DeleteDiscount/{id}")]
        public async Task<ActionResult> DeleteDiscount(int id)
        {
            try
            {
                var result = await _discountServices.DeleteDiscount(id);
                if (!result)
                    return NotFound(new { message = "Descuento no encontrado" });

                return Ok(new { message = "Descuento desactivado correctamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Obtiene estadísticas de descuentos
        /// GET: api/Discount/GetStatistics
        /// </summary>
        [HttpGet("GetStatistics")]
        public async Task<ActionResult<dynamic>> GetStatistics()
        {
            try
            {
                var stats = await _discountServices.GetDiscountStatistics();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}
