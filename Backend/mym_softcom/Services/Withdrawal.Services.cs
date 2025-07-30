using mym_softcom.Models;
using mym_softcom;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace mym_softcom.Services
{
    public class WithdrawalServices
    {
        private readonly AppDbContext _context;
        private readonly SaleServices _saleServices;

        public WithdrawalServices(AppDbContext context, SaleServices saleServices)
        {
            _context = context;
            _saleServices = saleServices;
        }

        /// <summary>
        /// Obtiene todos los desistimientos, incluyendo la venta asociada.
        /// </summary>
        public async Task<IEnumerable<Withdrawal>> GetAllWithdrawals()
        {
            return await _context.Withdrawals
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.plan)
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.user)
                                 .OrderByDescending(w => w.withdrawal_date)
                                 .ToListAsync();
        }

        /// <summary>
        /// Obtiene un desistimiento específico por su ID, incluyendo la venta asociada.
        /// </summary>
        public async Task<Withdrawal?> GetWithdrawalById(int id_Withdrawals)
        {
            Console.WriteLine($"[WithdrawalServices] Buscando desistimiento con id_Withdrawals: {id_Withdrawals}");
            return await _context.Withdrawals
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.plan)
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.user)
                                 .FirstOrDefaultAsync(w => w.id_Withdrawals == id_Withdrawals);
        }

        /// <summary>
        /// Obtiene todos los desistimientos asociados a una venta específica.
        /// </summary>
        public async Task<IEnumerable<Withdrawal>> GetWithdrawalsBySaleId(int id_Sales)
        {
            return await _context.Withdrawals
                                 .Where(w => w.id_Sales == id_Sales)
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.plan)
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.user)
                                 .OrderByDescending(w => w.withdrawal_date)
                                 .ToListAsync();
        }

        /// <summary>
        /// Obtiene todos los desistimientos asociados a un proyecto específico.
        /// </summary>
        public async Task<IEnumerable<Withdrawal>> GetWithdrawalsByProjectId(int id_Projects)
        {
            return await _context.Withdrawals
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.client)
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.plan)
                                 .Include(w => w.sale)
                                 .ThenInclude(s => s.user)
                                 .Where(w => w.sale.lot.project.id_Projects == id_Projects)
                                 .OrderByDescending(w => w.withdrawal_date)
                                 .ToListAsync();
        }

        /// <summary>
        /// Calcula la penalización para una venta específica.
        /// Fórmula: penalización = recaudo total - (valor total * 10%)
        /// </summary>
        public async Task<decimal> CalculatePenalty(int id_Sales)
        {
            try
            {
                var sale = await _saleServices.GetSaleById(id_Sales);
                if (sale == null)
                {
                    throw new InvalidOperationException("La venta asociada no existe.");
                }

                var totalRaised = sale.total_raised ?? 0;
                var totalValue = sale.total_value ?? 0;
                var penaltyPercentage = totalValue * 0.10m;

                var penalty = totalRaised - penaltyPercentage;

                // La penalización no puede ser negativa
                return Math.Max(0, penalty);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WithdrawalServices] Error en CalculatePenalty: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[WithdrawalServices] Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        /// <summary>
        /// Crea un nuevo desistimiento, calcula la penalización y actualiza los estados correspondientes.
        /// Solo desactiva el cliente si NO tiene otras ventas activas.
        /// </summary>
        public async Task<bool> CreateWithdrawal(Withdrawal withdrawal)
        {
            try
            {
                Console.WriteLine($"[WithdrawalServices] Iniciando CreateWithdrawal para venta ID: {withdrawal.id_Sales}");
                Console.WriteLine($"[WithdrawalServices] Withdrawal object received: Date={withdrawal.withdrawal_date}, Reason={withdrawal.reason}, SaleID={withdrawal.id_Sales}");

                if (withdrawal.withdrawal_date == default(DateTime))
                {
                    withdrawal.withdrawal_date = DateTime.UtcNow;
                    Console.WriteLine($"[WithdrawalServices] withdrawal_date era default, ajustado a UTC: {withdrawal.withdrawal_date}");
                }

                var sale = await _context.Sales
                    .Include(s => s.client)
                    .Include(s => s.lot)
                    .FirstOrDefaultAsync(s => s.id_Sales == withdrawal.id_Sales);

                if (sale == null)
                {
                    throw new InvalidOperationException("La venta asociada no existe.");
                }

                // Verificar que la venta esté activa usando el valor 'Active' del ENUM
                if (sale.status != "Active")
                {
                    throw new InvalidOperationException("Solo se pueden procesar desistimientos de ventas activas.");
                }

                // Calcular la penalización automáticamente
                withdrawal.penalty = await CalculatePenalty(withdrawal.id_Sales);
                Console.WriteLine($"[WithdrawalServices] Penalización calculada: {withdrawal.penalty}");

                // 1. Actualizar el estado de la venta a "Desistida"
                sale.status = "Desistida"; // Usando el valor 'Desistida' del ENUM
                Console.WriteLine($"[WithdrawalServices] Estado de venta {sale.id_Sales} cambiado a 'Desistida'.");

                // 2. VALIDAR SI EL CLIENTE TIENE OTRAS VENTAS ACTIVAS ANTES DE DESACTIVARLO
                if (sale.client != null)
                {
                    // Buscar todas las ventas activas del cliente (excluyendo la actual que se está desistiendo)
                    var otherActiveSales = await _context.Sales
                        .Where(s => s.id_Clients == sale.client.id_Clients &&
                                   s.id_Sales != sale.id_Sales &&
                                   s.status == "Active") // Usando 'Active' para otras ventas
                        .CountAsync();

                    Console.WriteLine($"[WithdrawalServices] Cliente {sale.client.id_Clients} tiene {otherActiveSales} ventas activas adicionales");

                    // Solo desactivar el cliente si NO tiene otras ventas activas
                    if (otherActiveSales == 0)
                    {
                        var client = await _context.Clients.FirstOrDefaultAsync(c => c.id_Clients == sale.client.id_Clients);
                        if (client != null)
                        {
                            client.status = "Inactivo"; // Usando 'Inactivo' para el cliente
                            _context.Clients.Update(client);
                            Console.WriteLine($"[WithdrawalServices] Cliente {client.id_Clients} desactivado - no tiene más ventas activas");
                        }
                    }
                    else
                    {
                        Console.WriteLine($"[WithdrawalServices] Cliente {sale.client.id_Clients} mantiene estado activo - tiene {otherActiveSales} ventas activas restantes");
                    }
                }

                // 3. LIBERAR EL LOTE AUTOMÁTICAMENTE (cambiar estado a "Libre")
                if (sale.lot != null)
                {
                    var lot = await _context.Lots.FirstOrDefaultAsync(l => l.id_Lots == sale.lot.id_Lots);
                    if (lot != null)
                    {
                        lot.status = "Libre"; // Usando 'Libre' para el lote
                        _context.Lots.Update(lot);
                        Console.WriteLine($"[WithdrawalServices] Lote {lot.id_Lots} liberado automáticamente por desistimiento");
                    }
                }

                _context.Withdrawals.Add(withdrawal);
                _context.Sales.Update(sale);

                await _context.SaveChangesAsync();

                Console.WriteLine($"[WithdrawalServices] Desistimiento creado exitosamente. ID: {withdrawal.id_Withdrawals}, Penalización: {withdrawal.penalty}");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WithdrawalServices] Error en CreateWithdrawal: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[WithdrawalServices] Inner Exception: {ex.InnerException.Message}");
                    Console.WriteLine($"[WithdrawalServices] Inner Exception Stack Trace: {ex.InnerException.StackTrace}");
                }
                Console.WriteLine($"[WithdrawalServices] Stack Trace: {ex.StackTrace}");
                throw; // Re-lanza la excepción para que el controlador la capture
            }
        }

        /// <summary>
        /// Actualiza un desistimiento existente y recalcula la penalización si es necesario.
        /// </summary>
        public async Task<bool> UpdateWithdrawal(int id_Withdrawals, Withdrawal updatedWithdrawal)
        {
            try
            {
                Console.WriteLine($"[WithdrawalServices] Iniciando UpdateWithdrawal para ID: {id_Withdrawals}");
                Console.WriteLine($"[WithdrawalServices] Updated Withdrawal object received: Date={updatedWithdrawal.withdrawal_date}, Reason={updatedWithdrawal.reason}, SaleID={updatedWithdrawal.id_Sales}, Penalty={updatedWithdrawal.penalty}");

                var existingWithdrawal = await _context.Withdrawals.AsNoTracking().FirstOrDefaultAsync(w => w.id_Withdrawals == id_Withdrawals);
                if (existingWithdrawal == null)
                {
                    Console.WriteLine($"[WithdrawalServices] Desistimiento con ID {id_Withdrawals} no encontrado para actualizar.");
                    return false;
                }

                if (id_Withdrawals != updatedWithdrawal.id_Withdrawals)
                {
                    Console.WriteLine($"[WithdrawalServices] Mismatch: URL ID {id_Withdrawals} vs Body ID {updatedWithdrawal.id_Withdrawals}");
                    throw new ArgumentException("El ID del desistimiento en la URL no coincide con el ID del desistimiento en el cuerpo de la solicitud.");
                }

                var sale = await _saleServices.GetSaleById(updatedWithdrawal.id_Sales);
                if (sale == null)
                {
                    throw new InvalidOperationException("La venta asociada al desistimiento no existe.");
                }

                // Guardar la penalización anterior para ajustar el recaudo del proyecto
                var previousPenalty = existingWithdrawal.penalty ?? 0;

                // Recalcular la penalización
                updatedWithdrawal.penalty = await CalculatePenalty(updatedWithdrawal.id_Sales);
                Console.WriteLine($"[WithdrawalServices] Penalización recalculada para actualización: {updatedWithdrawal.penalty}");

                // Asegurarse de que el ID del objeto actualizado coincida con el de la URL
                updatedWithdrawal.id_Withdrawals = id_Withdrawals;

                _context.Entry(existingWithdrawal).CurrentValues.SetValues(updatedWithdrawal);
                _context.Entry(updatedWithdrawal).State = EntityState.Modified; // Asegurar que EF lo marque como modificado

                await _context.SaveChangesAsync();

                Console.WriteLine($"[WithdrawalServices] Desistimiento actualizado exitosamente. ID: {id_Withdrawals}");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WithdrawalServices] Error en UpdateWithdrawal: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[WithdrawalServices] Inner Exception: {ex.InnerException.Message}");
                    Console.WriteLine($"[WithdrawalServices] Inner Exception Stack Trace: {ex.InnerException.StackTrace}");
                }
                Console.WriteLine($"[WithdrawalServices] Stack Trace: {ex.StackTrace}");
                throw;
            }
        }

        /// <summary>
        /// Elimina un desistimiento y revierte los cambios en la venta, cliente y lote.
        /// Solo reactiva el cliente si estaba inactivo.
        /// </summary>
        public async Task<bool> DeleteWithdrawal(int id_Withdrawals)
        {
            try
            {
                Console.WriteLine($"[WithdrawalServices] Iniciando DeleteWithdrawal para ID: {id_Withdrawals}");
                var withdrawal = await _context.Withdrawals
                    .Include(w => w.sale)
                    .ThenInclude(s => s.client)
                    .Include(w => w.sale)
                    .ThenInclude(s => s.lot)
                    .FirstOrDefaultAsync(w => w.id_Withdrawals == id_Withdrawals);

                if (withdrawal == null)
                {
                    Console.WriteLine($"[WithdrawalServices] Desistimiento con ID {id_Withdrawals} no encontrado para eliminar.");
                    return false;
                }

                var sale = await _saleServices.GetSaleById(withdrawal.id_Sales);
                if (sale == null)
                {
                    throw new InvalidOperationException("La venta asociada al desistimiento no existe.");
                }

                // 1. Reactivar la venta a 'Active'
                sale.status = "Active"; // Usando el valor 'Active' del ENUM
                Console.WriteLine($"[WithdrawalServices] Estado de venta {sale.id_Sales} cambiado a 'Active'.");

                // 2. REACTIVAR EL CLIENTE SOLO SI ESTABA INACTIVO
                if (withdrawal.sale.client != null)
                {
                    var client = await _context.Clients.FirstOrDefaultAsync(c => c.id_Clients == withdrawal.sale.client.id_Clients);
                    if (client != null && client.status == "Inactivo") // Solo verificar 'Inactivo'
                    {
                        client.status = "Activo"; // Usando 'Activo' para el cliente
                        _context.Clients.Update(client);
                        Console.WriteLine($"[WithdrawalServices] Cliente {client.id_Clients} reactivado automáticamente");
                    }
                    else if (client != null)
                    {
                        Console.WriteLine($"[WithdrawalServices] Cliente {client.id_Clients} ya estaba activo - no se modificó");
                    }
                }

                // 3. MARCAR EL LOTE COMO VENDIDO NUEVAMENTE
                if (withdrawal.sale.lot != null)
                {
                    var lot = await _context.Lots.FirstOrDefaultAsync(l => l.id_Lots == withdrawal.sale.lot.id_Lots);
                    if (lot != null)
                    {
                        lot.status = "Vendido"; // Usando 'Vendido' para el lote
                        _context.Lots.Update(lot);
                        Console.WriteLine($"[WithdrawalServices] Lote {lot.id_Lots} marcado como vendido nuevamente");
                    }
                }

                _context.Withdrawals.Remove(withdrawal);
                _context.Sales.Update(sale);

                await _context.SaveChangesAsync();

                Console.WriteLine($"[WithdrawalServices] Desistimiento eliminado exitosamente. ID: {id_Withdrawals}");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WithdrawalServices] Error en DeleteWithdrawal: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[WithdrawalServices] Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }
    }
}
