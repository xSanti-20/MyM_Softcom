using API_PESO_PIG.Models;
using Microsoft.EntityFrameworkCore;

namespace API_PESO_PIG.Services
{
    public class FoodServices
    {
        private readonly AppDbContext _context;
        private const float STOCK_MIN_THRESHOLD = 100.0f; // Umbral mínimo en float

        public FoodServices(AppDbContext context)
        {
            _context = context;
        }

        // Obtener todos los Foods
        public IEnumerable<Food> GetFoods()
        {
            return _context.Foods
                .Include(p => p.stage).ToList();
        }

        // Obtener Foods con stock bajo
        public IEnumerable<Food> GetLowStockFoods()
        {
            return _context.Foods
                .Include(p => p.stage)
                .Where(f => f.Existence < STOCK_MIN_THRESHOLD)
                .ToList();
        }

        // Obtener un Food por ID
        public async Task<Food> GetFoodById(int id_Food)
        {
            try
            {
                return await _context.Foods.FirstOrDefaultAsync(x => x.id_Food == id_Food);
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        // Agregar un nuevo Food
        public void Add(Food entity)
        {
            // Asegurarse de que la unidad de medida sea KG
            entity.Und_Extent = "KG";

            _context.Foods.Add(entity);
            _context.SaveChanges();
        }

        // Eliminar un Food por ID
        public async Task<bool> DelFood(int id_Food)
        {
            try
            {
                var food = await _context.Foods.FindAsync(id_Food);
                if (food != null)
                {
                    _context.Foods.Remove(food);
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

        // Actualizar un Food existente por ID
        public async Task<bool> UpdateFood(int id_Food, Food updatedFood)
        {
            try
            {
                if (id_Food != updatedFood.id_Food)
                {
                    throw new ArgumentException("El ID del Food no coincide.");
                }
                var existingFood = await _context.Foods.AsNoTracking().FirstOrDefaultAsync(f => f.id_Food == id_Food);
                if (existingFood == null)
                {
                    return false;
                }

                // Asegurarse de que la unidad de medida sea KG
                updatedFood.Und_Extent = "KG";

                _context.Foods.Attach(updatedFood);
                _context.Entry(updatedFood).State = EntityState.Modified;

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
