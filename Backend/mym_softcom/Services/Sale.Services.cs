using mym_softcom.Models;
using mym_softcom; // Asumiendo que AppDbContext está en este namespace
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace mym_softcom.Services
{
    public class SaleServices
    {
        private readonly AppDbContext _context;

        public SaleServices(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Sale>> GetSales()
        {
            return await _context.Sales
                .Include(s => s.Client)
                .Include(s => s.Lot)
                    .ThenInclude(l => l.Project)
                .Include(s => s.User)
                .Include(s => s.Plan)
                .ToListAsync();
        }

        public async Task<Sale?> GetSaleById(int id_Sale)
        {
            return await _context.Sales
                .Include(s => s.Client)
                .Include(s => s.Lot)
                    .ThenInclude(l => l.Project)
                .Include(s => s.User)
                .Include(s => s.Plan)
                .FirstOrDefaultAsync(x => x.Id_Sales == id_Sale);
        }

        public async Task<bool> CreateSale(Sale sale)
        {
            try
            {
                var client = await _context.Clients.FindAsync(sale.Id_Clients);
                if (client == null) throw new InvalidOperationException("Cliente no encontrado.");

                var lot = await _context.Lots.FindAsync(sale.Id_Lots);
                if (lot == null) throw new InvalidOperationException("Lote no encontrado.");
                if (lot.Status == "Vendido") throw new InvalidOperationException("El lote ya está vendido.");

                var user = await _context.Users.FindAsync(sale.Id_Users);
                if (user == null) throw new InvalidOperationException("Usuario no encontrado.");

                var plan = await _context.Plans.FindAsync(sale.Id_Plans);
                if (plan == null) throw new InvalidOperationException("Plan de financiación no encontrado.");

                sale.Status = "active";
                sale.Total_Raised = sale.Initial_Payment;

                lot.Status = "Vendido";
                _context.Lots.Update(lot);

                _context.Sales.Add(sale);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en CreateSale: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> UpdateSale(int id_Sale, Sale updatedSale)
        {
            try
            {
                if (id_Sale != updatedSale.Id_Sales)
                    throw new ArgumentException("El ID de la venta no coincide.");

                var existing = await _context.Sales.AsNoTracking()
                    .FirstOrDefaultAsync(s => s.Id_Sales == id_Sale);

                if (existing == null) return false;

                var client = await _context.Clients.FindAsync(updatedSale.Id_Clients);
                if (client == null) throw new InvalidOperationException("Cliente no encontrado.");

                var lot = await _context.Lots.FindAsync(updatedSale.Id_Lots);
                if (lot == null) throw new InvalidOperationException("Lote no encontrado.");

                var user = await _context.Users.FindAsync(updatedSale.Id_Users);
                if (user == null) throw new InvalidOperationException("Usuario no encontrado.");

                var plan = await _context.Plans.FindAsync(updatedSale.Id_Plans);
                if (plan == null) throw new InvalidOperationException("Plan de financiación no encontrado.");

                _context.Sales.Update(updatedSale);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en UpdateSale: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> DeleteSale(int id_Sale)
        {
            try
            {
                var sale = await _context.Sales
                    .Include(s => s.Payments)
                    .Include(s => s.Withdrawals)
                    .Include(s => s.Lot)
                    .FirstOrDefaultAsync(s => s.Id_Sales == id_Sale);

                if (sale == null) return false;

                if (sale.Payments != null && sale.Payments.Any())
                {
                    throw new InvalidOperationException("No se puede eliminar una venta que tiene pagos registrados.");
                }
                if (sale.Withdrawals != null && sale.Withdrawals.Any())
                {
                    throw new InvalidOperationException("No se puede eliminar una venta que tiene desistimientos registrados.");
                }

                if (sale.Lot != null)
                {
                    sale.Lot.Status = "Libre";
                    _context.Lots.Update(sale.Lot);
                }

                _context.Sales.Remove(sale);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en DeleteSale: {ex.Message}");
                throw;
            }
        }

        public async Task<IEnumerable<Sale>> SearchSales(string searchTerm)
        {
            if (string.IsNullOrEmpty(searchTerm))
                return await Task.FromResult(new List<Sale>());

            return await _context.Sales
                .Include(s => s.Client)
                .Include(s => s.Lot)
                    .ThenInclude(l => l.Project)
                .Include(s => s.User)
                .Include(s => s.Plan)
                .Where(s => (s.Client != null && (s.Client.names.Contains(searchTerm) || s.Client.surnames.Contains(searchTerm))) ||
                           (s.Lot != null && s.Lot.Block != null && s.Lot.Block.Contains(searchTerm)) ||
                           (s.Lot != null && s.Lot.Lot_Number.ToString().Contains(searchTerm)) ||
                           (s.Lot != null && s.Lot.Project != null && s.Lot.Project.name.Contains(searchTerm)) ||
                           s.Status.Contains(searchTerm) ||
                           s.Total_Value.ToString().Contains(searchTerm))
                .ToListAsync();
        }

        public async Task<IEnumerable<object>> GetSalesForSelect(int? clientId = null)
        {
            var query = _context.Sales
                .Include(s => s.Client)
                .Include(s => s.Lot)
                    .ThenInclude(l => l.Project)
                .Where(s => s.Status == "active");

            if (clientId.HasValue)
            {
                query = query.Where(s => s.Id_Clients == clientId.Value);
            }

            return await query
                .OrderBy(s => s.Client != null ? s.Client.names : "")
                .ThenBy(s => s.Lot != null && s.Lot.Project != null ? s.Lot.Project.name : "")
                .Select(s => new
                {
                    Id_Sales = s.Id_Sales,
                    Description = $"{(s.Client != null ? s.Client.names + " " + s.Client.surnames : "N/A")} - " +
                                  $"{(s.Lot != null && s.Lot.Project != null ? s.Lot.Project.name : "N/A")} - " +
                                  $"Lote {(s.Lot != null ? s.Lot.Lot_Number : 0)} (Valor: {s.Total_Value:C0})"
                })
                .ToListAsync();
        }
    }
}