using mym_softcom.Models;
using mym_softcom; // Asumiendo que AppDbContext está en este namespace
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace mym_softcom.Services
{
    public class WithdrawalServices
    {
        private readonly AppDbContext _context;

        public WithdrawalServices(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Withdrawal>> GetWithdrawals()
        {
            return await _context.Withdrawals
                .Include(w => w.Sale)
                    .ThenInclude(s => s.Client)
                .ToListAsync();
        }

        public async Task<Withdrawal?> GetWithdrawalById(int id_Withdrawal)
        {
            return await _context.Withdrawals
                .Include(w => w.Sale)
                    .ThenInclude(s => s.Client)
                .FirstOrDefaultAsync(x => x.Id_Withdrawals == id_Withdrawal);
        }

        public async Task<bool> CreateWithdrawal(Withdrawal withdrawal)
        {
            try
            {
                var sale = await _context.Sales.FindAsync(withdrawal.Id_Sales);
                if (sale == null) throw new InvalidOperationException("Venta no encontrada.");

                _context.Withdrawals.Add(withdrawal);
                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en CreateWithdrawal: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> UpdateWithdrawal(int id_Withdrawal, Withdrawal updatedWithdrawal)
        {
            try
            {
                if (id_Withdrawal != updatedWithdrawal.Id_Withdrawals)
                    throw new ArgumentException("El ID del desistimiento no coincide.");

                var existing = await _context.Withdrawals.AsNoTracking()
                    .FirstOrDefaultAsync(w => w.Id_Withdrawals == id_Withdrawal);

                if (existing == null) return false;

                _context.Withdrawals.Update(updatedWithdrawal);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en UpdateWithdrawal: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> DeleteWithdrawal(int id_Withdrawal)
        {
            try
            {
                var withdrawal = await _context.Withdrawals.FindAsync(id_Withdrawal);
                if (withdrawal == null) return false;

                _context.Withdrawals.Remove(withdrawal);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en DeleteWithdrawal: {ex.Message}");
                throw;
            }
        }

        public async Task<IEnumerable<Withdrawal>> SearchWithdrawals(string searchTerm)
        {
            if (string.IsNullOrEmpty(searchTerm))
                return await Task.FromResult(new List<Withdrawal>());

            return await _context.Withdrawals
                .Include(w => w.Sale)
                    .ThenInclude(s => s.Client)
                .Where(w => w.Reason.Contains(searchTerm) ||
                           w.Penalty.ToString().Contains(searchTerm) ||
                           (w.Sale != null && w.Sale.Client != null && (w.Sale.Client.names.Contains(searchTerm) || w.Sale.Client.surnames.Contains(searchTerm))))
                .ToListAsync();
        }
    }
}