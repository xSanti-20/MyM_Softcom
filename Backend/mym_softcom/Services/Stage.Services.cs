using API_PESO_PIG.Models;
using Microsoft.EntityFrameworkCore;

namespace API_PESO_PIG.Services
{
    public class StageServices
    {
        private readonly AppDbContext _context;
        public StageServices(AppDbContext context)
        {
            _context = context;
        }

        // Obtener todas las etapas
        public IEnumerable<Stage> GetStages()
        {
            return _context.Stages.ToList();
        }

        // Obtener etapa por ID
        public async Task<Stage> GetStageId(int id_Stage)
        {
            try
            {
                return await _context.Stages.FirstOrDefaultAsync(x => x.id_Stage == id_Stage);
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        // Agregar nueva etapa
        public void Add(Stage entity)
        {
            _context.Stages.Add(entity);
            _context.SaveChanges();
        }

        // Eliminar etapa por ID
        public async Task<bool> DelStage(int id_Stage)
        {
            try
            {
                var stage = await _context.Stages.FindAsync(id_Stage);
                if (stage != null)
                {
                    _context.Stages.Remove(stage);
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

        // Actualizar etapa
        public async Task<bool> UpdateStage(int id_Stage, Stage updatedStage)
        {
            try
            {
                if (id_Stage != updatedStage.id_Stage)
                {
                    throw new ArgumentException("El ID de la etapa no coincide.");
                }
                var existingStage = await _context.Stages.AsNoTracking().FirstOrDefaultAsync(u => u.id_Stage == id_Stage);
                if (existingStage == null)
                {
                    return false;
                }
                _context.Stages.Attach(updatedStage);
                _context.Entry(updatedStage).State = EntityState.Modified;

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
