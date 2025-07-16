using API_PESO_PIG.Models;
using Microsoft.EntityFrameworkCore;

namespace API_PESO_PIG.Services
{
    public class PigletServices
    {
        private readonly AppDbContext _context;

        public PigletServices(AppDbContext context)
        {
            _context = context;
        }

        public class StageInfo
        {
            public string Name { get; set; }
            public float WeightMin { get; set; }
            public float WeightMax { get; set; }
            public int MaxDays { get; set; }
            public string NextStage { get; set; }
        }

        public class StageTransitionResult
        {
            public int PigletId { get; set; }
            public string PigletName { get; set; }
            public string CurrentStage { get; set; }
            public string NewStage { get; set; }
            public float CurrentWeight { get; set; }
            public int DaysInStage { get; set; }
            public bool StageChanged { get; set; }
            public bool IsWeightDeficient { get; set; }
            public string TransitionReason { get; set; }
            public string Message { get; set; }
            public bool Success { get; set; } = true;
        }

        // ✅ NUEVAS DEFINICIONES DE ETAPAS SEGÚN TUS REQUERIMIENTOS
        private static readonly Dictionary<string, StageInfo> StageDefinitions = new()
        {
            ["PRE_INICIO"] = new StageInfo
            {
                Name = "Pre-inicio",
                WeightMin = 6.5f,
                WeightMax = 17.5f,
                MaxDays = 25,
                NextStage = "INICIACION"
            },
            ["INICIACION"] = new StageInfo
            {
                Name = "Iniciación",
                WeightMin = 17.5f,
                WeightMax = 30f,
                MaxDays = 24,
                NextStage = "LEVANTE"
            },
            ["LEVANTE"] = new StageInfo
            {
                Name = "Levante",
                WeightMin = 30f,
                WeightMax = 60f,
                MaxDays = 42,
                NextStage = "ENGORDE"
            },
            ["ENGORDE"] = new StageInfo
            {
                Name = "Engorde",
                WeightMin = 60f,
                WeightMax = 120f,
                MaxDays = 47,
                NextStage = "SACRIFICIO"
            }
        };

        public IEnumerable<Piglet> GetPiglets()
        {
            return _context.Piglets
                .Include(p => p.race)
                .Include(p => p.stage)
                .Include(p => p.corral)
                .ToList();
        }

        public IEnumerable<Piglet> GetActivePiglets()
        {
            return _context.Piglets
                .Include(p => p.race)
                .Include(p => p.stage)
                .Include(p => p.corral)
                .Where(p => p.Is_Active)
                .ToList();
        }

        public async Task<Piglet> GetPigletId(int id_Piglet)
        {
            return await _context.Piglets
                .Include(p => p.race)
                .Include(p => p.stage)
                .Include(p => p.corral)
                .FirstOrDefaultAsync(x => x.Id_Piglet == id_Piglet);
        }

        public async Task<object> GetPigletForWeighing(int id_Piglet)
        {
            var piglet = await _context.Piglets
                .Include(p => p.race)
                .Include(p => p.stage)
                .Include(p => p.corral)
                .FirstOrDefaultAsync(x => x.Id_Piglet == id_Piglet);

            if (piglet == null)
                return null;

            var lastWeighing = await _context.Weighings
                .Where(w => w.Id_Piglet == id_Piglet)
                .OrderByDescending(w => w.Fec_Weight)
                .ThenByDescending(w => w.id_Weighings)
                .FirstOrDefaultAsync();

            return new
            {
                Id_Piglet = piglet.Id_Piglet,
                Name_Piglet = piglet.Name_Piglet,
                Weight_Initial = piglet.Weight_Initial,
                Acum_Weight = piglet.Acum_Weight,
                Current_Weight = lastWeighing?.Weight_Current ?? piglet.Weight_Initial,
                Fec_Birth = piglet.Fec_Birth,
                Sex_Piglet = piglet.Sex_Piglet,
                Placa_Sena = piglet.Placa_Sena,
                Sta_Date = piglet.Sta_Date,
                Is_Active = piglet.Is_Active,
                Race = new
                {
                    Id_Race = piglet.race?.id_Race,
                    Nam_Race = piglet.race?.Nam_Race
                },
                Stage = new
                {
                    Id_Stage = piglet.stage?.id_Stage,
                    Name_Stage = piglet.stage?.Name_Stage
                },
                Corral = new
                {
                    Id_Corral = piglet.corral?.id_Corral,
                    Des_Corral = piglet.corral?.Des_Corral
                },
                LastWeighing = lastWeighing != null ? new
                {
                    Weight_Current = lastWeighing.Weight_Current,
                    Weight_Gain = lastWeighing.Weight_Gain,
                    Fec_Weight = lastWeighing.Fec_Weight
                } : null,
                DaysInStage = piglet.Sta_Date.HasValue ?
                    (DateTime.Now - piglet.Sta_Date.Value).Days : 0
            };
        }

        public async Task<bool> ToggleStatus(int id_Piglet, bool isActive)
        {
            try
            {
                var piglet = await _context.Piglets.FindAsync(id_Piglet);
                if (piglet == null)
                {
                    return false;
                }

                bool previousStatus = piglet.Is_Active;
                piglet.Is_Active = isActive;

                if (previousStatus != isActive)
                {
                    var corral = await _context.Corrals.FindAsync(piglet.Id_Corral);
                    if (corral != null)
                    {
                        if (!isActive)
                        {
                            corral.Tot_Animal = Math.Max(0, corral.Tot_Animal - 1);
                            if (corral.Tot_Animal == 0)
                            {
                                corral.Est_Corral = "libre";
                                corral.Tot_Pesaje = 0;
                            }
                        }
                        else
                        {
                            corral.Tot_Animal += 1;
                            corral.Est_Corral = "ocupado";
                        }

                        _context.Corrals.Update(corral);
                    }
                }

                _context.Piglets.Update(piglet);
                await _context.SaveChangesAsync();

                if (previousStatus != isActive)
                {
                    await UpdateCorralAverageWeight(piglet.Id_Corral);
                }

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en ToggleStatus: {ex.Message}");
                throw;
            }
        }

        public async Task Add(Piglet entity)
        {
            if (entity.Acum_Weight <= 0)
                entity.Acum_Weight = entity.Weight_Initial;

            entity.Sta_Date = DateTime.Now;
            entity.Is_Active = true;

            var corral = _context.Corrals.FirstOrDefault(c => c.id_Corral == entity.Id_Corral);
            if (corral != null)
            {
                corral.Tot_Animal += 1;
                corral.Est_Corral = "ocupado";
                _context.Corrals.Update(corral);
            }

            _context.Piglets.Add(entity);
            await _context.SaveChangesAsync();

            await UpdateCorralAverageWeight(entity.Id_Corral);
        }

        public async Task<bool> DelPiglet(int id_Piglet)
        {
            var piglet = await _context.Piglets.FindAsync(id_Piglet);
            if (piglet != null)
            {
                int corralId = piglet.Id_Corral;

                var corral = await _context.Corrals.FindAsync(piglet.Id_Corral);
                if (corral != null)
                {
                    corral.Tot_Animal = Math.Max(0, corral.Tot_Animal - 1);
                    if (corral.Tot_Animal == 0)
                    {
                        corral.Est_Corral = "libre";
                        corral.Tot_Pesaje = 0;
                    }
                    _context.Corrals.Update(corral);
                }

                _context.Piglets.Remove(piglet);
                await _context.SaveChangesAsync();

                if (corral != null && corral.Tot_Animal > 0)
                {
                    await UpdateCorralAverageWeight(corralId);
                }

                return true;
            }
            return false;
        }

        public async Task<bool> UpdatePiglet(int id_Piglet, Piglet updatedPiglet)
        {
            if (id_Piglet != updatedPiglet.Id_Piglet)
                throw new ArgumentException("El ID del lechón no coincide.");

            var existing = await _context.Piglets.AsNoTracking().FirstOrDefaultAsync(p => p.Id_Piglet == id_Piglet);
            if (existing == null) return false;

            var oldStage = existing.Id_Stage;
            var newStage = updatedPiglet.Id_Stage;

            if (oldStage != newStage)
                updatedPiglet.Sta_Date = DateTime.Now;
            else
                updatedPiglet.Sta_Date = existing.Sta_Date;

            updatedPiglet.Is_Active = existing.Is_Active;

            // Manejar cambio de corral
            if (existing.Id_Corral != updatedPiglet.Id_Corral)
            {
                var oldCorral = await _context.Corrals.FindAsync(existing.Id_Corral);
                var newCorral = await _context.Corrals.FindAsync(updatedPiglet.Id_Corral);

                if (oldCorral != null)
                {
                    oldCorral.Tot_Animal = Math.Max(0, oldCorral.Tot_Animal - 1);
                    if (oldCorral.Tot_Animal == 0)
                    {
                        oldCorral.Est_Corral = "libre";
                        oldCorral.Tot_Pesaje = 0;
                    }
                    _context.Corrals.Update(oldCorral);
                }

                if (newCorral != null)
                {
                    newCorral.Tot_Animal += 1;
                    newCorral.Est_Corral = "ocupado";
                    _context.Corrals.Update(newCorral);
                }
            }

            _context.Piglets.Update(updatedPiglet);
            await _context.SaveChangesAsync();

            if (existing.Id_Corral != updatedPiglet.Id_Corral)
            {
                if (existing.Id_Corral > 0)
                    await UpdateCorralAverageWeight(existing.Id_Corral);
                await UpdateCorralAverageWeight(updatedPiglet.Id_Corral);
            }
            else
            {
                await UpdateCorralAverageWeight(updatedPiglet.Id_Corral);
            }

            await CheckAndUpdateStageWithRegression(id_Piglet);

            return true;
        }

        // ✅ MÉTODO PRINCIPAL PARA VERIFICAR Y ACTUALIZAR ETAPAS
        public async Task<StageTransitionResult> CheckAndUpdateStageWithRegression(int pigletId)
        {
            var piglet = await _context.Piglets
                .Include(p => p.stage)
                .FirstOrDefaultAsync(p => p.Id_Piglet == pigletId);

            if (piglet == null)
                return new StageTransitionResult { Success = false, Message = "Lechón no encontrado", PigletId = pigletId };

            if (!piglet.Is_Active)
                return new StageTransitionResult { Success = false, Message = "Lechón inactivo - no se procesa", PigletId = pigletId };

            float currentWeight = piglet.Acum_Weight;
            var correctStageKey = DetermineCorrectStageByWeight(currentWeight);
            var currentStageKey = GetStageKey(piglet.stage?.Name_Stage);

            var result = new StageTransitionResult
            {
                PigletId = piglet.Id_Piglet,
                PigletName = piglet.Name_Piglet,
                CurrentStage = piglet.stage?.Name_Stage ?? "Sin etapa",
                CurrentWeight = currentWeight,
                Success = true
            };

            Console.WriteLine($"DEBUG - Lechón {piglet.Name_Piglet}: Peso={currentWeight}kg, EtapaActual={currentStageKey}, EtapaCorrecta={correctStageKey}");

            if (correctStageKey != currentStageKey && correctStageKey != null)
            {
                var success = await TransitionToNextStage(piglet, correctStageKey, "Ajuste automático por peso");
                if (success)
                {
                    result.StageChanged = true;
                    result.NewStage = StageDefinitions[correctStageKey].Name;
                    result.TransitionReason = "Ajuste automático por peso";
                    result.Message = $"Etapa ajustada de {piglet.stage?.Name_Stage} a {StageDefinitions[correctStageKey].Name} por peso actual: {currentWeight}kg";
                }
                else
                {
                    result.Success = false;
                    result.Message = "Error al ajustar la etapa";
                }
            }
            else
            {
                result.Message = $"Etapa correcta: {piglet.stage?.Name_Stage} para peso {currentWeight}kg";
            }

            return result;
        }

        // ✅ MÉTODO ACTUALIZADO CON LOS NUEVOS RANGOS DE PESO
        private string DetermineCorrectStageByWeight(float weight)
        {
            // Pre-inicio/Precebo: 6.5kg a 17.5kg
            if (weight >= 6.5f && weight < 17.5f) return "PRE_INICIO";

            // Iniciación: 17.5kg a 30kg
            if (weight >= 17.5f && weight < 30f) return "INICIACION";

            // Levante: 30kg a 60kg
            if (weight >= 30f && weight < 60f) return "LEVANTE";

            // Engorde: 60kg a 120kg
            if (weight >= 60f && weight <= 120f) return "ENGORDE";

            // Si el peso es menor a 6.5kg, mantener en pre-inicio
            if (weight < 6.5f) return "PRE_INICIO";

            // Si el peso es mayor a 120kg, listo para sacrificio
            if (weight > 120f) return "ENGORDE"; // Mantener en engorde hasta sacrificio

            return "PRE_INICIO"; // Por defecto
        }

        public async Task<List<StageTransitionResult>> CheckAllStages()
        {
            var results = new List<StageTransitionResult>();
            var piglets = await _context.Piglets
                .Include(p => p.stage)
                .Where(p => p.stage.Name_Stage != "SACRIFICIO" && p.Is_Active)
                .ToListAsync();

            foreach (var piglet in piglets)
            {
                var result = await CheckAndUpdateStageWithRegression(piglet.Id_Piglet);
                results.Add(result);
            }

            return results;
        }

        private async Task<bool> TransitionToNextStage(Piglet piglet, string nextStageKey, string reason)
        {
            Console.WriteLine($"DEBUG - Intentando transición a: {nextStageKey}");

            Stage nextStage = null;

            // ✅ BÚSQUEDA ACTUALIZADA PARA LAS NUEVAS ETAPAS
            if (nextStageKey == "PRE_INICIO")
            {
                nextStage = await _context.Stages
                    .FirstOrDefaultAsync(s => s.Name_Stage.ToUpper().Contains("PRE") &&
                                            (s.Name_Stage.ToUpper().Contains("INICIO") || s.Name_Stage.ToUpper().Contains("PRECEBO")));
            }
            else if (nextStageKey == "INICIACION")
            {
                nextStage = await _context.Stages
                    .FirstOrDefaultAsync(s => s.Name_Stage.ToUpper().Contains("INICIACION") &&
                                            !s.Name_Stage.ToUpper().Contains("PRE"));
            }
            else if (nextStageKey == "LEVANTE")
            {
                nextStage = await _context.Stages
                    .FirstOrDefaultAsync(s => s.Name_Stage.ToUpper().Contains("LEVANTE"));
            }
            else if (nextStageKey == "ENGORDE")
            {
                nextStage = await _context.Stages
                    .FirstOrDefaultAsync(s => s.Name_Stage.ToUpper().Contains("ENGORDE"));
            }

            if (nextStage == null)
            {
                Console.WriteLine($"ERROR: No se encontró la etapa {nextStageKey} en la base de datos");
                var availableStages = await _context.Stages.Select(s => s.Name_Stage).ToListAsync();
                Console.WriteLine($"Etapas disponibles: {string.Join(", ", availableStages)}");
                return false;
            }

            Console.WriteLine($"DEBUG - Etapa encontrada: {nextStage.Name_Stage} (ID: {nextStage.id_Stage})");

            piglet.Id_Stage = nextStage.id_Stage;
            piglet.Sta_Date = DateTime.Now;

            _context.Piglets.Update(piglet);
            await _context.SaveChangesAsync();

            Console.WriteLine($"SUCCESS: Lechón {piglet.Name_Piglet} cambió a etapa {nextStage.Name_Stage}");
            return true;
        }

        // ✅ MÉTODO ACTUALIZADO PARA RECONOCER LAS NUEVAS ETAPAS
        private string GetStageKey(string stageName)
        {
            if (string.IsNullOrEmpty(stageName)) return null;
            var upperName = stageName.ToUpper();

            // Pre-inicio o Precebo
            if (upperName.Contains("PRE") && (upperName.Contains("INICIO") || upperName.Contains("PRECEBO")))
                return "PRE_INICIO";

            // Iniciación (pero no pre-iniciación)
            if (upperName.Contains("INICIACION") && !upperName.Contains("PRE"))
                return "INICIACION";

            // Levante
            if (upperName.Contains("LEVANTE"))
                return "LEVANTE";

            // Engorde
            if (upperName.Contains("ENGORDE"))
                return "ENGORDE";

            return null;
        }

        public Dictionary<string, StageInfo> GetStageDefinitions()
        {
            return StageDefinitions;
        }

        private async Task UpdateCorralAverageWeight(int corralId)
        {
            var pigletsInCorral = await _context.Piglets
                .Where(p => p.Id_Corral == corralId && p.Is_Active)
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
                var lastWeighing = await _context.Weighings
                    .Where(w => w.Id_Piglet == piglet.Id_Piglet)
                    .OrderByDescending(w => w.Fec_Weight)
                    .ThenByDescending(w => w.id_Weighings)
                    .FirstOrDefaultAsync();

                float currentWeight = lastWeighing?.Weight_Current ?? piglet.Weight_Initial;
                currentWeights.Add(currentWeight);
            }

            var promedio = currentWeights.Average();
            corral.Tot_Pesaje = (float)Math.Round(promedio, 2);

            _context.Entry(corral).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            Console.WriteLine($"Promedio del corral {corralId} actualizado: {promedio:F2} kg (solo lechones activos)");
        }
    }
}
