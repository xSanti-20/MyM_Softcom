using API_PESO_PIG.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API_PESO_PIG.Services
{
    public class WeighingServices
    {
        private readonly AppDbContext _context;
        private readonly PigletServices _pigletServices;

        public WeighingServices(AppDbContext context, PigletServices pigletServices)
        {
            _context = context;
            _pigletServices = pigletServices;
        }

        public IEnumerable<Weighing> GetWeighings()
        {
            return _context.Weighings
                .Include(w => w.piglet)
                .Include(w => w.user)
                .ToList();
        }

        public async Task<Weighing> GetWeighingId(int id_Weighings)
        {
            return await _context.Weighings
                .Include(w => w.piglet)
                .Include(w => w.user)
                .FirstOrDefaultAsync(x => x.id_Weighings == id_Weighings);
        }

        // ✅ MÉTODO CORREGIDO CON LOGGING Y VERIFICACIÓN
        public async Task<IEnumerable<Weighing>> GetWeighingsByPigletId(int pigletId)
        {
            try
            {
                Console.WriteLine($"DEBUG Service: Buscando pesajes para lechón ID: {pigletId}");

                // ✅ AGREGAR: Verificar si el lechón existe
                var pigletExists = await _context.Piglets.AnyAsync(p => p.Id_Piglet == pigletId);
                Console.WriteLine($"DEBUG Service: ¿Lechón {pigletId} existe? {pigletExists}");

                if (!pigletExists)
                {
                    Console.WriteLine($"WARNING: Lechón {pigletId} no existe en la base de datos");
                    return new List<Weighing>(); // Devolver lista vacía si el lechón no existe
                }

                var weighings = await _context.Weighings
                    .Where(w => w.Id_Piglet == pigletId)
                    .OrderBy(w => w.Fec_Weight)
                    .ToListAsync();

                Console.WriteLine($"DEBUG Service: Encontrados {weighings.Count} pesajes para lechón {pigletId}");

                return weighings;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR en GetWeighingsByPigletId: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                throw; // Re-lanzar la excepción para que el controlador la maneje
            }
        }

        // ✅ MÉTODO CORREGIDO CON LOGGING MEJORADO
        public async Task CreateWeighingAndUpdateCorral(Weighing entity)
        {
            var piglet = await _context.Piglets.FirstOrDefaultAsync(p => p.Id_Piglet == entity.Id_Piglet);
            if (piglet == null) throw new Exception("Lechón no encontrado");

            // ✅ AGREGAR: Logging detallado
            Console.WriteLine($"DEBUG: Creando pesaje para lechón {piglet.Name_Piglet}");
            Console.WriteLine($"DEBUG: Peso actual: {entity.Weight_Current}kg, Ganancia recibida: {entity.Weight_Gain}kg");

            // Obtener el peso del último pesaje para calcular la ganancia correctamente
            var lastWeighing = await _context.Weighings
                .Where(w => w.Id_Piglet == entity.Id_Piglet)
                .OrderByDescending(w => w.Fec_Weight)
                .FirstOrDefaultAsync();

            // Calcular ganancia de peso basada en el peso anterior
            float previousWeight = lastWeighing?.Weight_Current ?? piglet.Weight_Initial;

            // ✅ MODIFICAR: Solo calcular si no se envió ganancia
            if (entity.Weight_Gain == 0)
            {
                entity.Weight_Gain = entity.Weight_Current - previousWeight;
                Console.WriteLine($"DEBUG: Ganancia calculada automáticamente: {entity.Weight_Current}kg - {previousWeight}kg = {entity.Weight_Gain}kg");
            }

            _context.Weighings.Add(entity);
            await _context.SaveChangesAsync();

            // IMPORTANTE: Actualizar peso acumulado INMEDIATAMENTE
            await UpdatePigletAccumulatedWeight(entity.Id_Piglet);

            // Verificar y actualizar etapa automáticamente
            await _pigletServices.CheckAndUpdateStageWithRegression(entity.Id_Piglet);

            // ✅ ACTUALIZAR PROMEDIO DEL CORRAL
            await UpdateCorralAverageWeight(piglet.Id_Corral);
        }

        public async Task<bool> DelWeighing(int id_Weighings)
        {
            var weighing = await _context.Weighings.FindAsync(id_Weighings);
            if (weighing != null)
            {
                int pigletId = weighing.Id_Piglet;

                // ✅ OBTENER EL CORRAL ANTES DE ELIMINAR
                var piglet = await _context.Piglets.FindAsync(pigletId);
                int corralId = piglet?.Id_Corral ?? 0;

                _context.Weighings.Remove(weighing);
                await _context.SaveChangesAsync();

                // Recalcular todos los pesajes del lechón
                await RecalculateAllWeighingsForPiglet(pigletId);

                // IMPORTANTE: Actualizar peso acumulado INMEDIATAMENTE
                await UpdatePigletAccumulatedWeight(pigletId);

                // Verificar si debe cambiar de etapa (podría regresar a etapa anterior)
                await _pigletServices.CheckAndUpdateStageWithRegression(pigletId);

                // ✅ ACTUALIZAR PROMEDIO DEL CORRAL DESPUÉS DE ELIMINAR
                if (corralId > 0)
                {
                    await UpdateCorralAverageWeight(corralId);
                    Console.WriteLine($"Promedio del corral {corralId} actualizado después de eliminar pesaje");
                }

                return true;
            }
            return false;
        }

        public async Task<bool> UpdateWeighing(int id_Weighings, Weighing updatedWeighing)
        {
            if (id_Weighings != updatedWeighing.id_Weighings)
                throw new ArgumentException("El ID no coincide.");

            var existingWeighing = await _context.Weighings.FindAsync(id_Weighings);
            if (existingWeighing == null)
                return false;

            // ✅ OBTENER EL CORRAL ANTES DE ACTUALIZAR
            var piglet = await _context.Piglets.FindAsync(updatedWeighing.Id_Piglet);
            int corralId = piglet?.Id_Corral ?? 0;

            // Actualizar los campos
            existingWeighing.Weight_Current = updatedWeighing.Weight_Current;
            existingWeighing.Fec_Weight = updatedWeighing.Fec_Weight;
            existingWeighing.id_Users = updatedWeighing.id_Users;

            await _context.SaveChangesAsync();

            // Recalcular todos los pesajes del lechón
            await RecalculateAllWeighingsForPiglet(updatedWeighing.Id_Piglet);

            // IMPORTANTE: Actualizar peso acumulado INMEDIATAMENTE
            await UpdatePigletAccumulatedWeight(updatedWeighing.Id_Piglet);

            // Verificar etapa con regresión
            await _pigletServices.CheckAndUpdateStageWithRegression(updatedWeighing.Id_Piglet);

            // ✅ ACTUALIZAR PROMEDIO DEL CORRAL DESPUÉS DE ACTUALIZAR
            if (corralId > 0)
            {
                await UpdateCorralAverageWeight(corralId);
                Console.WriteLine($"Promedio del corral {corralId} actualizado después de actualizar pesaje");
            }

            return true;
        }

        private async Task RecalculateAllWeighingsForPiglet(int pigletId)
        {
            var piglet = await _context.Piglets.FindAsync(pigletId);
            if (piglet == null) return;

            var weighings = await _context.Weighings
                .Where(w => w.Id_Piglet == pigletId)
                .OrderBy(w => w.Fec_Weight)
                .ToListAsync();

            float previousWeight = piglet.Weight_Initial;

            foreach (var weighing in weighings)
            {
                weighing.Weight_Gain = weighing.Weight_Current - previousWeight;
                previousWeight = weighing.Weight_Current;
                _context.Entry(weighing).State = EntityState.Modified;
            }

            await _context.SaveChangesAsync();
        }

        private async Task UpdatePigletAccumulatedWeight(int pigletId)
        {
            var piglet = await _context.Piglets.FindAsync(pigletId);
            if (piglet == null) return;

            var lastWeighing = await _context.Weighings
                .Where(w => w.Id_Piglet == pigletId)
                .OrderByDescending(w => w.Fec_Weight)
                .ThenByDescending(w => w.id_Weighings)
                .FirstOrDefaultAsync();

            // CRÍTICO: El peso acumulado debe ser el peso del último pesaje
            float newAccumulatedWeight = lastWeighing?.Weight_Current ?? piglet.Weight_Initial;

            // Solo actualizar si realmente cambió
            if (Math.Abs(piglet.Acum_Weight - newAccumulatedWeight) > 0.01f)
            {
                piglet.Acum_Weight = newAccumulatedWeight;
                _context.Entry(piglet).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                Console.WriteLine($"Peso acumulado actualizado para lechón {pigletId}: {newAccumulatedWeight} kg");
            }
        }

        public async Task RecalculatePigletAccumulatedWeight(int pigletId, float? newInitialWeight = null)
        {
            var piglet = await _context.Piglets.FindAsync(pigletId);
            if (piglet == null) return;

            if (newInitialWeight.HasValue)
            {
                piglet.Weight_Initial = newInitialWeight.Value;
                _context.Entry(piglet).State = EntityState.Modified;
                await _context.SaveChangesAsync();
            }

            await RecalculateAllWeighingsForPiglet(pigletId);
            await UpdatePigletAccumulatedWeight(pigletId);
            await _pigletServices.CheckAndUpdateStageWithRegression(pigletId);
        }

        // ✅ MÉTODO CORREGIDO para calcular promedio en lugar de suma
        private async Task UpdateCorralAverageWeight(int corralId)
        {
            var pigletsInCorral = await _context.Piglets
                .Where(p => p.Id_Corral == corralId && p.Is_Active) // Solo lechones activos
                .ToListAsync();

            var corral = await _context.Corrals.FindAsync(corralId);
            if (corral == null) return;

            if (!pigletsInCorral.Any())
            {
                corral.Tot_Pesaje = 0;
                _context.Entry(corral).State = EntityState.Modified;
                await _context.SaveChangesAsync();
                return;
            }

            var currentWeights = new List<float>();

            foreach (var piglet in pigletsInCorral)
            {
                // Obtener el peso más actual (último pesaje o peso inicial)
                var lastWeighing = await _context.Weighings
                    .Where(w => w.Id_Piglet == piglet.Id_Piglet)
                    .OrderByDescending(w => w.Fec_Weight)
                    .ThenByDescending(w => w.id_Weighings)
                    .FirstOrDefaultAsync();

                float currentWeight = lastWeighing?.Weight_Current ?? piglet.Weight_Initial;
                currentWeights.Add(currentWeight);
            }

            // ✅ CALCULAR PROMEDIO, NO SUMA
            var promedio = currentWeights.Average();
            corral.Tot_Pesaje = (float)Math.Round(promedio, 2);

            _context.Entry(corral).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            Console.WriteLine($"Promedio del corral {corralId} actualizado: {promedio:F2} kg");
        }
    }
}
