using mym_softcom.Models;
using mym_softcom; // Asumiendo que AppDbContext está en este namespace
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace mym_softcom.Services
{
    public class LotServices
    {
        private readonly AppDbContext _context;

        public LotServices(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Lot>> GetLots()
        {
            return await _context.Lots
                .Include(l => l.Project)
                .ToListAsync();
        }

        public async Task<IEnumerable<Lot>> GetAvailableLots()
        {
            return await _context.Lots
                .Include(l => l.Project)
                .Where(l => l.Status == "Libre")
                .ToListAsync();
        }

        public async Task<IEnumerable<Lot>> GetLotsByProject(int projectId)
        {
            return await _context.Lots
                .Include(l => l.Project)
                .Where(l => l.Id_Projects == projectId)
                .ToListAsync();
        }

        public async Task<Lot?> GetLotById(int id_Lot)
        {
            return await _context.Lots
                .Include(l => l.Project)
                .FirstOrDefaultAsync(x => x.Id_Lots == id_Lot);
        }

        public async Task<bool> CreateLot(Lot lot)
        {
            try
            {
                var project = await _context.Projects.FindAsync(lot.Id_Projects);
                if (project == null) throw new InvalidOperationException("Proyecto no encontrado.");

                lot.Status = "Libre";
                _context.Lots.Add(lot);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en CreateLot: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> UpdateLot(int id_Lot, Lot updatedLot)
        {
            try
            {
                if (id_Lot != updatedLot.Id_Lots)
                    throw new ArgumentException("El ID del lote no coincide.");

                var existing = await _context.Lots.AsNoTracking()
                    .FirstOrDefaultAsync(l => l.Id_Lots == id_Lot);

                if (existing == null) return false;

                updatedLot.Id_Projects = existing.Id_Projects;

                _context.Lots.Update(updatedLot);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en UpdateLot: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> ChangeLotStatus(int id_Lot, string newStatus)
        {
            try
            {
                var lot = await _context.Lots.FindAsync(id_Lot);
                if (lot == null) return false;

                if (newStatus != "Libre" && newStatus != "Vendido")
                {
                    throw new InvalidOperationException("Estado no válido. Solo se permite 'Libre' o 'Vendido'.");
                }

                lot.Status = newStatus;
                _context.Lots.Update(lot);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en ChangeLotStatus: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> DeleteLot(int id_Lot)
        {
            try
            {
                var lot = await _context.Lots
                    .Include(l => l.Sales)
                    .FirstOrDefaultAsync(l => l.Id_Lots == id_Lot);

                if (lot == null) return false;

                if (lot.Sales != null && lot.Sales.Any())
                {
                    throw new InvalidOperationException("No se puede eliminar un lote que tiene ventas asociadas.");
                }

                _context.Lots.Remove(lot);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en DeleteLot: {ex.Message}");
                throw;
            }
        }

        public async Task<IEnumerable<Lot>> SearchLots(string searchTerm)
        {
            if (string.IsNullOrEmpty(searchTerm))
                return await Task.FromResult(new List<Lot>());

            return await _context.Lots
                .Include(l => l.Project)
                .Where(l => (l.Block != null && l.Block.Contains(searchTerm)) ||
                           l.Lot_Number.ToString().Contains(searchTerm) ||
                           l.Status.Contains(searchTerm) ||
                           (l.Project != null && l.Project.name.Contains(searchTerm)))
                .ToListAsync();
        }

        public async Task<IEnumerable<object>> GetLotsForSelect(int? projectId = null)
        {
            var query = _context.Lots
                .Include(l => l.Project)
                .Where(l => l.Status == "Libre");

            if (projectId.HasValue)
            {
                query = query.Where(l => l.Id_Projects == projectId.Value);
            }

            return await query
                .OrderBy(l => l.Project != null ? l.Project.name : "")
                .ThenBy(l => l.Block)
                .ThenBy(l => l.Lot_Number)
                .Select(l => new
                {
                    Id_Lots = l.Id_Lots,
                    Description = $"{(l.Project != null ? l.Project.name : "N/A")} - Bloque {(l.Block ?? "N/A")} - Lote {(l.Lot_Number ?? 0)}"
                })
                .ToListAsync();
        }
    }
}