using mym_softcom.Models;
using mym_softcom;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace mym_softcom.Services
{
    public class DetailServices
    {
        private readonly AppDbContext _context;
        private readonly PaymentServices _paymentServices;
        private readonly SaleServices _saleServices;

        public DetailServices(AppDbContext context, PaymentServices paymentServices, SaleServices saleServices)
        {
            _context = context;
            _paymentServices = paymentServices;
            _saleServices = saleServices;
        }

        /// <summary>
        /// Obtiene todos los detalles de pagos, incluyendo las relaciones.
        /// </summary>
        public async Task<IEnumerable<Detail>> GetAllDetails()
        {
            return await _context.Details
                                 .Include(d => d.payment)
                                 .ThenInclude(p => p.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(d => d.payment)
                                 .ThenInclude(p => p.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(d => d.payment)
                                 .ThenInclude(p => p.sale)
                                 .ThenInclude(s => s.plan)
                                 .Include(d => d.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(d => d.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(d => d.sale)
                                 .ThenInclude(s => s.plan)
                                 .ToListAsync();
        }

        /// <summary>
        /// Obtiene un detalle específico por su ID, incluyendo las relaciones.
        /// </summary>
        public async Task<Detail?> GetDetailById(int id_Details)
        {
            Console.WriteLine($"[DetailServices] Buscando detalle con id_Details: {id_Details}");
            return await _context.Details
                                 .Include(d => d.payment)
                                 .ThenInclude(p => p.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(d => d.payment)
                                 .ThenInclude(p => p.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(d => d.payment)
                                 .ThenInclude(p => p.sale)
                                 .ThenInclude(s => s.plan)
                                 .Include(d => d.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(d => d.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(d => d.sale)
                                 .ThenInclude(s => s.plan)
                                 .FirstOrDefaultAsync(d => d.id_Details == id_Details);
        }

        /// <summary>
        /// Obtiene todos los detalles asociados a un pago específico.
        /// </summary>
        public async Task<IEnumerable<Detail>> GetDetailsByPaymentId(int id_Payments)
        {
            return await _context.Details
                                 .Where(d => d.id_Payments == id_Payments)
                                 .Include(d => d.payment)
                                 .ThenInclude(p => p.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(d => d.payment)
                                 .ThenInclude(p => p.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(d => d.payment)
                                 .ThenInclude(p => p.sale)
                                 .ThenInclude(s => s.plan)
                                 .Include(d => d.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(d => d.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(d => d.sale)
                                 .ThenInclude(s => s.plan)
                                 .OrderBy(d => d.number_quota)
                                 .ToListAsync();
        }

        /// <summary>
        /// Obtiene todos los detalles asociados a una venta específica.
        /// </summary>
        public async Task<IEnumerable<Detail>> GetDetailsBySaleId(int id_Sales)
        {
            return await _context.Details
                                 .Where(d => d.id_Sales == id_Sales)
                                 .Include(d => d.payment)
                                 .ThenInclude(p => p.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(d => d.payment)
                                 .ThenInclude(p => p.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(d => d.payment)
                                 .ThenInclude(p => p.sale)
                                 .ThenInclude(s => s.plan)
                                 .Include(d => d.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(d => d.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(d => d.sale)
                                 .ThenInclude(s => s.plan)
                                 .OrderBy(d => d.number_quota)
                                 .ToListAsync();
        }

        /// <summary>
        /// Crea un nuevo detalle de pago.
        /// </summary>
        public async Task<bool> CreateDetail(Detail detail)
        {
            try
            {
                // Validar que el pago existe
                var payment = await _paymentServices.GetPaymentById(detail.id_Payments);
                if (payment == null)
                {
                    throw new InvalidOperationException("El pago asociado no existe.");
                }

                // Validar que la venta existe
                var sale = await _saleServices.GetSaleById(detail.id_Sales);
                if (sale == null)
                {
                    throw new InvalidOperationException("La venta asociada no existe.");
                }

                if (!detail.covered_amount.HasValue || detail.covered_amount.Value <= 0)
                {
                    throw new ArgumentException("El monto cubierto debe ser un valor positivo.");
                }

                if (detail.number_quota <= 0)
                {
                    throw new ArgumentException("El número de cuota debe ser un valor positivo.");
                }

                _context.Details.Add(detail);
                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en CreateDetail: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        /// <summary>
        /// Actualiza un detalle existente.
        /// </summary>
        public async Task<bool> UpdateDetail(int id_Details, Detail updatedDetail)
        {
            try
            {
                var existingDetail = await _context.Details.AsNoTracking().FirstOrDefaultAsync(d => d.id_Details == id_Details);
                if (existingDetail == null) return false;

                if (id_Details != updatedDetail.id_Details)
                    throw new ArgumentException("El ID del detalle en la URL no coincide con el ID del detalle en el cuerpo de la solicitud.");

                if (!updatedDetail.covered_amount.HasValue || updatedDetail.covered_amount.Value <= 0)
                {
                    throw new ArgumentException("El monto cubierto debe ser un valor positivo.");
                }

                if (updatedDetail.number_quota <= 0)
                {
                    throw new ArgumentException("El número de cuota debe ser un valor positivo.");
                }

                // Validar que el pago existe
                var payment = await _paymentServices.GetPaymentById(updatedDetail.id_Payments);
                if (payment == null)
                {
                    throw new InvalidOperationException("El pago asociado no existe.");
                }

                // Validar que la venta existe
                var sale = await _saleServices.GetSaleById(updatedDetail.id_Sales);
                if (sale == null)
                {
                    throw new InvalidOperationException("La venta asociada no existe.");
                }

                _context.Entry(existingDetail).CurrentValues.SetValues(updatedDetail);
                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en UpdateDetail: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        /// <summary>
        /// Elimina un detalle.
        /// </summary>
        public async Task<bool> DeleteDetail(int id_Details)
        {
            try
            {
                var detail = await _context.Details.FirstOrDefaultAsync(d => d.id_Details == id_Details);
                if (detail == null) return false;

                _context.Details.Remove(detail);
                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en DeleteDetail: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        /// <summary>
        /// Obtiene un resumen de cuotas pagadas para una venta específica.
        /// </summary>
        public async Task<object> GetQuotaSummaryBySaleId(int id_Sales)
        {
            try
            {
                var sale = await _saleServices.GetSaleById(id_Sales);
                if (sale == null)
                {
                    throw new InvalidOperationException("La venta no existe.");
                }

                var details = await _context.Details
                    .Where(d => d.id_Sales == id_Sales)
                    .GroupBy(d => d.number_quota)
                    .Select(g => new {
                        QuotaNumber = g.Key,
                        TotalCovered = g.Sum(d => d.covered_amount ?? 0),
                        PaymentCount = g.Count()
                    })
                    .OrderBy(q => q.QuotaNumber)
                    .ToListAsync();

                return new
                {
                    SaleId = id_Sales,
                    QuotaValue = sale.quota_value ?? 0,
                    TotalQuotas = sale.plan?.number_quotas ?? 0,
                    QuotaDetails = details
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en GetQuotaSummaryBySaleId: {ex.Message}");
                throw;
            }
        }
    }
}
