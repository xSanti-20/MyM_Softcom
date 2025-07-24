using mym_softcom.Models;
using mym_softcom; // Asumiendo que AppDbContext está en este namespace
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace mym_softcom.Services
{
    public class ClientServices
    {
        private readonly AppDbContext _context;

        public ClientServices(AppDbContext context)
        {
            _context = context;
        }

        // Consultar todos los clientes
        public async Task<IEnumerable<Client>> GetClients()
        {
            return await _context.Clients.ToListAsync();
        }

        // Consultar cliente por ID
        public async Task<Client?> GetClientById(int id_Clients)
        {
            // ¡NUEVO: Añadimos un log para ver el ID que se está buscando!
            Console.WriteLine($"[ClientServices] Buscando cliente con Id_Clients: {id_Clients}");
            return await _context.Clients.FirstOrDefaultAsync(c => c.id_Clients == id_Clients);
        }

        // Consultar cliente por Documento
        public async Task<Client?> GetClientByDocument(int document)
        {
            return await _context.Clients.FirstOrDefaultAsync(c => c.document == document);
        }

        // Crear un nuevo cliente
        public async Task<bool> CreateClient(Client client)
        {
            try
            {
                client.status = "Activo"; // Asegurarse de que el estado inicial sea 'Activo'
                _context.Clients.Add(client);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en CreateClient: {ex.Message}");
                throw;
            }
        }

        // Actualizar un cliente existente
        public async Task<bool> UpdateClient(int id_Clients, Client updatedClient)
        {
            try
            {
                if (id_Clients != updatedClient.id_Clients)
                    throw new ArgumentException("El ID del cliente no coincide.");

                var existingClient = await _context.Clients.AsNoTracking()
                                          .FirstOrDefaultAsync(c => c.id_Clients == id_Clients);

                if (existingClient == null) return false;

                // Mantener el estado actual si no se especifica en la actualización
                updatedClient.status = updatedClient.status ?? existingClient.status;

                _context.Clients.Update(updatedClient);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en UpdateClient: {ex.Message}");
                throw;
            }
        }

        // Eliminar un cliente (considerar eliminación lógica en lugar de física si hay relaciones)
        public async Task<bool> DeleteClient(int id_Clients)
        {
            try
            {
                var client = await _context.Clients.FirstOrDefaultAsync(c => c.id_Clients == id_Clients);
                if (client == null) return false;

                // Aquí podrías añadir lógica para verificar si el cliente tiene ventas asociadas
                // y lanzar una InvalidOperationException si no se puede eliminar.
                // Por ahora, se elimina directamente.

                _context.Clients.Remove(client);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en DeleteClient: {ex.Message}");
                throw;
            }
        }

        // Cambiar el estado de un cliente (Activo/Inactivo)
        public async Task<bool> ToggleClientStatus(int id_Clients)
        {
            try
            {
                var client = await _context.Clients.FirstOrDefaultAsync(c => c.id_Clients == id_Clients);
                if (client == null) return false;

                client.status = (client.status == "Activo") ? "Inactivo" : "Activo";
                _context.Clients.Update(client);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en ToggleClientStatus: {ex.Message}");
                throw;
            }
        }

        // Consultar solo clientes activos
        public async Task<IEnumerable<Client>> GetActiveClients()
        {
            return await _context.Clients.Where(c => c.status == "Activo").ToListAsync();
        }

        // Obtener clientes activos para un select (Id y Nombre Completo)
        public async Task<IEnumerable<object>> GetActiveClientsForSelect()
        {
            return await _context.Clients
                .Where(c => c.status == "Activo")
                .OrderBy(c => c.names)
                .Select(c => new
                {
                    Id_Clients = c.id_Clients,
                    FullName = $"{c.names} {c.surnames}" // Combinar nombres y apellidos
                })
                .ToListAsync();
        }

        /// <summary>
        /// Obtiene todos los clientes con un resumen de sus ventas (valor total, recaudo, deuda).
        /// </summary>
        public async Task<IEnumerable<object>> GetClientsWithSalesSummary()
        {
            var clientsWithSales = await _context.Clients
                .GroupJoin(
                    _context.Sales,
                    client => client.id_Clients,
                    sale => sale.id_Clients,
                    (client, sales) => new
                    {
                        client.id_Clients,
                        client.names,
                        client.surnames,
                        client.document,
                        client.phone,
                        client.email,
                        client.status,
                        TotalSalesValue = sales.Sum(s => s.total_value ?? 0),
                        TotalRaised = sales.Sum(s => s.total_raised ?? 0),
                        TotalDebt = sales.Sum(s => s.total_debt ?? 0)
                    }
                )
                .ToListAsync();

            return clientsWithSales;
        }
    }
}
