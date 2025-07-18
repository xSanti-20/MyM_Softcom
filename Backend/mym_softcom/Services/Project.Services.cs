using mym_softcom.Models;
using mym_softcom; // Asumiendo que AppDbContext está en este namespace
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace mym_softcom.Services
{
    public class ProjectServices
    {
        private readonly AppDbContext _context;

        public ProjectServices(AppDbContext context)
        {
            _context = context;
        }

        // Consultar todos los proyectos
        public async Task<IEnumerable<Project>> GetProjects()
        {
            return await _context.Projects.ToListAsync();
        }

        // Consultar proyecto por ID
        public async Task<Project?> GetProjectById(int id_Projects)
        {
            Console.WriteLine($"[ProjectServices] Buscando proyecto con id_Projects: {id_Projects}");
            return await _context.Projects.FirstOrDefaultAsync(p => p.id_Projects == id_Projects);
        }

        // Crear un nuevo proyecto
        public async Task<bool> CreateProject(Project project)
        {
            try
            {
                _context.Projects.Add(project);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en CreateProject: {ex.Message}");
                throw;
            }
        }

        // Actualizar un proyecto existente
        public async Task<bool> UpdateProject(int id_Projects, Project updatedProject)
        {
            try
            {
                if (id_Projects != updatedProject.id_Projects)
                    throw new ArgumentException("El ID del proyecto en la URL no coincide con el ID del proyecto en el cuerpo de la solicitud.");

                var existingProject = await _context.Projects.AsNoTracking()
                                            .FirstOrDefaultAsync(p => p.id_Projects == id_Projects);

                if (existingProject == null) return false;

                _context.Projects.Update(updatedProject);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en UpdateProject: {ex.Message}");
                throw;
            }
        }

        // Eliminar un proyecto
        public async Task<bool> DeleteProject(int id_Projects)
        {
            try
            {
                var project = await _context.Projects.FirstOrDefaultAsync(p => p.id_Projects == id_Projects);
                if (project == null) return false;

                _context.Projects.Remove(project);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en DeleteProject: {ex.Message}");
                throw;
            }
        }
    }
}
