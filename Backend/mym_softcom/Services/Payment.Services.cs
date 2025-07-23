using mym_softcom.Models;
using mym_softcom;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace mym_softcom.Services
{
    public class PaymentServices
    {
        private readonly AppDbContext _context;
        private readonly SaleServices _saleServices; // Para interactuar con las ventas

        public PaymentServices(AppDbContext context, SaleServices saleServices)
        {
            _context = context;
            _saleServices = saleServices;
        }

        /// <summary>
        /// Obtiene todos los pagos, incluyendo la venta asociada.
        /// </summary>
        public async Task<IEnumerable<Payment>> GetAllPayments()
        {
            return await _context.Payments
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.client) // Incluir cliente de la venta
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.plan)   // Incluir plan de la venta
                                 .ToListAsync();
        }

        /// <summary>
        /// Obtiene un pago específico por su ID, incluyendo la venta asociada.
        /// </summary>
        public async Task<Payment?> GetPaymentById(int id_Payments)
        {
            Console.WriteLine($"[PaymentServices] Buscando pago con id_Payments: {id_Payments}");
            return await _context.Payments
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.plan)
                                 .FirstOrDefaultAsync(p => p.id_Payments == id_Payments);
        }

        /// <summary>
        /// Obtiene todos los pagos asociados a una venta específica.
        /// </summary>
        public async Task<IEnumerable<Payment>> GetPaymentsBySaleId(int id_Sales)
        {
            return await _context.Payments
                                 .Where(p => p.id_Sales == id_Sales)
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.lot)
                                 .Include(p => p.sale)
                                 .ThenInclude(s => s.plan)
                                 .ToListAsync();
        }

        /// <summary>
        /// Crea un nuevo pago y actualiza el recaudo total y la deuda de la venta asociada.
        /// </summary>
        public async Task<bool> CreatePayment(Payment payment)
        {
            try
            {
                // Asegurarse de que la fecha de pago esté establecida
                if (payment.payment_date == default(DateTime))
                {
                    payment.payment_date = DateTime.UtcNow; // O DateTime.Now si prefieres la hora local
                }

                // Obtener la venta asociada para actualizar sus valores
                var sale = await _saleServices.GetSaleById(payment.id_Sales);
                if (sale == null)
                {
                    throw new InvalidOperationException("La venta asociada no existe.");
                }

                if (!payment.amount.HasValue || payment.amount.Value <= 0)
                {
                    throw new ArgumentException("El monto del pago debe ser un valor positivo.");
                }

                // Actualizar total_raised y total_debt en la venta
                sale.total_raised = (sale.total_raised ?? 0) + payment.amount.Value;
                sale.total_debt = (sale.total_debt ?? 0) - payment.amount.Value;

                // Asegurarse de que total_debt no sea negativo
                if (sale.total_debt < 0)
                {
                    sale.total_debt = 0;
                }

                // Opcional: Actualizar el estado de la venta si la deuda es 0
                if (sale.total_debt == 0)
                {
                    sale.status = "Completed"; // ✅ Considera añadir 'Completed' al ENUM de Sale en la DB
                }
                else if (sale.status == "Pending") // Si tenías un estado "Pendiente" para la venta
                {
                    sale.status = "Active"; // O el estado que indique que la venta está en curso
                }


                _context.Payments.Add(payment);
                _context.Sales.Update(sale); // Marcar la venta para actualización

                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en CreatePayment: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        /// <summary>
        /// Actualiza un pago existente y ajusta el recaudo total y la deuda de la venta asociada.
        /// </summary>
        public async Task<bool> UpdatePayment(int id_Payments, Payment updatedPayment)
        {
            try
            {
                var existingPayment = await _context.Payments.AsNoTracking().FirstOrDefaultAsync(p => p.id_Payments == id_Payments);
                if (existingPayment == null) return false;

                if (id_Payments != updatedPayment.id_Payments)
                    throw new ArgumentException("El ID del pago en la URL no coincide con el ID del pago en el cuerpo de la solicitud.");

                if (!updatedPayment.amount.HasValue || updatedPayment.amount.Value <= 0)
                {
                    throw new ArgumentException("El monto del pago debe ser un valor positivo.");
                }

                // Obtener la venta asociada original y la nueva (si cambió)
                var oldSale = await _saleServices.GetSaleById(existingPayment.id_Sales);
                var newSale = await _saleServices.GetSaleById(updatedPayment.id_Sales);

                if (oldSale == null || newSale == null)
                {
                    throw new InvalidOperationException("La venta asociada al pago original o al pago actualizado no existe.");
                }

                // Revertir el monto del pago anterior de la venta original
                oldSale.total_raised = (oldSale.total_raised ?? 0) - (existingPayment.amount ?? 0);
                oldSale.total_debt = (oldSale.total_debt ?? 0) + (existingPayment.amount ?? 0);
                if (oldSale.total_raised < 0) oldSale.total_raised = 0; // Asegurar no negativos
                // Revertir estado si se completó y ahora tiene deuda
                if (oldSale.status == "Completed" && oldSale.total_debt > 0) oldSale.status = "Active"; // O el estado que corresponda

                // Aplicar el nuevo monto del pago a la venta (puede ser la misma o una nueva)
                newSale.total_raised = (newSale.total_raised ?? 0) + updatedPayment.amount.Value;
                newSale.total_debt = (newSale.total_debt ?? 0) - updatedPayment.amount.Value;
                if (newSale.total_debt < 0) newSale.total_debt = 0; // Asegurar no negativos
                // Actualizar estado si se completa
                if (newSale.total_debt == 0) newSale.status = "Completed";
                else if (newSale.status == "Pending") newSale.status = "Active";


                _context.Entry(existingPayment).CurrentValues.SetValues(updatedPayment); // Actualizar propiedades del pago
                _context.Sales.Update(oldSale); // Marcar venta original para actualización
                if (oldSale.id_Sales != newSale.id_Sales) // Si la venta cambió, marcar la nueva también
                {
                    _context.Sales.Update(newSale);
                }

                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en UpdatePayment: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        /// <summary>
        /// Elimina un pago y revierte el recaudo total y la deuda de la venta asociada.
        /// </summary>
        public async Task<bool> DeletePayment(int id_Payments)
        {
            try
            {
                var payment = await _context.Payments.FirstOrDefaultAsync(p => p.id_Payments == id_Payments);
                if (payment == null) return false;

                // Obtener la venta asociada para revertir sus valores
                var sale = await _saleServices.GetSaleById(payment.id_Sales);
                if (sale == null)
                {
                    // Esto no debería pasar si la integridad referencial está bien, pero es una precaución
                    throw new InvalidOperationException("La venta asociada al pago no existe.");
                }

                // Revertir total_raised y total_debt en la venta
                sale.total_raised = (sale.total_raised ?? 0) - (payment.amount ?? 0);
                sale.total_debt = (sale.total_debt ?? 0) + (payment.amount ?? 0);

                // Asegurarse de que total_raised no sea negativo
                if (sale.total_raised < 0)
                {
                    sale.total_raised = 0;
                }

                // Opcional: Actualizar el estado de la venta si ya no está completa
                if (sale.status == "Completed" && sale.total_debt > 0)
                {
                    sale.status = "Active"; // O el estado que indique que la venta está en curso
                }

                _context.Payments.Remove(payment);
                _context.Sales.Update(sale); // Marcar la venta para actualización

                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en DeletePayment: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }
    }
}
