using API_PESO_PIG.Models;
using Microsoft.EntityFrameworkCore;

namespace API_PESO_PIG.Services
{
    public class CorralServices
    {
        private readonly AppDbContext _context;

        public CorralServices(AppDbContext context)
        {
            _context = context;
        }

        public IEnumerable<Corral> GetCorrals()
        {
            return _context.Corrals.ToList();
        }

        // Método mejorado para obtener corrales con información calculada
        public IEnumerable<object> GetCorralsWithWeightInfo()
        {
            var corrals = _context.Corrals.ToList();
            var result = new List<object>();

            foreach (var corral in corrals)
            {
                var pigletsInCorral = _context.Piglets
                    .Where(p => p.Id_Corral == corral.id_Corral)
                    .ToList();

                var numberOfAnimals = pigletsInCorral.Count;
                float averageWeight = 0;

                if (numberOfAnimals > 0)
                {
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

                    averageWeight = currentWeights.Any() ? currentWeights.Average() : 0;
                }

                result.Add(new
                {
                    id_Corral = corral.id_Corral,
                    des_Corral = corral.Des_Corral,
                    tot_Animal = corral.Tot_Animal,
                    tot_Pesaje = corral.Tot_Pesaje,
                    est_Corral = corral.Est_Corral,
                    numberOfAnimals = numberOfAnimals,
                    averageWeight = Math.Round(averageWeight, 2)
                });
            }

            return result;
        }

        public async Task<Corral> GetCorralById(int id_Corral)
        {
            return await _context.Corrals.FirstOrDefaultAsync(x => x.id_Corral == id_Corral);
        }

        public async Task<object> GetCorralWithWeightInfoById(int id_Corral)
        {
            var corral = await _context.Corrals.FirstOrDefaultAsync(x => x.id_Corral == id_Corral);
            if (corral == null) return null;

            var pigletsInCorral = await _context.Piglets
                .Where(p => p.Id_Corral == id_Corral)
                .ToListAsync();

            var numberOfAnimals = pigletsInCorral.Count;
            float averageWeight = 0;

            if (numberOfAnimals > 0)
            {
                var currentWeights = new List<float>();

                foreach (var piglet in pigletsInCorral)
                {
                    var lastWeighing = await _context.Weighings
                        .Where(w => w.Id_Piglet == piglet.Id_Piglet)
                        .OrderByDescending(w => w.Fec_Weight)
                        .FirstOrDefaultAsync();

                    float currentWeight = lastWeighing?.Weight_Current ?? piglet.Weight_Initial;
                    currentWeights.Add(currentWeight);
                }

                averageWeight = currentWeights.Average();
            }

            return new
            {
                id_Corral = corral.id_Corral,
                des_Corral = corral.Des_Corral,
                tot_Animal = corral.Tot_Animal,
                tot_Pesaje = corral.Tot_Pesaje,
                est_Corral = corral.Est_Corral,
                numberOfAnimals = numberOfAnimals,
                averageWeight = Math.Round(averageWeight, 2)
            };
        }

        public void Add(Corral entity)
        {
            entity.Est_Corral = "libre";
            _context.Corrals.Add(entity);
            _context.SaveChanges();
        }

        public async Task<bool> DelCorral(int id_Corral)
        {
            var corral = await _context.Corrals.FindAsync(id_Corral);
            if (corral != null)
            {
                _context.Corrals.Remove(corral);
                await _context.SaveChangesAsync();
                return true;
            }
            return false;
        }

        public async Task<bool> UpdateCorral(int id_Corral, Corral updatedCorral)
        {
            if (id_Corral != updatedCorral.id_Corral)
                throw new ArgumentException("El ID del corral no coincide.");

            var existing = await _context.Corrals.AsNoTracking().FirstOrDefaultAsync(c => c.id_Corral == id_Corral);
            if (existing == null)
                return false;

            _context.Corrals.Attach(updatedCorral);
            _context.Entry(updatedCorral).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return true;
        }

        // ✅ Método corregido para evitar error de conversión
        public async Task UpdateCorralAverageWeight(int corralId)
        {
            var corral = await _context.Corrals.FirstOrDefaultAsync(c => c.id_Corral == corralId);
            if (corral == null) return;

            var pigletsInCorral = await _context.Piglets
                .Where(p => p.Id_Corral == corralId)
                .ToListAsync();

            if (pigletsInCorral.Any())
            {
                var currentWeights = new List<float>();

                foreach (var piglet in pigletsInCorral)
                {
                    var lastWeighing = await _context.Weighings
                        .Where(w => w.Id_Piglet == piglet.Id_Piglet)
                        .OrderByDescending(w => w.Fec_Weight)
                        .FirstOrDefaultAsync();

                    float currentWeight = lastWeighing?.Weight_Current ?? piglet.Weight_Initial;
                    currentWeights.Add(currentWeight);
                }

                float averageWeight = currentWeights.Average();
                corral.Tot_Pesaje = (float)Math.Round(averageWeight, 2);

                await _context.SaveChangesAsync();
            }
        }
    }
}
