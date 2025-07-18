using mym_softcom.Models;
using mym_softcom; // Asumiendo que AppDbContext está en este namespace
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace mym_softcom.Services
{
    public class PaymentServices
    {
        private readonly AppDbContext _context;

        public PaymentServices(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Payment>> GetPayments()
        {
            return await _context.Payments
                .Include(p => p.Sale)
                    .ThenInclude(s => s.Client)
                .ToListAsync();
        }

        public async Task<Payment?> GetPaymentById(int id_Payment)
        {
            return await _context.Payments
                .Include(p => p.Sale)
                    .ThenInclude(s => s.Client)
                .FirstOrDefaultAsync(x => x.Id_Payments == id_Payment);
        }

        public async Task<bool> CreatePayment(Payment payment)
        {
            try
            {
                var sale = await _context.Sales.FindAsync(payment.Id_Sales);
                if (sale == null) throw new InvalidOperationException("Venta no encontrada.");

                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();

                sale.Total_Raised += payment.Amount;
                _context.Sales.Update(sale);
                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en CreatePayment: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> UpdatePayment(int id_Payment, Payment updatedPayment)
        {
            try
            {
                if (id_Payment != updatedPayment.Id_Payments)
                    throw new ArgumentException("El ID del pago no coincide.");

                var existing = await _context.Payments.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id_Payments == id_Payment);

                if (existing == null) return false;

                var oldAmount = existing.Amount;
                var sale = await _context.Sales.FindAsync(existing.Id_Sales);
                if (sale != null)
                {
                    sale.Total_Raised -= oldAmount;
                    sale.Total_Raised += updatedPayment.Amount;
                    _context.Sales.Update(sale);
                }

                _context.Payments.Update(updatedPayment);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en UpdatePayment: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> DeletePayment(int id_Payment)
        {
            try
            {
                var payment = await _context.Payments.FindAsync(id_Payment);
                if (payment == null) return false;

                var sale = await _context.Sales.FindAsync(payment.Id_Sales);
                if (sale != null)
                {
                    sale.Total_Raised -= payment.Amount;
                    _context.Sales.Update(sale);
                }

                _context.Payments.Remove(payment);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en DeletePayment: {ex.Message}");
                throw;
            }
        }

        public async Task<IEnumerable<Payment>> SearchPayments(string searchTerm)
        {
            if (string.IsNullOrEmpty(searchTerm))
                return await Task.FromResult(new List<Payment>());

            return await _context.Payments
                .Include(p => p.Sale)
                    .ThenInclude(s => s.Client)
                .Where(p => p.Payment_Method.Contains(searchTerm) ||
                           (p.Reference_Month != null && p.Reference_Month.Contains(searchTerm)) ||
                           (p.Observation != null && p.Observation.Contains(searchTerm)) ||
                           p.Amount.ToString().Contains(searchTerm) ||
                           (p.Sale != null && p.Sale.Client != null && (p.Sale.Client.names.Contains(searchTerm) || p.Sale.Client.surnames.Contains(searchTerm))))
                .ToListAsync();
        }
    }
}