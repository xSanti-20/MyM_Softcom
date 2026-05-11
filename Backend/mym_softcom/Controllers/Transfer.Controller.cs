using Microsoft.AspNetCore.Mvc;
using mym_softcom.Models;
using mym_softcom.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace mym_softcom.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TransferController : ControllerBase
    {
        private readonly TransferService _transferService;

        public TransferController(TransferService transferService)
        {
            _transferService = transferService;
        }

        /// <summary>
        /// Obtiene todos los traslados de cartera registrados
        /// </summary>
        /// <returns>Lista de todos los traslados</returns>
        [HttpGet("GetAllTransfers")]
        public async Task<ActionResult<IEnumerable<Transfer>>> GetAllTransfers()
        {
            try
            {
                Console.WriteLine("[TransferController] Solicitando todos los traslados...");
                var transfers = await _transferService.GetAllTransfers();
                Console.WriteLine($"[TransferController] Se obtuvieron {transfers.Count()} traslados");
                return Ok(transfers);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TransferController] Error: {ex.Message}");
                Console.WriteLine($"[TransferController] Stack Trace: {ex.StackTrace}");
                return BadRequest(new { message = $"Error al obtener traslados: {ex.Message}", stackTrace = ex.StackTrace });
            }
        }

        /// <summary>
        /// Obtiene un traslado específico por ID
        /// </summary>
        /// <param name="id">ID del traslado</param>
        /// <returns>Información del traslado</returns>
        [HttpGet("GetTransferById/{id}")]
        public async Task<ActionResult<Transfer>> GetTransferById(int id)
        {
            try
            {
                var transfer = await _transferService.GetTransferById(id);
                if (transfer == null)
                    return NotFound(new { message = "Traslado no encontrado" });

                return Ok(transfer);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error al obtener traslado: {ex.Message}" });
            }
        }

        /// <summary>
        /// Obtiene traslados de un cliente específico
        /// </summary>
        /// <param name="idCliente">ID del cliente</param>
        /// <returns>Lista de traslados del cliente</returns>
        [HttpGet("GetTransfersByClient/{idCliente}")]
        public async Task<ActionResult<IEnumerable<Transfer>>> GetTransfersByClient(int idCliente)
        {
            try
            {
                var transfers = await _transferService.GetTransfersByClientId(idCliente);
                return Ok(transfers);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error al obtener traslados del cliente: {ex.Message}" });
            }
        }

        /// <summary>
        /// Obtiene información detallada de un traslado
        /// </summary>
        /// <param name="id">ID del traslado</param>
        /// <returns>Información detallada con distribuciones</returns>
        [HttpGet("GetTransferDetails/{id}")]
        public async Task<ActionResult<TransferDetailedInfo>> GetTransferDetails(int id)
        {
            try
            {
                var transferInfo = await _transferService.GetTransferDetailedInfo(id);
                if (transferInfo == null)
                    return NotFound(new { message = "Traslado no encontrado" });

                return Ok(transferInfo);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error al obtener detalles del traslado: {ex.Message}" });
            }
        }

        /// <summary>
        /// Crea un nuevo traslado de cartera (Completo o Parcial)
        /// </summary>
        /// <param name="request">Datos del traslado</param>
        /// <returns>Respuesta con información del traslado creado</returns>
        [HttpPost("CreateTransfer")]
        public async Task<ActionResult<TransferResponse>> CreateTransfer([FromBody] CreateTransferRequest request)
        {
            try
            {
                // LOGGING DETALLADO
                Console.WriteLine("[TransferController] ===== RECIBIENDO CreateTransfer =====");
                Console.WriteLine($"[TransferController] Request recibido: {request}");
                Console.WriteLine($"[TransferController] Type: {request?.Type}");
                Console.WriteLine($"[TransferController] IdSalesOrigen: {request?.IdSalesOrigen}");
                Console.WriteLine($"[TransferController] IdSalesDestino: {request?.IdSalesDestino}");
                Console.WriteLine($"[TransferController] AmountTransferred: {request?.AmountTransferred}");
                Console.WriteLine($"[TransferController] AccountingNote: {request?.AccountingNote}");
                Console.WriteLine($"[TransferController] ModelState.IsValid: {ModelState.IsValid}");

                // Loguear errores de ModelState
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                    Console.WriteLine($"[TransferController] Errores de ModelState: {string.Join(" | ", errors)}");
                    foreach (var error in errors)
                    {
                        Console.WriteLine($"  - {error}");
                    }
                    return BadRequest(new { message = "ModelState inválido", errors = errors, modelState = ModelState });
                }

                // Validación básica
                if (string.IsNullOrWhiteSpace(request.Type) || (request.Type != "Completo" && request.Type != "Parcial"))
                {
                    return BadRequest(new TransferResponse
                    {
                        Success = false,
                        Message = "El tipo de traslado debe ser 'Completo' o 'Parcial'",
                        Errors = new List<string> { "Tipo de traslado inválido" }
                    });
                }

                var (success, message, transfer) = await _transferService.CreateTransfer(request);

                if (!success)
                {
                    return BadRequest(new TransferResponse
                    {
                        Success = false,
                        Message = message,
                        Errors = new List<string> { message }
                    });
                }

                // Obtener información detallada del traslado creado
                var transferInfo = await _transferService.GetTransferDetailedInfo(transfer?.id_Transfers ?? 0);

                return Ok(new TransferResponse
                {
                    Success = true,
                    Message = "Traslado creado exitosamente",
                    Transfer = transferInfo
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TransferController] Error: {ex.Message}");
                Console.WriteLine($"[TransferController] StackTrace: {ex.StackTrace}");
                return BadRequest(new TransferResponse
                {
                    Success = false,
                    Message = $"Error al crear traslado: {ex.Message}",
                    Errors = new List<string> { ex.Message }
                });
            }
        }

        /// <summary>
        /// Elimina un traslado con reversión automática de cambios
        /// </summary>
        /// <param name="id">ID del traslado a eliminar</param>
        /// <returns>Respuesta de éxito o error</returns>
        [HttpDelete("DeleteTransfer/{id}")]
        public async Task<ActionResult<TransferResponse>> DeleteTransfer(int id)
        {
            try
            {
                Console.WriteLine($"[TransferController] ===== RECIBIENDO DeleteTransfer =====");
                Console.WriteLine($"[TransferController] ID a eliminar: {id}");

                var (success, message) = await _transferService.DeleteTransfer(id);

                if (!success)
                {
                    return BadRequest(new TransferResponse
                    {
                        Success = false,
                        Message = message,
                        Errors = new List<string> { message }
                    });
                }

                return Ok(new TransferResponse
                {
                    Success = true,
                    Message = message
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TransferController] Error en DeleteTransfer: {ex.Message}");
                Console.WriteLine($"[TransferController] StackTrace: {ex.StackTrace}");
                return BadRequest(new TransferResponse
                {
                    Success = false,
                    Message = $"Error al eliminar traslado: {ex.Message}",
                    Errors = new List<string> { ex.Message }
                });
            }
        }

        /// <summary>
        /// Actualiza un traslado existente
        /// </summary>
        /// <param name="id">ID del traslado a actualizar</param>
        /// <param name="request">Datos a actualizar (solo nota contable)</param>
        /// <returns>Respuesta de éxito o error</returns>
        [HttpPut("UpdateTransfer/{id}")]
        public async Task<ActionResult<TransferResponse>> UpdateTransfer(int id, [FromBody] UpdateTransferRequest request)
        {
            try
            {
                Console.WriteLine($"[TransferController] ===== RECIBIENDO UpdateTransfer =====");
                Console.WriteLine($"[TransferController] ID a actualizar: {id}");
                Console.WriteLine($"[TransferController] AccountingNote: {request?.AccountingNote}");

                var (success, message) = await _transferService.UpdateTransfer(id, request?.AccountingNote);

                if (!success)
                {
                    return BadRequest(new TransferResponse
                    {
                        Success = false,
                        Message = message,
                        Errors = new List<string> { message }
                    });
                }

                return Ok(new TransferResponse
                {
                    Success = true,
                    Message = message
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TransferController] Error en UpdateTransfer: {ex.Message}");
                Console.WriteLine($"[TransferController] StackTrace: {ex.StackTrace}");
                return BadRequest(new TransferResponse
                {
                    Success = false,
                    Message = $"Error al actualizar traslado: {ex.Message}",
                    Errors = new List<string> { ex.Message }
                });
            }
        }
    }
}
