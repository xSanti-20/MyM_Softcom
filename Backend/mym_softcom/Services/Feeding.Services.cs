using API_PESO_PIG.Models;
using Microsoft.EntityFrameworkCore;

namespace API_PESO_PIG.Services
{
    public class FeedingServices
    {
        private readonly AppDbContext _context;
        private readonly ILogger<FeedingServices> _logger;

        public FeedingServices(AppDbContext context, ILogger<FeedingServices> logger)
        {
            _context = context;
            _logger = logger;
        }

        public IEnumerable<object> GetFeedings()
        {
            var feedings = _context.Feedings
                .Include(p => p.user)
                .Include(p => p.Corral)
                .Include(p => p.food)
                .ToList();

            return feedings.Select(f => new
            {
                id_Feeding = f.id_Feeding,
                can_Food = f.Can_Food,
                sum_Food = f.Sum_Food,
                obc_Feeding = f.Obc_Feeding,
                dat_Feeding = f.Dat_Feeding,
                id_Users = f.id_Users,
                id_Corral = f.id_Corral,
                id_Food = f.id_Food,
                nom_Users = f.user?.Nom_Users,
                des_Corral = f.Corral?.Des_Corral,
                nam_Food = f.food?.Nam_Food,
                numberOfAnimals = GetAnimalsCountInCorral(f.id_Corral),
                averageWeight = GetCorralAverageWeight(f.id_Corral)
            });
        }

        public async Task<Feeding> GetFeedingById(int id_Feeding)
        {
            try
            {
                return await _context.Feedings.FirstOrDefaultAsync(x => x.id_Feeding == id_Feeding);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener feeding por ID: {Id}", id_Feeding);
                throw;
            }
        }

        public async Task<int> GetNumberOfAnimalsInCorral(int corralId)
        {
            return await _context.Piglets.CountAsync(p => p.Id_Corral == corralId);
        }

        public async Task<bool> Add(Feeding entity)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var user = await _context.Users.FindAsync(entity.id_Users)
                    ?? throw new InvalidOperationException($"El usuario con ID {entity.id_Users} no existe.");

                var corral = await _context.Corrals.FindAsync(entity.id_Corral)
                    ?? throw new InvalidOperationException($"El corral con ID {entity.id_Corral} no existe.");

                var food = await _context.Foods.FindAsync(entity.id_Food)
                    ?? throw new InvalidOperationException($"El alimento con ID {entity.id_Food} no existe.");

                int numberOfAnimals = await GetNumberOfAnimalsInCorral(entity.id_Corral);
                if (numberOfAnimals <= 0)
                    throw new InvalidOperationException($"El corral {corral.Des_Corral} no tiene animales asignados.");

                entity.Sum_Food = entity.Can_Food * numberOfAnimals;

                if (food.Existence < entity.Sum_Food)
                    throw new InvalidOperationException($"Stock insuficiente. Disponible: {food.Existence:F2} kg, Necesario: {entity.Sum_Food:F2} kg.");

                food.Existence -= entity.Sum_Food;
                _context.Foods.Update(food);

                _context.Feedings.Add(entity);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al agregar feeding");
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> DelFeeding(int id_Feeding)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var feeding = await _context.Feedings.FindAsync(id_Feeding);
                if (feeding != null)
                {
                    var food = await _context.Foods.FirstOrDefaultAsync(f => f.id_Food == feeding.id_Food);
                    if (food != null)
                    {
                        food.Existence += feeding.Sum_Food;
                        _context.Foods.Update(food);
                    }

                    _context.Feedings.Remove(feeding);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al eliminar feeding");
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> UpdateFeeding(int id_Feeding, Feeding updatedFeeding)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (id_Feeding != updatedFeeding.id_Feeding)
                    throw new ArgumentException("El ID del Feeding no coincide.");

                var existingFeeding = await _context.Feedings.AsNoTracking()
                    .FirstOrDefaultAsync(f => f.id_Feeding == id_Feeding);
                if (existingFeeding == null) return false;

                var originalFood = await _context.Foods.FirstOrDefaultAsync(f => f.id_Food == existingFeeding.id_Food);
                if (originalFood != null)
                {
                    originalFood.Existence += existingFeeding.Sum_Food;
                    _context.Foods.Update(originalFood);
                }

                int numberOfAnimals = await GetNumberOfAnimalsInCorral(updatedFeeding.id_Corral);
                updatedFeeding.Sum_Food = updatedFeeding.Can_Food * numberOfAnimals;

                var newFood = await _context.Foods.FirstOrDefaultAsync(f => f.id_Food == updatedFeeding.id_Food);
                if (newFood != null)
                {
                    if (newFood.Existence < updatedFeeding.Sum_Food)
                        throw new InvalidOperationException($"Stock insuficiente. Disponible: {newFood.Existence:F2} kg, Necesario: {updatedFeeding.Sum_Food:F2} kg.");

                    newFood.Existence -= updatedFeeding.Sum_Food;
                    _context.Foods.Update(newFood);
                }

                _context.Feedings.Update(updatedFeeding);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al actualizar feeding");
                await transaction.RollbackAsync();
                throw;
            }
        }

        // ✅ CORREGIDO para usar float
        private double GetCorralAverageWeight(int corralId)
        {
            var pigletsInCorral = _context.Piglets
                .Where(p => p.Id_Corral == corralId)
                .ToList();

            if (!pigletsInCorral.Any()) return 0;

            var currentWeights = new List<float>();

            foreach (var piglet in pigletsInCorral)
            {
                var lastWeighing = _context.Weighings
                    .Where(w => w.Id_Piglet == piglet.Id_Piglet)
                    .OrderByDescending(w => w.Fec_Weight)
                    .FirstOrDefault();

                float currentWeight = lastWeighing?.Weight_Current ?? piglet.Weight_Initial;
                currentWeights.Add(currentWeight);
            }

            return currentWeights.Any() ? Math.Round(currentWeights.Average(), 2) : 0;
        }

        private int GetAnimalsCountInCorral(int corralId)
        {
            return _context.Piglets.Count(p => p.Id_Corral == corralId);
        }
    }
}
