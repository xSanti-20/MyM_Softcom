using mym_softcom.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace mym_softcom.Services
{
    public class DiscountServices
    {
        private readonly AppDbContext _context;

        public DiscountServices(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Obtiene todos los descuentos por referidos
        /// </summary>
        public async Task<List<dynamic>> GetAllReferralDiscounts()
        {
            try
            {
                var discounts = await _context.Discounts
                    .Where(d => d.discount_type == "referral" && d.is_active)
                    .Include(d => d.Client)
                    .Include(d => d.Sale)
                    .OrderByDescending(d => d.discount_date)
                    .Select(d => new
                    {
                        id_Discount = d.id_Discount,
                        client_name = d.Client.names + " " + d.Client.surnames,
                        document = d.Client.document,
                        discount_amount = d.discount_amount,
                        apply_to = d.apply_to,
                        discount_date = d.discount_date,
                        notes = d.notes,
                        created_at = d.created_at
                    })
                    .Cast<dynamic>()
                    .ToListAsync();

                return discounts;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error al obtener descuentos: {ex.Message}");
            }
        }

        /// <summary>
        /// Obtiene un descuento específico por ID
        /// </summary>
        public async Task<Discount> GetDiscountById(int id)
        {
            try
            {
                var discount = await _context.Discounts
                    .Include(d => d.Client)
                    .Include(d => d.Sale)
                    .FirstOrDefaultAsync(d => d.id_Discount == id);

                return discount;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error al obtener el descuento: {ex.Message}");
            }
        }

        /// <summary>
        /// Obtiene descuentos por cliente
        /// </summary>
        public async Task<List<Discount>> GetDiscountsByClient(int clientId)
        {
            try
            {
                var discounts = await _context.Discounts
                    .Where(d => d.id_Clients == clientId && d.is_active)
                    .OrderByDescending(d => d.discount_date)
                    .ToListAsync();

                return discounts;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error al obtener descuentos del cliente: {ex.Message}");
            }
        }

        /// <summary>
        /// Crea un nuevo descuento por referido
        /// </summary>
        public async Task<Discount> CreateDiscount(Discount discount)
        {
            try
            {
                // Validaciones
                if (discount.discount_amount <= 0)
                    throw new Exception("El monto del descuento debe ser mayor a 0");

                if (string.IsNullOrEmpty(discount.apply_to) || !new[] { "cartera", "cuota" }.Contains(discount.apply_to))
                    throw new Exception("apply_to debe ser 'cartera' o 'cuota'");

                // Verificar que el cliente exista
                var clientExists = await _context.Clients.AnyAsync(c => c.id_Clients == discount.id_Clients);
                if (!clientExists)
                    throw new Exception("El cliente no existe");

                discount.created_at = DateTime.Now;
                discount.updated_at = DateTime.Now;
                discount.is_active = true;

                _context.Discounts.Add(discount);
                await _context.SaveChangesAsync();

                // SI SE APLICA A CARTERA: Reducir el total_debt de la venta específica
                if (discount.apply_to == "cartera" && discount.id_Sales.HasValue)
                {
                    var sale = await _context.Sales.FindAsync(discount.id_Sales.Value);

                    if (sale != null)
                    {
                        // Restar el descuento del total_debt
                        sale.total_debt = (sale.total_debt ?? 0) - discount.discount_amount;

                        // Si total_debt es menor que 0, ponerlo en 0
                        if (sale.total_debt < 0)
                            sale.total_debt = 0;

                        _context.Sales.Update(sale);
                        await _context.SaveChangesAsync();
                    }
                }

                return discount;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error al crear el descuento: {ex.Message}");
            }
        }

        /// <summary>
        /// Actualiza un descuento existente
        /// </summary>
        public async Task<Discount> UpdateDiscount(int id, Discount discountData)
        {
            try
            {
                var discount = await _context.Discounts.FindAsync(id);
                if (discount == null)
                    throw new Exception("Descuento no encontrado");

                if (discountData.discount_amount > 0)
                    discount.discount_amount = discountData.discount_amount;

                if (!string.IsNullOrEmpty(discountData.apply_to))
                    discount.apply_to = discountData.apply_to;

                if (!string.IsNullOrEmpty(discountData.notes))
                    discount.notes = discountData.notes;

                discount.updated_at = DateTime.Now;

                _context.Discounts.Update(discount);
                await _context.SaveChangesAsync();

                return discount;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error al actualizar el descuento: {ex.Message}");
            }
        }

        /// <summary>
        /// Desactiva un descuento (eliminación lógica)
        /// </summary>
        public async Task<bool> DeleteDiscount(int id)
        {
            try
            {
                var discount = await _context.Discounts.FindAsync(id);
                if (discount == null)
                    throw new Exception("Descuento no encontrado");

                discount.is_active = false;
                discount.updated_at = DateTime.Now;

                _context.Discounts.Update(discount);
                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error al eliminar el descuento: {ex.Message}");
            }
        }

        /// <summary>
        /// Obtiene estadísticas de descuentos
        /// </summary>
        public async Task<dynamic> GetDiscountStatistics()
        {
            try
            {
                var discounts = await _context.Discounts
                    .Where(d => d.is_active)
                    .ToListAsync();

                var stats = new
                {
                    total_discounts = discounts.Count,
                    total_amount = discounts.Sum(d => d.discount_amount),
                    by_cartera = discounts.Count(d => d.apply_to == "cartera"),
                    by_cuota = discounts.Count(d => d.apply_to == "cuota"),
                    average_amount = discounts.Count > 0 ? discounts.Average(d => d.discount_amount) : 0m
                };

                return stats;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error al obtener estadísticas: {ex.Message}");
            }
        }
    }
}
