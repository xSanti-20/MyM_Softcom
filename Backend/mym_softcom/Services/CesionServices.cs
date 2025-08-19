using mym_softcom.Models;
using Microsoft.EntityFrameworkCore;

namespace mym_softcom.Services
{
    public class CesionServices
    {
        private readonly AppDbContext _context;
        private readonly ClientServices _clientServices;

        public CesionServices(AppDbContext context, ClientServices clientServices)
        {
            _context = context;
            _clientServices = clientServices;
        }

        /// <summary>
        /// Procesa una cesión completa de lote
        /// </summary>
        public async Task<CesionResponse> ProcesarCesion(CesionRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // 1. Validar que el cliente cedente existe y tiene ventas activas
                var clienteCedente = await _clientServices.GetClientByDocument(request.DocumentoCedente);
                if (clienteCedente == null)
                {
                    return new CesionResponse
                    {
                        Success = false,
                        Message = "No se encontró un cliente con el documento especificado",
                        Errors = { "Cliente cedente no encontrado" }
                    };
                }

                // 2. Buscar venta específica del cliente cedente por ID de venta
                var ventaCedente = await _context.Sales
                    .Include(s => s.lot)
                    .Include(s => s.plan)
                    .FirstOrDefaultAsync(s => s.id_Sales == request.IdVentaACeder &&
                                            s.id_Clients == clienteCedente.id_Clients &&
                                            s.status == "Active");

                if (ventaCedente == null)
                {
                    return new CesionResponse
                    {
                        Success = false,
                        Message = "No se encontró la venta especificada o no está activa",
                        Errors = { "Venta no encontrada o inactiva" }
                    };
                }

                // 3. Validar que el nuevo cliente no existe (por documento)
                var clienteExistente = await _clientServices.GetClientByDocument(request.NuevoCliente.document);
                if (clienteExistente != null)
                {
                    return new CesionResponse
                    {
                        Success = false,
                        Message = "Ya existe un cliente con el documento especificado",
                        Errors = { "Cliente cesionario ya existe" }
                    };
                }

                // 4. Crear el nuevo cliente (cesionario)
                var nuevoClienteCreado = await _clientServices.CreateClient(request.NuevoCliente);
                if (!nuevoClienteCreado)
                {
                    return new CesionResponse
                    {
                        Success = false,
                        Message = "Error al crear el nuevo cliente",
                        Errors = { "Error en creación de cliente" }
                    };
                }

                // 5. Obtener el cliente recién creado
                var clienteCesionario = await _clientServices.GetClientByDocument(request.NuevoCliente.document);
                if (clienteCesionario == null)
                {
                    throw new Exception("Error al recuperar el cliente recién creado");
                }

                // 6. Crear registro de cesión
                var cesion = new Cesion
                {
                    cesion_date = DateTime.Now,
                    cesion_reason = request.MotivoCesion,
                    cesion_cost = request.CostoCesion,
                    status = "Completada",
                    id_Client_Cedente = clienteCedente.id_Clients,
                    id_Client_Cesionario = clienteCesionario.id_Clients,
                    id_Sales = ventaCedente.id_Sales,
                    id_Users = request.IdUsuario,
                    valor_pagado_antes_cesion = ventaCedente.total_raised,
                    deuda_antes_cesion = ventaCedente.total_debt,
                    observaciones = request.Observaciones
                };

                _context.Cesions.Add(cesion);
                await _context.SaveChangesAsync();

                // 7. Transferir la venta al nuevo cliente
                ventaCedente.id_Clients = clienteCesionario.id_Clients;
                _context.Sales.Update(ventaCedente);

                // 8. Verificar si el cliente cedente tiene más ventas activas
                var tieneOtrasVentasActivas = await _context.Sales
                    .AnyAsync(s => s.id_Clients == clienteCedente.id_Clients &&
                                  s.status == "Active" &&
                                  s.id_Sales != ventaCedente.id_Sales);

                // 9. Solo cambiar estado del cliente cedente a "Inactivo" si no tiene más ventas activas
                if (!tieneOtrasVentasActivas)
                {
                    clienteCedente.status = "Inactivo";
                    _context.Clients.Update(clienteCedente);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return new CesionResponse
                {
                    Success = true,
                    Message = $"Cesión completada exitosamente. Lote transferido de {clienteCedente.names} {clienteCedente.surnames} a {clienteCesionario.names} {clienteCesionario.surnames}",
                    Cesion = cesion
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return new CesionResponse
                {
                    Success = false,
                    Message = $"Error procesando la cesión: {ex.Message}",
                    Errors = { ex.Message }
                };
            }
        }

        /// <summary>
        /// Obtiene todas las cesiones con información detallada
        /// </summary>
        public async Task<IEnumerable<CesionInfo>> GetCesionesDetalladas()
        {
            return await _context.Cesions
                .Join(_context.Clients, c => c.id_Client_Cedente, cedente => cedente.id_Clients, (c, cedente) => new { c, cedente })
                .Join(_context.Clients, x => x.c.id_Client_Cesionario, cesionario => cesionario.id_Clients, (x, cesionario) => new { x.c, x.cedente, cesionario })
                .Join(_context.Sales, x => x.c.id_Sales, sale => sale.id_Sales, (x, sale) => new { x.c, x.cedente, x.cesionario, sale })
                .Join(_context.Lots, x => x.sale.id_Lots, lot => lot.id_Lots, (x, lot) => new { x.c, x.cedente, x.cesionario, x.sale, lot })
                .Join(_context.Projects, x => x.lot.id_Projects, project => project.id_Projects, (x, project) => new { x.c, x.cedente, x.cesionario, x.sale, x.lot, project })
                .Select(x => new CesionInfo
                {
                    Id_Cesiones = x.c.id_Cesiones,
                    Fecha_Cesion = x.c.cesion_date,
                    Motivo = x.c.cesion_reason,
                    Costo = x.c.cesion_cost,
                    Status = x.c.status,
                    Cedente_Nombre = $"{x.cedente.names} {x.cedente.surnames}",
                    Cedente_Documento = x.cedente.document,
                    Cesionario_Nombre = $"{x.cesionario.names} {x.cesionario.surnames}",
                    Cesionario_Documento = x.cesionario.document,
                    Id_Venta = x.c.id_Sales,
                    Lote_Nombre = $"Mz {x.lot.block} - Lote {x.lot.lot_number}",
                    Proyecto_Nombre = x.project.name ?? "N/A",
                    Valor_Total_Venta = x.sale.total_value,
                    Valor_Pagado_Antes = x.c.valor_pagado_antes_cesion,
                    Deuda_Antes = x.c.deuda_antes_cesion,
                    Observaciones = x.c.observaciones
                })
                .OrderByDescending(c => c.Fecha_Cesion)
                .ToListAsync();
        }

        /// <summary>
        /// Busca cliente por documento para validación - CORREGIDO para mostrar todas las ventas
        /// </summary>
        public async Task<object?> BuscarClientePorDocumento(int documento)
        {
            var cliente = await _clientServices.GetClientByDocument(documento);
            if (cliente == null) return null;

            // ✅ CORREGIDO: Cambiar FirstOrDefaultAsync() por ToListAsync() para obtener TODAS las ventas activas
            var ventasActivas = await _context.Sales
                .Join(_context.Lots, s => s.id_Lots, l => l.id_Lots, (s, l) => new { s, l })
                .Join(_context.Projects, x => x.l.id_Projects, p => p.id_Projects, (x, p) => new { x.s, x.l, p })
                .Where(x => x.s.id_Clients == cliente.id_Clients && x.s.status == "Active")
                .Select(x => new
                {
                    Id_Venta = x.s.id_Sales,
                    Lote = $"Mz {x.l.block} - Lote {x.l.lot_number}",
                    Proyecto = x.p.name,
                    Valor_Total = x.s.total_value,
                    Valor_Pagado = x.s.total_raised,
                    Deuda_Pendiente = x.s.total_debt,
                    Fecha_Venta = x.s.sale_date
                })
                .OrderBy(x => x.Fecha_Venta) // Ordenar por fecha de venta
                .ToListAsync(); // ✅ CAMBIO CLAVE: ToListAsync() en lugar de FirstOrDefaultAsync()

            return new
            {
                Id_Cliente = cliente.id_Clients,
                Nombre_Completo = $"{cliente.names} {cliente.surnames}",
                Documento = cliente.document,
                Telefono = cliente.phone,
                Email = cliente.email,
                Status = cliente.status,
                Tiene_Ventas_Activas = ventasActivas.Any(), // ✅ CORREGIDO: Cambiar a Any()
                Total_Ventas_Activas = ventasActivas.Count, // ✅ NUEVO: Contar total de ventas
                Ventas_Info = ventasActivas // ✅ CORREGIDO: Devolver lista completa de ventas
            };
        }
    }
}
