using Microsoft.AspNetCore.Mvc;
using mym_softcom.Models;
using mym_softcom.Services;
using System.Collections.Generic;
using System.Threading.Tasks;
using System; // Necesario para InvalidOperationException

namespace mym_softcom.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ClientController : ControllerBase
    {
        private readonly ClientServices _clientServices;

        public ClientController(ClientServices clientServices)
        {
            _clientServices = clientServices;
        }

        // GET: api/Client/GetAll (Consultar todos los clientes)
        [HttpGet("GetAll")]
        public async Task<ActionResult<IEnumerable<Client>>> GetClients()
        {
            var clients = await _clientServices.GetClients();
            return Ok(clients);
        }

        // GET: api/Client/{id} (Consultar por ID) - Se mantiene RESTful por convención
        [HttpGet("GetAllByID{id}")]
        public async Task<ActionResult<Client>> GetClient(int id)
        {
            var client = await _clientServices.GetClientById(id);
            if (client == null)
            {
                return NotFound("Cliente no encontrado.");
            }
            return Ok(client);
        }

        // GET: api/Client/GetByDocument/{document} (Consultar por Documento)
        [HttpGet("GetByDocument/{document}")]
        public async Task<ActionResult<Client>> GetClientByDocument(int document)
        {
            var client = await _clientServices.GetClientByDocument(document);
            if (client == null)
            {
                return NotFound("Cliente no encontrado por documento.");
            }
            return Ok(client);
        }

        // POST: api/Client/CreateClient (Crear cliente)
        [HttpPost("CreateClient")]
        public async Task<ActionResult<Client>> CreateClient(Client client)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _clientServices.CreateClient(client);
                if (success)
                {
                    return CreatedAtAction(nameof(GetClient), new { id = client.id_Clients }, client);
                }
                return StatusCode(500, "Error al crear el cliente.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // PUT: api/Client/UpdateClient/{id} (Actualizar cliente)
        [HttpPut("UpdateClient/{id}")]
        public async Task<IActionResult> UpdateClient(int id, Client client)
        {
            if (id != client.id_Clients)
            {
                return BadRequest("El ID del cliente en la URL no coincide con el ID del cliente en el cuerpo de la solicitud.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _clientServices.UpdateClient(id, client);
                if (success)
                {
                    return NoContent(); // 204 No Content para una actualización exitosa sin retorno de datos
                }
                return NotFound("Cliente no encontrado o error al actualizar.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // DELETE: api/Client/DeleteClient/{id} (Eliminar cliente)
        [HttpDelete("DeleteClient/{id}")]
        public async Task<IActionResult> DeleteClient(int id)
        {
            try
            {
                var success = await _clientServices.DeleteClient(id);
                if (success)
                {
                    return NoContent();
                }
                return NotFound("Cliente no encontrado o no se pudo eliminar.");
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message); // Por ejemplo, si el servicio prohíbe la eliminación
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // PATCH: api/Client/ToggleStatus/{id} (Cambiar estado Activo/Inactivo)
        [HttpPatch("ToggleStatus/{id}")]
        public async Task<IActionResult> ToggleClientStatus(int id)
        {
            try
            {
                var success = await _clientServices.ToggleClientStatus(id);
                if (success)
                {
                    return NoContent();
                }
                return NotFound("Cliente no encontrado o error al cambiar el estado.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // GET: api/Client/GetActiveClients (Consultar solo clientes activos)
        [HttpGet("GetActiveClients")]
        public async Task<ActionResult<IEnumerable<Client>>> GetActiveClients()
        {
            var activeClients = await _clientServices.GetActiveClients();
            return Ok(activeClients);
        }

        // GET: api/Client/GetActiveClientsForSelect (Obtener clientes activos para un select)
        [HttpGet("GetActiveClientsForSelect")]
        public async Task<ActionResult<IEnumerable<object>>> GetActiveClientsForSelect()
        {
            var clientsForSelect = await _clientServices.GetActiveClientsForSelect();
            return Ok(clientsForSelect);
        }
    }
}
