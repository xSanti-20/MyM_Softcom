using API_PESO_PIG.Models;
using Microsoft.EntityFrameworkCore;

namespace API_PESO_PIG.Services
{
    public class EntriesServices
    {
        private readonly AppDbContext _context;
        private const int BULTO_TO_KG = 40; // Constante de conversión: 1 BULTO = 40KG

        public EntriesServices(AppDbContext context)
        {
            _context = context;
        }

        // Obtener todas las entradas
        public IEnumerable<Entries> GetEntries()
        {
            return _context.Entries
                .Include(p => p.food).ToList();
        }

        // Obtener una entrada por ID
        public async Task<Entries> GetEntriesById(int id_Entries)
        {
            try
            {
                return await _context.Entries.FirstOrDefaultAsync(x => x.id_Entries == id_Entries);
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        // Agregar una nueva entrada y actualizar existencia del alimento
        public void Add(Entries entity)
        {
            // Agrega la entrada
            _context.Entries.Add(entity);

            // Buscar el alimento relacionado
            var food = _context.Foods.FirstOrDefault(f => f.id_Food == entity.id_Food);
            if (food != null)
            {
                // Convertir bultos a KG y sumar a la existencia del alimento (ahora float)
                float kgAmount = entity.Can_Food * BULTO_TO_KG;
                food.Existence += kgAmount;

                // Marcar como modificado
                _context.Foods.Update(food);
            }

            // Guardar cambios
            _context.SaveChanges();
        }

        // Eliminar una entrada por ID
        public async Task<bool> DelEntries(int id_Entries)
        {
            try
            {
                var entries = await _context.Entries.FindAsync(id_Entries);
                if (entries != null)
                {
                    // Buscar el alimento relacionado
                    var food = await _context.Foods.FirstOrDefaultAsync(f => f.id_Food == entries.id_Food);
                    if (food != null)
                    {
                        // Convertir bultos a KG y restar de la existencia (ahora float)
                        float kgAmount = entries.Can_Food * BULTO_TO_KG;
                        food.Existence -= kgAmount;
                        _context.Foods.Update(food);
                    }

                    _context.Entries.Remove(entries);
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

        // Actualizar una entrada existente por ID y ajustar la existencia del alimento
        public async Task<bool> UpdateEntries(int id_Entries, Entries updatedEntries)
        {
            try
            {
                if (id_Entries != updatedEntries.id_Entries)
                {
                    throw new ArgumentException("El ID de la entrada no coincide.");
                }

                var existingEntries = await _context.Entries.AsNoTracking()
                    .FirstOrDefaultAsync(c => c.id_Entries == id_Entries);

                if (existingEntries == null)
                {
                    return false;
                }

                // Obtenemos el alimento original y el alimento actualizado
                var foodBefore = await _context.Foods.FirstOrDefaultAsync(f => f.id_Food == existingEntries.id_Food);
                var foodAfter = await _context.Foods.FirstOrDefaultAsync(f => f.id_Food == updatedEntries.id_Food);

                if (foodBefore != null && foodAfter != null)
                {
                    // Convertir bultos a KG (ahora float)
                    float kgAmountBefore = existingEntries.Can_Food * BULTO_TO_KG;
                    float kgAmountAfter = updatedEntries.Can_Food * BULTO_TO_KG;

                    // Restamos la cantidad original del alimento (en KG)
                    foodBefore.Existence -= kgAmountBefore;

                    // Sumamos la nueva cantidad de la entrada (en KG)
                    foodAfter.Existence += kgAmountAfter;

                    // Actualizamos las existencias de ambos alimentos
                    _context.Foods.Update(foodBefore);
                    _context.Foods.Update(foodAfter);
                }

                // Actualizar la entrada con los nuevos datos
                _context.Entries.Update(updatedEntries);
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
