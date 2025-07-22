using mym_softcom.Models;
using mym_softcom; // Asumiendo que AppDbContext está en este namespace
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace mym_softcom.Services
{
    public class PlanServices
    {
        private readonly AppDbContext _context;

        public PlanServices(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Obtiene todos los planes disponibles.
        /// </summary>
        public async Task<IEnumerable<Plan>> GetAllPlans()
        {
            return await _context.Plans.ToListAsync();
        }

        /// <summary>
        /// Obtiene un plan específico por su ID.
        /// </summary>
        public async Task<Plan?> GetPlanById(int id_Plans)
        {
            Console.WriteLine($"[PlanServices] Buscando plan con id_Plans: {id_Plans}");
            return await _context.Plans.FirstOrDefaultAsync(p => p.id_Plans == id_Plans);
        }

        /// <summary>
        /// Crea un nuevo plan.
        /// </summary>
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

        /// <summary>
        /// Actualiza un plan existente.
        /// </summary>
        public async Task<bool> UpdatePlan(int id_Plans, Plan updatedPlan)
        {
            try
            {
                if (id_Plans != updatedPlan.id_Plans)
                    throw new ArgumentException("El ID del plan en la URL no coincide con el ID del plan en el cuerpo de la solicitud.");

                var existingPlan = await _context.Plans.AsNoTracking()
                                          .FirstOrDefaultAsync(p => p.id_Plans == id_Plans);

                if (existingPlan == null) return false;

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

        /// <summary>
        /// Elimina un plan por su ID.
        /// </summary>
        public async Task<bool> DeletePlan(int id_Plans)
        {
            try
            {
                var plan = await _context.Plans.FirstOrDefaultAsync(p => p.id_Plans == id_Plans);
                if (plan == null) return false;

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
    }
}
