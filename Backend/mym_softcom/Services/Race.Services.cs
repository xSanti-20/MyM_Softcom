using API_PESO_PIG.Models;
using Microsoft.EntityFrameworkCore;

namespace API_PESO_PIG.Services
{
    public class RaceServices
    {
        private readonly AppDbContext _context;
        public RaceServices(AppDbContext context)
        {
            _context = context;
        }

        // Obtener todas las razas
        public IEnumerable<Race> GetRaces()
        {
            return _context.Races.ToList();
        }

        // Obtener raza por ID
        public async Task<Race> GetRaceId(int id_Race)
        {
            try
            {
                return await _context.Races.FirstOrDefaultAsync(x => x.id_Race == id_Race);
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        // Agregar nueva raza
        public void Add(Race entity)
        {
            _context.Races.Add(entity);
            _context.SaveChanges();
        }

        // Eliminar raza por ID
        public async Task<bool> DelRace(int id_Race)
        {
            try
            {
                var race = await _context.Races.FindAsync(id_Race);
                if (race != null)
                {
                    _context.Races.Remove(race);
                    await _context.SaveChangesAsync();
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        // Actualizar raza
        public async Task<bool> UpdateRace(int id_Race, Race updatedRace)
        {
            try
            {
                if (id_Race != updatedRace.id_Race)
                {
                    throw new ArgumentException("El ID de la raza no coincide.");
                }
                var existingRace = await _context.Races.AsNoTracking().FirstOrDefaultAsync(u => u.id_Race == id_Race);
                if (existingRace == null)
                {
                    return false;
                }
                _context.Races.Attach(updatedRace);
                _context.Entry(updatedRace).State = EntityState.Modified;

                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                throw;
            }
        }
    }
}
