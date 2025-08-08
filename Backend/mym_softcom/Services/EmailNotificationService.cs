using System.Net;
using System.Net.Mail;
using mym_softcom.Models;

namespace mym_softcom.Services
{
    public interface IEmailNotificationService
    {
        Task<ResponseSend> SendOverdueNotificationAsync(ClientOverdueInfo clientOverdueInfo);
        Task<ResponseSend> SendEmailAsync(string toEmail, string subject, string body);
    }

    public class EmailNotificationService : IEmailNotificationService
    {
        private readonly ConfigServer _emailConfig;
        private readonly ILogger<EmailNotificationService> _logger;

        public EmailNotificationService(ConfigServer emailConfig, ILogger<EmailNotificationService> logger)
        {
            _emailConfig = emailConfig ?? throw new ArgumentNullException(nameof(emailConfig));
            _logger = logger;

            // Validar configuración al inicializar
            if (string.IsNullOrEmpty(_emailConfig.Email))
                throw new InvalidOperationException("Email configuration is missing. Please check ConfigServerEmail in appsettings.json");

            if (string.IsNullOrEmpty(_emailConfig.Password))
                throw new InvalidOperationException("Email password configuration is missing. Please check ConfigServerEmail in appsettings.json");

            if (string.IsNullOrEmpty(_emailConfig.HostName))
                throw new InvalidOperationException("Email hostname configuration is missing. Please check ConfigServerEmail in appsettings.json");
        }

        public async Task<ResponseSend> SendOverdueNotificationAsync(ClientOverdueInfo clientOverdueInfo)
        {
            try
            {
                if (string.IsNullOrEmpty(clientOverdueInfo.Client.email))
                {
                    return new ResponseSend
                    {
                        Status = false,
                        Message = "El cliente no tiene email registrado"
                    };
                }

                var subject = $"Recordatorio de Pago - {clientOverdueInfo.TotalOverdueQuotas} Cuota(s) Vencida(s)";
                var body = GenerateResponsiveOverdueEmailTemplate(clientOverdueInfo);

                return await SendEmailAsync(clientOverdueInfo.Client.email, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error enviando notificación de mora a {Email}", clientOverdueInfo.Client.email);
                return new ResponseSend
                {
                    Status = false,
                    Message = $"Error enviando email: {ex.Message}"
                };
            }
        }

        public async Task<ResponseSend> SendEmailAsync(string toEmail, string subject, string body)
        {
            try
            {
                // Validar email de destino
                if (string.IsNullOrEmpty(toEmail))
                {
                    return new ResponseSend
                    {
                        Status = false,
                        Message = "Email de destino no puede estar vacío"
                    };
                }

                // Validar configuración antes de enviar
                if (string.IsNullOrEmpty(_emailConfig.Email))
                {
                    return new ResponseSend
                    {
                        Status = false,
                        Message = "Configuración de email del servidor no encontrada"
                    };
                }

                _logger.LogInformation("Enviando email desde {FromEmail} hacia {ToEmail}", _emailConfig.Email, toEmail);

                using var client = new SmtpClient(_emailConfig.HostName, _emailConfig.PortHost);
                client.EnableSsl = true;
                client.UseDefaultCredentials = false;
                client.Credentials = new NetworkCredential(_emailConfig.Email, _emailConfig.Password);

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(_emailConfig.Email, "M&M Constructora"),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };

                mailMessage.To.Add(toEmail);

                await client.SendMailAsync(mailMessage);

                _logger.LogInformation("Email enviado exitosamente a {Email}", toEmail);

                return new ResponseSend
                {
                    Status = true,
                    Message = "Email enviado exitosamente"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error enviando email a {Email}. Configuración: Host={Host}, Port={Port}, FromEmail={FromEmail}",
                    toEmail, _emailConfig.HostName, _emailConfig.PortHost, _emailConfig.Email);
                return new ResponseSend
                {
                    Status = false,
                    Message = $"Error enviando email: {ex.Message}"
                };
            }
        }

        private string GenerateResponsiveOverdueEmailTemplate(ClientOverdueInfo clientOverdueInfo)
        {
            var client = clientOverdueInfo.Client;
            var overdueInstallments = clientOverdueInfo.OverdueInstallments;
            var totalOverdue = clientOverdueInfo.TotalOverdueAmount;

            // Agrupar por proyecto/lote (separado por venta, pero SIN mostrar el ID)
            var projectGroups = overdueInstallments
                .GroupBy(i => new
                {
                    ProjectName = i.Sale.lot?.project?.name ?? "Proyecto",
                    LotInfo = $"{i.Sale.lot?.block}-{i.Sale.lot?.lot_number}" ?? "Lote",
                    SaleId = i.Sale.id_Sales
                })
                .ToList();

            // Limitar filas por proyecto para que el correo no sea extenso
            const int maxRowsPerProject = 6;

            var projectSections = string.Join("", projectGroups.Select(group =>
            {
                var ordered = group.OrderBy(g => g.DueDate).ToList();
                var toShow = ordered.Take(maxRowsPerProject).ToList();
                var hiddenCount = Math.Max(0, ordered.Count - toShow.Count);
                var groupTotal = group.Sum(i => i.Balance);

                var rows = string.Join("", toShow.Select(inst =>
                    $@"<tr>
                    <td style='padding:10px 8px; border-bottom:1px solid #2b2b2b; color:#e7e7e7;'>
                        <div style='font-weight:700;'>Cuota #{inst.QuotaNumber}</div>
                        <div style='color:#b0b0b0; font-size:12px;'>Vence: {inst.DueDate:dd/MM/yyyy}</div>
                    </td>
                    <td style='padding:10px 8px; border-bottom:1px solid #2b2b2b; text-align:right;'>
                        <div style='color:#ff6b6b; font-weight:700;'>{inst.DaysOverdue} días</div>
                        <div style='font-weight:700; color:#ff6b6b;'>${inst.Balance:N2}</div>
                    </td>
                </tr>"
                ));

                var moreNote = hiddenCount > 0
                    ? $@"<div style='text-align:center; font-size:12px; color:#b0b0b0; margin-top:6px;'>… y {hiddenCount} cuota(s) más</div>"
                    : "";

                return $@"
            <!-- Card de proyecto -->
            <table role='presentation' cellpadding='0' cellspacing='0' width='100%' style='width:100%; margin:16px 0; background:#151515; border:1px solid #333; border-radius:12px;'>
                <tr>
                    <td style='padding:14px 12px; background:#1e1e1e; border-bottom:1px solid #2b2b2b;'>
                        <h3 style='margin:0; color:#e7e7e7; font-size:16px; font-weight:700;'>📍 {group.Key.ProjectName} — Lote {group.Key.LotInfo}</h3>
                    </td>
                </tr>
                <tr>
                    <td style='padding:0 12px 10px 12px;'>
                        <table role='presentation' cellpadding='0' cellspacing='0' width='100%' style='width:100%; border-collapse:collapse; table-layout:auto;'>
                            <thead>
                                <tr>
                                    <th align='left' style='padding:10px 8px; color:#d0d0d0; font-size:12px; text-transform:uppercase; letter-spacing:.3px; border-bottom:1px solid #2b2b2b;'>Cuota / Vence</th>
                                    <th align='right' style='padding:10px 8px; color:#d0d0d0; font-size:12px; text-transform:uppercase; letter-spacing:.3px; border-bottom:1px solid #2b2b2b;'>Atraso / Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td align='right' style='padding:12px 8px; color:#ffda6a; font-weight:700; border-top:1px solid #2b2b2b;'>Subtotal Proyecto:</td>
                                    <td align='right' style='padding:12px 8px; color:#ff6b6b; font-size:16px; font-weight:800; border-top:1px solid #2b2b2b;'>${groupTotal:N2}</td>
                                </tr>
                            </tfoot>
                        </table>
                        {moreNote}
                    </td>
                </tr>
            </table>";
            }));

            // HTML principal: tarjetas apiladas, contenedores fluidos sin width fijos
            return $@"
<!DOCTYPE html>
<html>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1'>
<title>Recordatorio de Pago</title>
<style>
  /* Refuerzo responsive (Gmail y apps modernas lo interpretan; inline ya cubre fallback) */
  @media only screen and (max-width: 600px) {{
    h1 {{ font-size:20px !important; }}
    h2 {{ font-size:16px !important; }}
    h3 {{ font-size:14px !important; }}
    table, th, td {{ font-size:12px !important; }}
    .p-outer {{ padding:12px !important; }}
    .card-pad {{ padding:12px !important; }}
  }}
</style>
</head>
<body style='margin:0; padding:0; background:#0f0f0f; font-family:Arial, Helvetica, sans-serif; color:#e7e7e7;'>
  <!-- Wrapper -->
  <table role='presentation' cellpadding='0' cellspacing='0' width='100%' style='width:100%; background:#0f0f0f;'>
    <tr>
      <td align='center' class='p-outer' style='padding:20px;'>
        <!-- Container: full width con max-width inline (sin width fijo) -->
        <table role='presentation' cellpadding='0' cellspacing='0' style='width:100%; max-width:680px; margin:0 auto;'>
          <!-- Header -->
          <tr>
            <td style='background:linear-gradient(135deg, #dc3545, #c82333); color:#fff; padding:22px; border-radius:12px 12px 0 0; text-align:center;'>
              <h1 style='margin:0; font-size:22px;'>⚠️ Recordatorio de Pago</h1>
              <div style='opacity:.9; margin-top:6px;'>M&amp;M Constructora</div>
            </td>
          </tr>

          <!-- Card principal -->
          <tr>
            <td style='background:#151515; padding:0; border:1px solid #333; border-top:none; border-radius:0 0 12px 12px;'>
              <!-- Contenido -->
              <table role='presentation' cellpadding='0' cellspacing='0' width='100%' style='width:100%;'>
                <tr>
                  <td class='card-pad' style='padding:24px;'>
                    <h2 style='margin:0 0 10px 0; color:#e7e7e7; font-size:18px;'>Estimado(a) {client.names} {client.surnames},</h2>
                    <p style='margin:12px 0 18px 0; color:#e7e7e7;'>
                      Le informamos que tiene <strong style='color:#ff6b6b;'>{clientOverdueInfo.TotalOverdueQuotas} cuota(s) vencida(s)</strong> por un total de
                      <strong style='color:#ff6b6b;'>${totalOverdue:N2}</strong>.
                    </p>

                    <!-- Tarjetas resumen apiladas (sin “Días”) -->
                    <table role='presentation' cellpadding='0' cellspacing='0' width='100%' style='width:100%; border-collapse:separate; border-spacing:10px 10px;'>
                      <tr>
                        <td style='background:#2a1e1e; border:1px solid #503535; border-radius:14px; padding:16px; text-align:center;'>
                          <div style='font-size:22px; font-weight:800; color:#ff6b6b;'>${totalOverdue:N2}</div>
                          <div style='font-size:12px; color:#d0d0d0; font-weight:700;'>Total Vencido</div>
                        </td>
                      </tr>
                      <tr>
                        <td style='background:#2a1e1e; border:1px solid #503535; border-radius:14px; padding:16px; text-align:center;'>
                          <div style='font-size:22px; font-weight:800; color:#ff6b6b;'>{clientOverdueInfo.TotalOverdueQuotas}</div>
                          <div style='font-size:12px; color:#d0d0d0; font-weight:700;'>Cuotas Vencidas</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Detalle por proyecto: tabla compacta, días solo aquí -->
                    <h3 style='margin:18px 0 10px 0; color:#e7e7e7; font-size:16px;'>📋 Detalle de Cuotas Vencidas por Proyecto</h3>
                    {projectSections}

                    <!-- Total general -->
                    <table role='presentation' cellpadding='0' cellspacing='0' width='100%' style='width:100%; margin-top:8px;'>
                      <tr>
                        <td style='background:linear-gradient(135deg, #dc3545, #c82333); color:#fff; padding:18px; border-radius:12px; text-align:center;'>
                          <div style='font-size:14px; opacity:.9; margin-bottom:4px;'>Total General a Pagar</div>
                          <div style='font-size:26px; font-weight:900;'>${totalOverdue:N2}</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Instrucciones (breve) -->
                    <table role='presentation' cellpadding='0' cellspacing='0' width='100%' style='width:100%; margin-top:16px;'>
                      <tr>
                        <td style='background:#143016; border:1px solid #2f5632; padding:14px; border-radius:12px;'>
                          <div style='color:#9be3a5; font-weight:800; margin-bottom:6px;'>💳 Instrucciones de Pago</div>
                          <ul style='margin:0; padding-left:18px; line-height:1.6; color:#d7f4db;'>
                            <li>Documento de identidad</li>
                            <li>Efectivo o medio de pago autorizado</li>
                          </ul>
                        </td>
                      </tr>
                    </table>

                    <!-- Contacto -->
                    <table role='presentation' cellpadding='0' cellspacing='0' width='100%' style='width:100%; border-collapse:separate; border-spacing:10px 10px; margin-top:16px;'>
                      <tr>
                        <td style='background:#1a1a1a; border:1px solid #2b2b2b; border-radius:12px; padding:12px; text-align:center;'>
                          <div style='font-size:12px; color:#b0b0b0;'>📍 Dirección</div>
                          <div style='font-weight:800;'>Mz A Cs 109 Villa del Prado Primer Sector</div>
                          <div style='font-size:12px; color:#b0b0b0;'>Lun - Vie: <br> 7:00 AM - 5:00 PM <br> Sáb:<br> 8:00 AM - 12:00 PM</div>
                        </td>
                        <td style='background:#1a1a1a; border:1px solid #2b2b2b; border-radius:12px; padding:12px; text-align:center;'>
                          <div style='font-size:12px; color:#b0b0b0;'>📞 Teléfono</div>
                          <div style='font-weight:800;'>+57 316 558 9223</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Aviso -->
                    <table role='presentation' cellpadding='0' cellspacing='0' width='100%' style='width:100%; margin-top:12px;'>
                      <tr>
                        <td style='background:#3b2f0a; border:1px solid #6c5711; padding:12px; border-radius:12px; text-align:center; color:#ffda6a; font-weight:800;'>
                          ⚠️ Regularice su situación a la brevedad para evitar inconvenientes adicionales.
                        </td>
                      </tr>
                    </table>

                    <p style='margin:16px 0; text-align:center; color:#e7e7e7;'>Gracias por su atención.<br><strong>M&M Constructora</strong></p>

                    <hr style='margin:18px 0; border:none; border-top:1px solid #2b2b2b;'>

                    <div style='text-align:center; color:#9a9a9a; font-size:12px; line-height:1.4;'>
                      <p style='margin:4px 0;'>Este es un mensaje automático</p>
                      <p style='margin:4px 0;'>Generado el {DateTime.Now:dd/MM/yyyy} a las {DateTime.Now:HH:mm}</p>
                      <p style='margin:4px 0;'>Por favor, no responda a este correo</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
        }
    }
}
