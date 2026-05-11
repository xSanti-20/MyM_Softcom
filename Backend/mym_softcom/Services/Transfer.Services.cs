using mym_softcom.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace mym_softcom.Services
{
    public class TransferService
    {
        private readonly AppDbContext _context;
        private readonly SaleServices _saleServices;
        private readonly PlanServices _planServices;

        public TransferService(AppDbContext context, SaleServices saleServices, PlanServices planServices)
        {
            _context = context;
            _saleServices = saleServices;
            _planServices = planServices;
        }

        /// <summary>
        /// Obtiene todos los traslados registrados
        /// </summary>
        public async Task<IEnumerable<Transfer>> GetAllTransfers()
        {
            try
            {
                var transfers = await _context.Transfers
                    .Include(t => t.sale_origen)
                    .ThenInclude(s => s.lot)
                    .ThenInclude(l => l.project)
                    .Include(t => t.sale_origen)
                    .ThenInclude(s => s.client)
                    .Include(t => t.sale_destino)
                    .ThenInclude(s => s.lot)
                    .ThenInclude(l => l.project)
                    .Include(t => t.sale_destino)
                    .ThenInclude(s => s.client)
                    .Include(t => t.client)
                    .ToListAsync();

                return transfers ?? new List<Transfer>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TransferService] Error en GetAllTransfers: {ex.Message}");
                return new List<Transfer>();
            }
        }

        /// <summary>
        /// Obtiene un traslado específico por ID
        /// </summary>
        public async Task<Transfer?> GetTransferById(int id_Transfers)
        {
            Console.WriteLine($"[TransferService] Buscando traslado con id_Transfers: {id_Transfers}");
            return await _context.Transfers
                .Include(t => t.sale_origen)
                .ThenInclude(s => s.lot)
                .ThenInclude(l => l.project)
                .Include(t => t.sale_origen)
                .ThenInclude(s => s.client)
                .Include(t => t.sale_origen)
                .ThenInclude(s => s.plan)
                .Include(t => t.sale_destino)
                .ThenInclude(s => s.lot)
                .ThenInclude(l => l.project)
                .Include(t => t.sale_destino)
                .ThenInclude(s => s.client)
                .Include(t => t.sale_destino)
                .ThenInclude(s => s.plan)
                .Include(t => t.transfer_details)
                .FirstOrDefaultAsync(t => t.id_Transfers == id_Transfers);
        }

        /// <summary>
        /// Obtiene traslados de un cliente específico
        /// </summary>
        public async Task<IEnumerable<Transfer>> GetTransfersByClientId(int id_Clients)
        {
            return await _context.Transfers
                .Where(t => t.id_Clients == id_Clients)
                .Include(t => t.sale_origen)
                .ThenInclude(s => s.lot)
                .ThenInclude(l => l.project)
                .Include(t => t.sale_destino)
                .ThenInclude(s => s.lot)
                .ThenInclude(l => l.project)
                .Include(t => t.transfer_details)
                .ToListAsync();
        }

        /// <summary>
        /// Crea un traslado de cartera (Completo o Parcial)
        /// </summary>
        public async Task<(bool success, string message, Transfer? transfer)> CreateTransfer(CreateTransferRequest request)
        {
            try
            {
                // ✅ LOGGING DETALLADO
                Console.WriteLine("[TransferService] ===== INICIANDO CreateTransfer =====");
                Console.WriteLine($"[TransferService] IdSalesOrigen: {request.IdSalesOrigen}");
                Console.WriteLine($"[TransferService] IdSalesDestino: {request.IdSalesDestino}");
                Console.WriteLine($"[TransferService] Type: {request.Type}");
                Console.WriteLine($"[TransferService] AmountTransferred: {request.AmountTransferred}");
                Console.WriteLine($"[TransferService] AccountingNote: {request.AccountingNote}");

                var errors = new List<string>();

                // Validación 1: Obtener ambas sales
                Console.WriteLine("[TransferService] Obteniendo ventas...");
                var saleOrigen = await _saleServices.GetSaleById(request.IdSalesOrigen);
                var saleDestino = await _saleServices.GetSaleById(request.IdSalesDestino);

                Console.WriteLine($"[TransferService] SaleOrigen encontrada: {saleOrigen != null}");
                Console.WriteLine($"[TransferService] SaleDestino encontrada: {saleDestino != null}");

                if (saleOrigen == null)
                    errors.Add("La venta de origen no existe.");

                if (saleDestino == null)
                    errors.Add("La venta de destino no existe.");

                if (errors.Count > 0)
                {
                    Console.WriteLine($"[TransferService] ❌ Errores iniciales: {string.Join(" | ", errors)}");
                    return (false, "Errores de validación", null);
                }

                // Validación 2: Deben ser del mismo cliente
                Console.WriteLine($"[TransferService] Cliente Origen: {saleOrigen.id_Clients}, Cliente Destino: {saleDestino.id_Clients}");
                if (saleOrigen.id_Clients != saleDestino.id_Clients)
                    errors.Add("Ambas ventas deben pertenecer al mismo cliente.");

                // Validación 3: No pueden ser desistidas
                Console.WriteLine($"[TransferService] Status Origen: {saleOrigen.status}, Status Destino: {saleDestino.status}");
                if (saleOrigen.status == "Desistida")
                    errors.Add("La venta de origen no puede estar en estado 'Desistida'.");

                if (saleDestino.status == "Desistida")
                    errors.Add("La venta de destino no puede estar en estado 'Desistida'.");

                // Validación 4: Deben ser lotes diferentes
                Console.WriteLine($"[TransferService] Lote Origen: {saleOrigen.id_Lots}, Lote Destino: {saleDestino.id_Lots}");
                if (saleOrigen.id_Lots == saleDestino.id_Lots)
                    errors.Add("El lote de origen y destino deben ser diferentes.");

                // Validación 5: El cliente debe tener más de 1 lote activo
                var clientSales = await _context.Sales
                    .Where(s => s.id_Clients == saleOrigen.id_Clients && s.status != "Desistida")
                    .GroupBy(s => s.id_Lots)
                    .CountAsync();

                Console.WriteLine($"[TransferService] Lotes activos del cliente: {clientSales}");
                if (clientSales < 2)
                    errors.Add("El cliente debe tener al menos 2 lotes activos para hacer un traslado.");

                // Validación 6: Monto válido
                var montoDisponible = saleOrigen.total_raised ?? 0;
                Console.WriteLine($"[TransferService] Monto disponible: {montoDisponible}, Monto a trasladar: {request.AmountTransferred}");
                if (request.AmountTransferred <= 0 || request.AmountTransferred > montoDisponible)
                    errors.Add($"El monto a trasladar no es válido. Disponible: {montoDisponible}");

                // Validación 7: Si es Parcial, la nota es obligatoria
                if (request.Type == "Parcial" && string.IsNullOrWhiteSpace(request.AccountingNote))
                    errors.Add("La nota contable es obligatoria en traslados parciales.");

                if (errors.Count > 0)
                {
                    Console.WriteLine($"[TransferService] ❌ Errores de validación: {string.Join(" | ", errors)}");
                    return (false, string.Join(" | ", errors), null);
                }

                Console.WriteLine("[TransferService] ✅ Todas las validaciones pasaron");

                // Crear el Transfer
                Console.WriteLine("[TransferService] Creando nuevo Transfer...");
                var transfer = new Transfer
                {
                    transfer_date = DateTime.Now,
                    type = request.Type,
                    amount_transferred = request.AmountTransferred,
                    accounting_note = request.AccountingNote ?? string.Empty,
                    status = "Completado",
                    id_Sales_Origen = request.IdSalesOrigen,
                    id_Sales_Destino = request.IdSalesDestino,
                    id_Clients = saleOrigen.id_Clients
                };

                Console.WriteLine($"[TransferService] Transfer creado");

                _context.Transfers.Add(transfer);
                await _context.SaveChangesAsync();

                Console.WriteLine($"[TransferService] ✅ Transfer guardado con ID: {transfer.id_Transfers}");

                // Calcular distribución de cuotas para el lote destino
                Console.WriteLine("[TransferService] Calculando distribución de cuotas...");
                var distributions = await DistributeAmountIntoQuotas(saleDestino, request.AmountTransferred);
                Console.WriteLine($"[TransferService] Distribución calculada: {distributions.Count} cuotas");

                // Crear TransferDetails y Payment details para marcar las cuotas como pagadas
                Console.WriteLine("[TransferService] Creando Payment y Details para cuotas destino...");
                
                var payment = new Payment
                {
                    payment_date = DateTime.Now,
                    amount = request.AmountTransferred,
                    payment_method = "Traslado de Cartera",
                    id_Sales = saleDestino.id_Sales
                };
                
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync(); // Guardar payment para obtener su ID
                
                Console.WriteLine($"[TransferService] Payment creado con ID: {payment.id_Payments}");

                // Crear Details para cada cuota que recibe el traslado
                foreach (var dist in distributions)
                {
                    Console.WriteLine($"[TransferService] Agregando TransferDetail: Cuota {dist.QuotaNumber} = {dist.Amount}");
                    var transferDetail = new TransferDetail
                    {
                        id_Transfers = transfer.id_Transfers,
                        number_quota = dist.QuotaNumber,
                        amount = dist.Amount
                    };
                    _context.TransferDetails.Add(transferDetail);

                    // Crear Detail para marcar la cuota como pagada
                    Console.WriteLine($"[TransferService] Creando Detail: Cuota {dist.QuotaNumber} como pagada");
                    var detail = new Detail
                    {
                        id_Payments = payment.id_Payments,
                        id_Sales = saleDestino.id_Sales,
                        number_quota = dist.QuotaNumber,
                        covered_amount = dist.Amount
                    };
                    _context.Details.Add(detail);
                }

                // Actualizar saldos en las ventas
                Console.WriteLine("[TransferService] Actualizando saldos de ventas...");
                saleOrigen.total_raised = (saleOrigen.total_raised ?? 0) - request.AmountTransferred;
                saleOrigen.total_debt = (saleOrigen.total_debt ?? 0) + request.AmountTransferred;

                saleDestino.total_raised = (saleDestino.total_raised ?? 0) + request.AmountTransferred;
                saleDestino.total_debt = (saleDestino.total_debt ?? 0) - request.AmountTransferred;

                Console.WriteLine($"[TransferService] Venta Origen: total_raised = {saleOrigen.total_raised}, total_debt = {saleOrigen.total_debt}");
                Console.WriteLine($"[TransferService] Venta Destino: total_raised = {saleDestino.total_raised}, total_debt = {saleDestino.total_debt}");

                _context.Sales.Update(saleOrigen);
                _context.Sales.Update(saleDestino);

                await _context.SaveChangesAsync();

                Console.WriteLine($"[TransferService] ✅ Traslado creado exitosamente. ID: {transfer.id_Transfers}");

                return (true, "Traslado creado exitosamente.", transfer);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TransferService] ❌ Error al crear traslado: {ex.Message}");
                Console.WriteLine($"[TransferService] StackTrace: {ex.StackTrace}");
                return (false, $"Error al crear traslado: {ex.Message}", null);
            }
        }

        /// <summary>
        /// Distribuye un monto en las cuotas del plan de una venta de forma SECUENCIAL
        /// Saltando las cuotas ya pagadas y empezando desde la primera con saldo pendiente
        /// </summary>
        private async Task<List<(int QuotaNumber, decimal Amount)>> DistributeAmountIntoQuotas(Sale sale, decimal amount)
        {
            var distributions = new List<(int QuotaNumber, decimal Amount)>();

            if (sale.plan == null || sale.plan.number_quotas == null || sale.plan.number_quotas.Value <= 0)
            {
                Console.WriteLine($"[TransferService] Plan inválido para venta {sale.id_Sales}");
                return distributions;
            }

            var numberOfQuotas = sale.plan.number_quotas.Value;
            var baseQuotaValue = sale.quota_value ?? 0;
            var remainingAmount = amount;

            Console.WriteLine($"[TransferService] Distribuyendo ${amount:F2} en {numberOfQuotas} cuotas de ${baseQuotaValue:F2} cada una");

            // Obtener los Details ya registrados para esta venta (cuotas pagadas)
            var existingDetails = await _context.Details
                .AsNoTracking()
                .Where(d => d.id_Sales == sale.id_Sales)
                .ToListAsync();

            Console.WriteLine($"[TransferService] Encontrados {existingDetails.Count} Details ya registrados");

            // Calcular el monto cubierto por cada cuota
            var coveredAmountsPerQuota = existingDetails
                .GroupBy(d => d.number_quota)
                .ToDictionary(g => g.Key, g => g.Sum(d => d.covered_amount ?? 0));

            Console.WriteLine($"[TransferService] Cuotas cubiertas: {string.Join(", ", coveredAmountsPerQuota.Select(kvp => $"Cuota {kvp.Key}=${kvp.Value:F2}"))}");

            // Distribuir secuencialmente empezando desde la primera cuota INCOMPLETA
            for (int i = 1; i <= numberOfQuotas; i++)
            {
                if (remainingAmount <= 0)
                {
                    Console.WriteLine($"[TransferService] Se agotó el monto a distribuir en cuota #{i}");
                    break;
                }

                // Calcular cuánto falta por pagar en esta cuota
                decimal currentCovered = coveredAmountsPerQuota.GetValueOrDefault(i, 0);
                decimal remainingForThisQuota = baseQuotaValue - currentCovered;

                // Si la cuota ya está completamente cubierta, saltar
                if (remainingForThisQuota <= 0)
                {
                    Console.WriteLine($"[TransferService] Cuota #{i}: YA PAGADA (${currentCovered:F2}/${baseQuotaValue:F2}). Saltando...");
                    continue;
                }

                // Aplicar el mínimo entre lo que queda del traslado y lo que falta de la cuota
                decimal amountToApplyToThisQuota = Math.Min(remainingAmount, remainingForThisQuota);

                distributions.Add((i, Math.Round(amountToApplyToThisQuota, 2)));

                remainingAmount -= amountToApplyToThisQuota;

                Console.WriteLine($"[TransferService] Cuota #{i}: Aplicados ${amountToApplyToThisQuota:F2} (${currentCovered:F2} + ${amountToApplyToThisQuota:F2} = ${currentCovered + amountToApplyToThisQuota:F2}/${baseQuotaValue:F2}). Restante del traslado: ${remainingAmount:F2}");
            }

            if (remainingAmount > 0)
            {
                Console.WriteLine($"[TransferService] ⚠️ Advertencia: Quedaron ${remainingAmount:F2} sin distribuir después de cubrir todas las cuotas");
            }

            return distributions;
        }

        /// <summary>
        /// Obtiene el resumen de un traslado para mostrar en respuesta
        /// </summary>
        public async Task<TransferDetailedInfo?> GetTransferDetailedInfo(int id_Transfers)
        {
            var transfer = await GetTransferById(id_Transfers);

            if (transfer == null)
                return null;

            var distribuciones = transfer.transfer_details?.Select(td => new TransferQuotaDistribution
            {
                Numero_Cuota = td.number_quota,
                Monto = td.amount
            }).ToList() ?? new List<TransferQuotaDistribution>();

            return new TransferDetailedInfo
            {
                Id_Transfers = transfer.id_Transfers,
                Fecha_Traslado = transfer.transfer_date,
                Tipo = transfer.type,
                Monto_Trasladado = transfer.amount_transferred,
                Nota_Contable = transfer.accounting_note,
                Status = transfer.status,

                Id_Venta_Origen = transfer.sale_origen?.id_Sales ?? 0,
                Lote_Origen = transfer.sale_origen?.lot?.block + "-" + transfer.sale_origen?.lot?.lot_number ?? "N/A",
                Proyecto_Origen = transfer.sale_origen?.lot?.project?.name ?? "N/A",
                Saldo_Anterior_Origen = (transfer.sale_origen?.total_raised ?? 0) + transfer.amount_transferred,
                Saldo_Nuevo_Origen = transfer.sale_origen?.total_raised ?? 0,

                Id_Venta_Destino = transfer.sale_destino?.id_Sales ?? 0,
                Lote_Destino = transfer.sale_destino?.lot?.block + "-" + transfer.sale_destino?.lot?.lot_number ?? "N/A",
                Proyecto_Destino = transfer.sale_destino?.lot?.project?.name ?? "N/A",
                Saldo_Anterior_Destino = (transfer.sale_destino?.total_raised ?? 0) - transfer.amount_transferred,
                Saldo_Nuevo_Destino = transfer.sale_destino?.total_raised ?? 0,

                Id_Cliente = transfer.client?.id_Clients ?? 0,
                Nombre_Cliente = (transfer.client?.names + " " + transfer.client?.surnames) ?? "N/A",
                Documento_Cliente = transfer.client?.document ?? 0,

                Distribuciones = distribuciones
            };
        }

        /// <summary>
        /// Elimina un traslado y revierte todos los cambios (REVERSIÓN AUTOMÁTICA)
        /// </summary>
        public async Task<(bool success, string message)> DeleteTransfer(int id_Transfers)
        {
            try
            {
                Console.WriteLine("[TransferService] ===== INICIANDO DeleteTransfer =====");
                Console.WriteLine($"[TransferService] Eliminando traslado con ID: {id_Transfers}");

                // Obtener el traslado con todas sus relaciones
                var transfer = await GetTransferById(id_Transfers);

                if (transfer == null)
                    return (false, "Traslado no encontrado.");

                Console.WriteLine($"[TransferService] Traslado encontrado. Monto: {transfer.amount_transferred}");

                // Obtener las ventas actualizadas
                var saleOrigen = await _saleServices.GetSaleById(transfer.id_Sales_Origen);
                var saleDestino = await _saleServices.GetSaleById(transfer.id_Sales_Destino);

                if (saleOrigen == null || saleDestino == null)
                    return (false, "Las ventas relacionadas no existen.");

                // REVERSIÓN: Devolver el dinero a su estado anterior
                Console.WriteLine("[TransferService] Revirtiendo cambios en saldos...");
                
                // Lo opuesto a lo que se hizo al crear:
                // Venta Origen: restamos dinero, ahora lo devolvemos
                saleOrigen.total_raised = (saleOrigen.total_raised ?? 0) + transfer.amount_transferred;
                saleOrigen.total_debt = (saleOrigen.total_debt ?? 0) - transfer.amount_transferred;

                // Venta Destino: agregamos dinero, ahora lo quitamos
                saleDestino.total_raised = (saleDestino.total_raised ?? 0) - transfer.amount_transferred;
                saleDestino.total_debt = (saleDestino.total_debt ?? 0) + transfer.amount_transferred;

                Console.WriteLine($"[TransferService] Venta Origen revertida: total_raised = {saleOrigen.total_raised}, total_debt = {saleOrigen.total_debt}");
                Console.WriteLine($"[TransferService] Venta Destino revertida: total_raised = {saleDestino.total_raised}, total_debt = {saleDestino.total_debt}");

                // Actualizar ventas
                _context.Sales.Update(saleOrigen);
                _context.Sales.Update(saleDestino);

                // Buscar y eliminar el Payment de traslado asociado
                Console.WriteLine("[TransferService] Buscando Payment asociado al traslado...");
                var transferPayment = await _context.Payments
                    .Where(p => p.id_Sales == transfer.id_Sales_Destino && 
                               p.payment_method == "Traslado de Cartera" &&
                               p.amount == transfer.amount_transferred)
                    .FirstOrDefaultAsync();

                if (transferPayment != null)
                {
                    Console.WriteLine($"[TransferService] Payment encontrado con ID: {transferPayment.id_Payments}. Eliminando...");
                    
                    // Eliminar Details asociados al Payment
                    var paymentDetails = _context.Details.Where(d => d.id_Payments == transferPayment.id_Payments).ToList();
                    Console.WriteLine($"[TransferService] Eliminando {paymentDetails.Count} Details del Payment...");
                    _context.Details.RemoveRange(paymentDetails);
                    
                    // Eliminar el Payment
                    _context.Payments.Remove(transferPayment);
                    Console.WriteLine($"[TransferService] Payment eliminado exitosamente");
                }
                else
                {
                    Console.WriteLine("[TransferService] No se encontró Payment asociado. Continuando con la eliminación del Transfer...");
                }

                // Eliminar TransferDetails
                var transferDetails = _context.TransferDetails.Where(td => td.id_Transfers == id_Transfers).ToList();
                Console.WriteLine($"[TransferService] Eliminando {transferDetails.Count} detalles de traslado...");
                _context.TransferDetails.RemoveRange(transferDetails);

                // Eliminar Transfer
                _context.Transfers.Remove(transfer);

                await _context.SaveChangesAsync();

                Console.WriteLine($"[TransferService] ✅ Traslado eliminado exitosamente con reversión automática.");
                return (true, "Traslado eliminado exitosamente. Los cambios fueron revertidos.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TransferService] ❌ Error al eliminar traslado: {ex.Message}");
                Console.WriteLine($"[TransferService] StackTrace: {ex.StackTrace}");
                return (false, $"Error al eliminar traslado: {ex.Message}");
            }
        }

        /// <summary>
        /// Actualiza un traslado existente (solo ciertos campos)
        /// </summary>
        public async Task<(bool success, string message)> UpdateTransfer(int id_Transfers, string? accountingNote)
        {
            try
            {
                Console.WriteLine("[TransferService] ===== INICIANDO UpdateTransfer =====");
                Console.WriteLine($"[TransferService] Actualizando traslado con ID: {id_Transfers}");

                var transfer = await _context.Transfers.FirstOrDefaultAsync(t => t.id_Transfers == id_Transfers);

                if (transfer == null)
                    return (false, "Traslado no encontrado.");

                // Solo permitir editar la nota contable
                Console.WriteLine($"[TransferService] Nota anterior: {transfer.accounting_note}");
                transfer.accounting_note = accountingNote ?? string.Empty;
                Console.WriteLine($"[TransferService] Nota nueva: {transfer.accounting_note}");

                _context.Transfers.Update(transfer);
                await _context.SaveChangesAsync();

                Console.WriteLine($"[TransferService] ✅ Traslado actualizado exitosamente.");
                return (true, "Traslado actualizado exitosamente.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TransferService] ❌ Error al actualizar traslado: {ex.Message}");
                Console.WriteLine($"[TransferService] StackTrace: {ex.StackTrace}");
                return (false, $"Error al actualizar traslado: {ex.Message}");
            }
        }
    }
}
