using mym_softcom.Models;
using mym_softcom; // Asumiendo que AppDbContext está en este namespace
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace mym_softcom.Services
{
    public class SaleServices
    {
        private readonly AppDbContext _context;
        private readonly PlanServices _planServices;
        private readonly LotServices _lotServices;

        public SaleServices(AppDbContext context, PlanServices planServices, LotServices lotServices)
        {
            _context = context;
            _planServices = planServices;
            _lotServices = lotServices;
        }

        /// <summary>
        /// Obtiene todas las ventas, incluyendo sus relaciones.
        /// </summary>
        public async Task<IEnumerable<Sale>> GetAllSales()
        {
            return await _context.Sales
                                 .Include(s => s.client)
                                 .Include(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(s => s.user)
                                 .Include(s => s.plan)
                                 .ToListAsync();
        }

        /// <summary>
        /// Obtiene una venta específica por su ID, incluyendo sus relaciones.
        /// </summary>
        public async Task<Sale?> GetSaleById(int id_Sales)
        {
            Console.WriteLine($"[SaleServices] Buscando venta con id_Sales: {id_Sales}");
            return await _context.Sales
                                 .Include(s => s.client)
                                 .Include(s => s.lot)
                                 .ThenInclude(l => l.project)
                                 .Include(s => s.user)
                                 .Include(s => s.plan)
                                 .FirstOrDefaultAsync(s => s.id_Sales == id_Sales);
        }

        /// <summary>
        /// Crea una nueva venta, calcula el valor de la cuota y establece el recaudo inicial.
        /// Además, cambia el estado del lote de "Libre" a "Vendido".
        /// </summary>
        public async Task<bool> CreateSale(Sale sale)
        {
            try
            {
                // Validar que el lote esté "Libre" antes de la venta
                var lot = await _lotServices.GetLotById(sale.id_Lots);
                if (lot == null)
                {
                    throw new InvalidOperationException("El lote especificado no existe.");
                }
                if (lot.status != "Libre")
                {
                    throw new InvalidOperationException($"El lote {lot.block}-{lot.lot_number} no está disponible para la venta. Su estado actual es: {lot.status}");
                }

                // ✅ ACTUALIZACIÓN: Inicializar total_raised con el valor de initial_payment
                sale.total_raised = sale.initial_payment ?? 0;

                // Obtener el plan para el número de cuotas
                var plan = await _planServices.GetPlanById(sale.id_Plans);

                decimal remainingValue = 0;
                if (sale.total_value.HasValue && sale.initial_payment.HasValue)
                {
                    remainingValue = sale.total_value.Value - sale.initial_payment.Value;
                }

                // ✅ NUEVO: Inicializar total_debt
                sale.total_debt = remainingValue;

                if (plan?.number_quotas > 0)
                {
                    // ✅ ACTUALIZACIÓN: Quitar el redondeo, usar el valor exacto
                    sale.quota_value = remainingValue / plan.number_quotas.Value;
                }
                else
                {
                    sale.quota_value = 0; // O manejar como error si el plan o los valores son inválidos
                }

                _context.Sales.Add(sale);
                await _context.SaveChangesAsync();

                // Actualizar el estado del lote a "Vendido"
                await _lotServices.ChangeLotStatus(sale.id_Lots, "Vendido");

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en CreateSale: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        /// <summary>
        /// Actualiza una venta existente, recalcula el valor de la cuota y actualiza el recaudo total y la deuda.
        /// </summary>
        public async Task<bool> UpdateSale(int id_Sales, Sale updatedSale)
        {
            try
            {
                var existingSale = await _context.Sales
                                          .Include(s => s.plan) // Incluir plan para recalcular cuotas
                                          .FirstOrDefaultAsync(s => s.id_Sales == id_Sales);

                if (existingSale == null) return false;

                // Si el lote de la venta cambia, necesitamos actualizar el estado del lote anterior y el nuevo
                if (existingSale.id_Lots != updatedSale.id_Lots)
                {
                    // Marcar el lote anterior como "Libre" (o el estado que corresponda si se cancela la venta)
                    await _lotServices.ChangeLotStatus(existingSale.id_Lots, "Libre"); // Asumiendo que se libera

                    // Marcar el nuevo lote como "Vendido"
                    var newLot = await _lotServices.GetLotById(updatedSale.id_Lots);
                    if (newLot == null)
                    {
                        throw new InvalidOperationException("El nuevo lote especificado no existe.");
                    }
                    if (newLot.status != "Libre")
                    {
                        throw new InvalidOperationException($"El nuevo lote {newLot.block}-{newLot.lot_number} no está disponible para la venta. Su estado actual es: {newLot.status}");
                    }
                    await _lotServices.ChangeLotStatus(updatedSale.id_Lots, "Vendido");
                }

                // Calcular el monto del pago si total_raised ha aumentado
                decimal paymentAmount = 0;
                if (updatedSale.total_raised.HasValue && existingSale.total_raised.HasValue && updatedSale.total_raised.Value > existingSale.total_raised.Value)
                {
                    paymentAmount = updatedSale.total_raised.Value - existingSale.total_raised.Value;
                }
                // Si el initial_payment se actualiza y total_raised era 0, se asume que es el primer pago.
                else if (existingSale.total_raised == 0 && updatedSale.initial_payment.HasValue && updatedSale.initial_payment.Value > 0)
                {
                    paymentAmount = updatedSale.initial_payment.Value;
                }


                // Actualizar propiedades básicas
                existingSale.sale_date = updatedSale.sale_date;
                existingSale.total_value = updatedSale.total_value;
                existingSale.initial_payment = updatedSale.initial_payment;
                existingSale.id_Clients = updatedSale.id_Clients;
                existingSale.id_Lots = updatedSale.id_Lots;
                existingSale.id_Users = updatedSale.id_Users;
                existingSale.id_Plans = updatedSale.id_Plans;
                existingSale.status = updatedSale.status; // Permitir que el estado se actualice desde el frontend

                // ✅ ACTUALIZACIÓN: Sumar el monto pagado a total_raised
                existingSale.total_raised += paymentAmount;

                // ✅ ACTUALIZACIÓN: Restar el monto pagado de total_debt
                if (existingSale.total_debt.HasValue)
                {
                    existingSale.total_debt -= paymentAmount;
                    if (existingSale.total_debt < 0) existingSale.total_debt = 0; // Asegurar que no sea negativo
                }
                else
                {
                    // Si total_debt era null, inicializarlo y luego restar
                    existingSale.total_debt = existingSale.total_value - existingSale.initial_payment - paymentAmount;
                    if (existingSale.total_debt < 0) existingSale.total_debt = 0;
                }


                // Recalcular quota_value si los campos relevantes cambiaron
                Plan? currentPlan = existingSale.plan;
                // Si el ID del plan cambió o el plan no se cargó inicialmente
                if (existingSale.id_Plans != updatedSale.id_Plans || currentPlan == null)
                {
                    currentPlan = await _planServices.GetPlanById(updatedSale.id_Plans);
                }

                decimal newRemainingValue = 0;
                if (existingSale.total_value.HasValue && existingSale.initial_payment.HasValue)
                {
                    newRemainingValue = existingSale.total_value.Value - existingSale.initial_payment.Value;
                }

                if (currentPlan?.number_quotas > 0)
                {
                    // ✅ ACTUALIZACIÓN: Quitar el redondeo, usar el valor exacto
                    existingSale.quota_value = newRemainingValue / currentPlan.number_quotas.Value;
                }
                else
                {
                    existingSale.quota_value = 0;
                }

                _context.Sales.Update(existingSale);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en UpdateSale: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        /// <summary>
        /// Elimina una venta por su ID.
        /// Además, cambia el estado del lote asociado de "Vendido" a "Libre".
        /// </summary>
        public async Task<bool> DeleteSale(int id_Sales)
        {
            try
            {
                var sale = await _context.Sales.FirstOrDefaultAsync(s => s.id_Sales == id_Sales);
                if (sale == null) return false;

                _context.Sales.Remove(sale);
                await _context.SaveChangesAsync();

                // Actualizar el estado del lote a "Libre" al eliminar la venta
                await _lotServices.ChangeLotStatus(sale.id_Lots, "Libre");

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en DeleteSale: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        // ✅ ELIMINADO: La función RoundToNearestMultiple ya no es necesaria
        // private decimal RoundToNearestMultiple(decimal value, int multiple)
        // {
        //     if (multiple == 0) return value;
        //     return Math.Round(value / multiple, MidpointRounding.AwayFromZero) * multiple;
        // }
    }
}
