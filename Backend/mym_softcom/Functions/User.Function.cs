using API_PESO_PIG.Models;
using System.Net;
using System.Net.Http;
using System.Net.Mail;
using System.Text;

namespace API_PESO_PIG.Functions
{
    public class UserFunction
    {
        public ConfigServer ConfigServer { get; set; }
        private readonly IConfiguration _configuration;

        public UserFunction(IConfiguration configuration)
        {
            ConfigServer = configuration.GetSection("ConfigServerEmail").Get<ConfigServer>();
        }

        public async Task<ResponseSend> SendEmail(string EmailDestinatation, string resetLink)
        {
            ResponseSend responseSend = new ResponseSend();
            try
            {
                if (string.IsNullOrWhiteSpace(resetLink) || !Uri.IsWellFormedUriString(resetLink, UriKind.Absolute))
                {
                    throw new ArgumentException("El enlace de Restablecimiento no es valido");
                }


                using (SmtpClient smtpClient = new SmtpClient
                {
                    Host = ConfigServer.HostName,
                    Port = ConfigServer.PortHost,
                    Credentials = new NetworkCredential(ConfigServer.Email, ConfigServer.Password),
                    EnableSsl = true
                })
                {
                    MailAddress remitente = new MailAddress(ConfigServer.Email, "SOFTWARE PESO PIG", Encoding.UTF8);
                    MailAddress destinatario = new MailAddress(EmailDestinatation);

                    using (MailMessage message = new MailMessage(remitente, destinatario)
                    {
                        IsBodyHtml = true,
                        Subject = "Restablecimiento de Contraseña",
                        Body = GenerateEmailBody(resetLink),
                        BodyEncoding = Encoding.UTF8,
                    })
                    {
                        await smtpClient.SendMailAsync(message);
                    }
                }
                responseSend.Status = true;
                responseSend.Message = "Correo enviado con éxito. Revisa tu bandeja de entrada.";
            }
            catch (Exception ex)
            {
                Addlog(ex.ToString());
                responseSend.Message = "Error al enviar el correo.";
                responseSend.Status = false;
            }

            return responseSend;
        }

        private string GenerateEmailBody(string resetLink)
        {
            // Plantilla HTML mejorada
            return $@"
            <html>
            <head>
               <style>
                    .container {{
                        width: 100%;
                        padding: 20px;
                        text-align: center;
                        background-color: #f4f4f4;
                    }}
                    .card {{
                        background: #ffffff;
                        padding: 20px;
                        border-radius: 10px;
                        box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
                        max-width: 400px;
                        margin: auto;
                        font-family: Arial, sans-serif;
                    }}
                    .button {{
                        background-color: #1B8FB0;
                        color: white;
                        padding: 10px 20px;
                        text-decoration: none;
                        font-weight: bold;
                        border-radius: 5px;
                        display: inline-block;
                        margin-top: 20px;
                    }}
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='card'>
                        <h2>¿Olvidaste tu contraseña?</h2>
                        <p>No te preocupes, haz clic en el siguiente botón para restablecerla:</p>
                        <a class='button' href='{resetLink}'>Restablecer Contraseña</a>
                        <p>Si no solicitaste este cambio, ignora este mensaje.</p>
                    </div>
                </div>
            </body>
            </html>";
        }
public void Addlog(string newlog)
{
    string Carpetalog = AppDomain.CurrentDomain.BaseDirectory + "Logs//";
    if (!Directory.Exists(Carpetalog))
    {
        Directory.CreateDirectory(Carpetalog);
    }

    string Ruta = Carpetalog + AppDomain.CurrentDomain.FriendlyName + "_" + DateTime.Now.ToString("dd-MM-yyyy") + ".Log";
    var Registro = DateTime.Now + " - " + newlog + "\n";
    var bytsnewlog = new UTF8Encoding(true).GetBytes(Registro);
    using (FileStream log = File.Open(Ruta, FileMode.Append))
    {
        log.Write(bytsnewlog, 0, bytsnewlog.Length);
    }
}
        public async Task<(bool Status, string ErrorMessage)> SendEmail(string fromEmail, string toEmail, string subject, string body)
        {
            try
            {
                var smtpClient = new SmtpClient(_configuration["ContactUs:SMTPHost"])
                {
                    Port = int.Parse(_configuration["ContactUs:SMTPPort"]),
                    Credentials = new NetworkCredential(_configuration["ContactUs:SMTPUser"], _configuration["ContactUs:SMTPPassword"]),
                    EnableSsl = true,
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(fromEmail),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true,
                };

                mailMessage.To.Add(toEmail);

                await smtpClient.SendMailAsync(mailMessage);

                return (true, null);
            }
            catch (Exception ex)
            {
                // Agregar el log de error
                return (false, ex.Message);
            }
        }

        public async Task<ResponseSend> SendNewUserNotification(List<string> adminEmails, User newUser)
        {
            ResponseSend response = new ResponseSend();
            try
            {
                using (SmtpClient smtpClient = new SmtpClient
                {
                    Host = ConfigServer.HostName,
                    Port = ConfigServer.PortHost,
                    Credentials = new NetworkCredential(ConfigServer.Email, ConfigServer.Password),
                    EnableSsl = true
                })
                {
                    MailAddress remitente = new MailAddress(ConfigServer.Email, "SOFTWARE PESO PIG", Encoding.UTF8);

                    foreach (var email in adminEmails)
                    {
                        if (string.IsNullOrWhiteSpace(email)) continue;

                        using (MailMessage message = new MailMessage(remitente, new MailAddress(email))
                        {
                            IsBodyHtml = true,
                            Subject = "Nuevo usuario registrado (pendiente por activación)",
                            Body = GenerateAdminNotificationBody(newUser.Nom_Users, newUser.Email),
                            BodyEncoding = Encoding.UTF8,
                        })
                        {
                            await smtpClient.SendMailAsync(message);
                        }
                    }
                }

                response.Status = true;
                response.Message = "Correos de notificación enviados.";
            }
            catch (Exception ex)
            {
                Addlog(ex.ToString());
                response.Status = false;
                response.Message = "Error al enviar correos de notificación.";
            }

            return response;
        }

        private string GenerateAdminNotificationBody(string userName, string userEmail)
        {
            return $@"
    <html>
    <head>
        <style>
            .card {{
                font-family: Arial, sans-serif;
                background: #fff;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                max-width: 500px;
                margin: auto;
                text-align: center;
            }}
            .footer {{
                margin-top: 20px;
                font-size: 14px;
                color: #555;
            }}
        </style>
    </head>
    <body>
        <div class='card'>
            <h2>Nuevo usuario registrado</h2>
            <p><strong>Nombre:</strong> {userName}</p>
            <p><strong>Correo:</strong> {userEmail}</p>
            <p class='footer'>
                Por favor ingresa a tu panel de gestión de usuarios para activar la cuenta manualmente.
            </p>
        </div>
    </body>
    </html>";
        }

    }
}