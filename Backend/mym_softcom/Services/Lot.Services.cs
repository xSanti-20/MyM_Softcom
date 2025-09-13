using mym_softcom.Models;
using mym_softcom; // Asumiendo que AppDbContext está en este namespace
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace mym_softcom.Services
{
    public class LotServices
    {
        private readonly AppDbContext _context;

        public LotServices(AppDbContext context)
        {
            _context = context;
        }

        // Consultar todos los lotes
        public async Task<IEnumerable<Lot>> GetLots()
        {
            return await _context.Lots.Include(l => l.project).ToListAsync();
        }

        // Consultar lote por ID
        public async Task<Lot?> GetLotById(int id_Lots)
        {
            Console.WriteLine($"[LotServices] Buscando lote con id_Lots: {id_Lots}");
            return await _context.Lots.Include(l => l.project).FirstOrDefaultAsync(l => l.id_Lots == id_Lots);
        }

        // Crear un nuevo lote
        public async Task<bool> CreateLot(Lot lot)
        {
            try
            {
                // Opcional: Puedes establecer un estado inicial por defecto si no viene en la solicitud
                // lot.status = lot.status ?? "Disponible";
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

        // Actualizar un lote existente
        public async Task<bool> UpdateLot(int id_Lots, Lot updatedLot)
        {
            try
            {
                if (id_Lots != updatedLot.id_Lots)
                    throw new ArgumentException("El ID del lote en la URL no coincide con el ID del lote en el cuerpo de la solicitud.");

                var existingLot = await _context.Lots.AsNoTracking()
                                          .FirstOrDefaultAsync(l => l.id_Lots == id_Lots);

                if (existingLot == null) return false;

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

        // Eliminar un lote
        public async Task<bool> DeleteLot(int id_Lots)
        {
            try
            {
                var lot = await _context.Lots.FirstOrDefaultAsync(l => l.id_Lots == id_Lots);
                if (lot == null) return false;

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

        // Consultar lotes por ID de proyecto (foránea)
        public async Task<IEnumerable<Lot>> GetLotsByProject(int projectId)
        {
            Console.WriteLine($"[LotServices] Buscando lotes para el proyecto con ID: {projectId}");
            return await _context.Lots
                                 .Include(l => l.project)
                                 .Where(l => l.id_Projects == projectId)
                                 .ToListAsync();
        }

        // NUEVOS MÉTODOS AÑADIDOS:

        // Consultar solo lotes disponibles (ej. status == "Disponible")
        public async Task<IEnumerable<Lot>> GetAvailableLots()
        {
            return await _context.Lots
                                 .Include(l => l.project)
                                 .Where(l => l.status == "Disponible") // Asume que "Disponible" es el estado para lotes disponibles
                                 .ToListAsync();
        }

        // Cambiar el estado de un lote
        public async Task<bool> ChangeLotStatus(int id_Lots, string newStatus)
        {
            try
            {
                var lot = await _context.Lots.FirstOrDefaultAsync(l => l.id_Lots == id_Lots);
                if (lot == null) return false;

                lot.status = newStatus;
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

        // Buscar lotes por término (ej. por bloque o número de lote)
        public async Task<IEnumerable<Lot>> SearchLots(string searchTerm)
        {
            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                return await GetLots(); // Si no hay término de búsqueda, devuelve todos los lotes
            }

            searchTerm = searchTerm.ToLower();
            return await _context.Lots
                                 .Include(l => l.project)
                                 .Where(l => l.block.ToLower().Contains(searchTerm) ||
                                             l.lot_number.ToString().Contains(searchTerm) ||
                                             l.status.ToLower().Contains(searchTerm) ||
                                             (l.project != null && l.project.name.ToLower().Contains(searchTerm)))
                                 .ToListAsync();
        }

        // Obtener lotes para un select (Id, Bloque y Número de Lote, y Proyecto)
        public async Task<IEnumerable<object>> GetLotsForSelect(int? projectId = null)
        {
            var query = _context.Lots.AsQueryable();

            if (projectId.HasValue && projectId.Value > 0)
            {
                query = query.Where(l => l.id_Projects == projectId.Value);
            }

            return await query
                .Include(l => l.project) // Asegúrate de incluir el proyecto para acceder a su nombre
                .OrderBy(l => l.block)
                .ThenBy(l => l.lot_number)
                .Select(l => new
                {
                    Id_Lots = l.id_Lots,
                    Display = $"{l.block}-{l.lot_number} (Proyecto: {l.project.name})" // Combinar información
                })
                .ToListAsync();
        }

        // Contador de lotes por proyecto
        public async Task<object> GetLotStatsByProject(int projectId)
        {
            var lots = await _context.Lots
                                     .Where(l => l.id_Projects == projectId)
                                     .ToListAsync();

            int total = lots.Count;
            int vendidos = lots.Count(l => l.status == "Vendido");
            int disponibles = lots.Count(l => l.status == "Disponible" || l.status == "Libre");

            return new
            {
                ProjectId = projectId,
                Total = total,
                Vendidos = vendidos,
                Disponibles = disponibles
            };
        }

        // Si quieres todos los proyectos con su resumen:
        public async Task<IEnumerable<object>> GetAllLotStats()
        {
            return await _context.Lots
                .GroupBy(l => l.id_Projects)
                .Select(g => new
                {
                    ProjectId = g.Key,
                    Total = g.Count(),
                    Vendidos = g.Count(l => l.status == "Vendido"),
                    Disponibles = g.Count(l => l.status == "Disponible" || l.status == "Libre")
                })
                .ToListAsync();
        }

    }
}
