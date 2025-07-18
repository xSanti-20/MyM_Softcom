using Microsoft.AspNetCore.Mvc;
using mym_softcom.Models;
using mym_softcom.Services;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

namespace mym_softcom.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProjectController : ControllerBase
    {
        private readonly ProjectServices _projectServices;

        public ProjectController(ProjectServices projectServices)
        {
            _projectServices = projectServices;
        }

        // GET: api/Project/GetAll (Consultar todos los proyectos)
        [HttpGet("GetAllProjects")]
        public async Task<ActionResult<IEnumerable<Project>>> GetProjects()
        {
            var projects = await _projectServices.GetProjects();
            return Ok(projects);
        }

        // GET: api/Project/{id} (Consultar por ID)
        [HttpGet("GetProjectsByID{id}")]
        public async Task<ActionResult<Project>> GetProject(int id)
        {
            var project = await _projectServices.GetProjectById(id);
            if (project == null)
            {
                return NotFound("Proyecto no encontrado.");
            }
            return Ok(project);
        }

        // POST: api/Project/CreateProject (Crear proyecto)
        [HttpPost("CreateProject")]
        public async Task<ActionResult<Project>> CreateProject(Project project)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _projectServices.CreateProject(project);
                if (success)
                {
                    return CreatedAtAction(nameof(GetProject), new { id = project.id_Projects }, project);
                }
                return StatusCode(500, "Error al crear el proyecto.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // PUT: api/Project/UpdateProject/{id} (Actualizar proyecto)
        [HttpPut("UpdateProject/{id}")]
        public async Task<IActionResult> UpdateProject(int id, Project project)
        {
            if (id != project.id_Projects)
            {
                return BadRequest("El ID del proyecto en la URL no coincide con el ID del proyecto en el cuerpo de la solicitud.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _projectServices.UpdateProject(id, project);
                if (success)
                {
                    return NoContent(); // 204 No Content para una actualización exitosa sin retorno de datos
                }
                return NotFound("Proyecto no encontrado o error al actualizar.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // DELETE: api/Project/DeleteProject/{id} (Eliminar proyecto)
        [HttpDelete("DeleteProject/{id}")]
        public async Task<IActionResult> DeleteProject(int id)
        {
            try
            {
                var success = await _projectServices.DeleteProject(id);
                if (success)
                {
                    return NoContent();
                }
                return NotFound("Proyecto no encontrado o no se pudo eliminar.");
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
    }
}
