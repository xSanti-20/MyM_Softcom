using mym_softcom.Models;
using mym_softcom; // Asumiendo que AppDbContext está en este namespace
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace mym_softcom.Services
{
    public class PlanServices
    {
        private readonly AppDbContext _context;

        public PlanServices(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Plan>> GetPlans()
        {
            return await _context.Plans.ToListAsync();
        }

        public async Task<Plan?> GetPlanById(int id_Plan)
        {
            return await _context.Plans.FirstOrDefaultAsync(x => x.Id_Plans == id_Plan);
        }

        public async Task<bool> CreatePlan(Plan plan)
        {
            try
            {
                _context.Plans.Add(plan);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en CreatePlan: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> UpdatePlan(int id_Plan, Plan updatedPlan)
        {
            try
            {
                if (id_Plan != updatedPlan.Id_Plans)
                    throw new ArgumentException("El ID del plan no coincide.");

                var existing = await _context.Plans.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id_Plans == id_Plan);

                if (existing == null) return false;

                _context.Plans.Update(updatedPlan);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en UpdatePlan: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> DeletePlan(int id_Plan)
        {
            try
            {
                var plan = await _context.Plans
                    .Include(p => p.Sales)
                    .FirstOrDefaultAsync(p => p.Id_Plans == id_Plan);

                if (plan == null) return false;

                if (plan.Sales != null && plan.Sales.Any())
                {
                    throw new InvalidOperationException("No se puede eliminar un plan que tiene ventas asociadas.");
                }

                _context.Plans.Remove(plan);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en DeletePlan: {ex.Message}");
                throw;
            }
        }

        public async Task<IEnumerable<Plan>> SearchPlans(string searchTerm)
        {
            if (string.IsNullOrEmpty(searchTerm))
                return await Task.FromResult(new List<Plan>());

            return await _context.Plans
                .Where(p => (p.Name != null && p.Name.Contains(searchTerm)) ||
                           (p.Number_Quotas.HasValue && p.Number_Quotas.Value.ToString().Contains(searchTerm)) ||
                           (p.Quotas_Value.HasValue && p.Quotas_Value.Value.ToString().Contains(searchTerm)))
                .ToListAsync();
        }

        public async Task<IEnumerable<object>> GetPlansForSelect()
        {
            return await _context.Plans
                .OrderBy(p => p.Name)
                .Select(p => new
                {
                    Id_Plans = p.Id_Plans,
                    Description = $"{(p.Name ?? "N/A")} ({(p.Number_Quotas ?? 0)} cuotas de {(p.Quotas_Value ?? 0):C0})"
                })
                .ToListAsync();
        }
    }
}