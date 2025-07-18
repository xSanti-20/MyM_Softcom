using mym_softcom.Functions;
using mym_softcom.Models;
using mym_softcom.Services;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using mym_softcom.Models;

namespace mym_softcom.Middlewares
{
    public class Middleware
    {
        private readonly RequestDelegate _next;
        public UserFunction GeneralFunction;
        public Jwt Jwt = new Jwt();
        private readonly List<string> _publicRoutes;
        public Middleware(RequestDelegate next, IConfiguration _Configuration)
        {
            _next = next;
            Jwt = _Configuration.GetSection("Jwt").Get<Jwt>();
            GeneralFunction = new UserFunction(_Configuration);
            _publicRoutes = _Configuration.GetSection("RoutePublic").Get<List<RouteConfig>>().Select(route => route.Route).ToList();

        }

        public async Task Invoke(HttpContext context, UserServices userServices)
        {
            var token = context.Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();
            var path = context.Request.Path;


            if (_publicRoutes.Contains(path))
            {
                await _next(context);
                return;
            }

            if (token == null)
            {
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"error\": \"Token no proporcionado.\"}");
                return;
            }

            if (!AttachUserToContext(context, userServices, token))
            {
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"error\": \"Token no proporcionado.\"}");
                return;
            }

            await _next(context);
            return;

        }

        private bool AttachUserToContext(HttpContext context, UserServices userServices, string token)
        {
            try
            {
                var key = Encoding.UTF8.GetBytes(Jwt.Key);
                var tokenHandler = new JwtSecurityTokenHandler();
                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                var jwtToken = (JwtSecurityToken)validatedToken;
                var userEmail = jwtToken.Claims.First(x => x.Type == "User").Value;

                // Adjuntar el usuario al contexto
                context.Items["user"] = userServices.GetUserEmail(userEmail);
                return true;
            }
            catch (Exception ex)
            {
                GeneralFunction.Addlog(ex.ToString());
                return false;
            }
        }
    }
}
