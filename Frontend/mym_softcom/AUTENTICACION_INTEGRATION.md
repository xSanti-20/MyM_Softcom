# Integración de Autenticación Unificada - Documentación

## 📋 Resumen de Cambios

Se ha integrado un sistema de autenticación profesional y unificado que combina Login, Registro y Recuperación de Contraseña en un modal animado elegante. El nuevo diseño mantiene todas las rutas existentes mientras proporciona una interfaz moderna y segura.

---

## 📁 Archivos Modificados

### 1. **Nuevos Archivos Creados**
- `src/components/auth/AuthModal.jsx` - Componente principal unificado (540 líneas)
- `src/components/auth/AuthModal.module.css` - Estilos con animaciones (500+ líneas)

### 2. **Archivos Actualizados**
- `src/app/user/login/page.jsx` - Simplificado para usar AuthModal
- `src/app/user/register/page.jsx` - Simplificado para usar AuthModal  
- `src/app/user/password/page.jsx` - Simplificado para usar AuthModal
- `src/app/user/reset_password/page.jsx` - (Sin cambios, mantiene funcionalidad)

---

## 🔐 Características de Seguridad Implementadas

### Cliente (Frontend)
✅ **Validación de entrada robusta**
- Email: Validación regex con patrón estándar
- Contraseña: Mínimo 8 caracteres
- Usuario: 3-50 caracteres alfanuméricos
- Validación cruzada de coincidencia de contraseñas

✅ **Sanitización básica**
- `sanitizeInput()` elimina caracteres peligrosos `<>`
- Las contraseñas NUNCA se sanitizan (mantienen integridad)

✅ **Protección contra exposición de información**
- Mensajes genéricos en login: "Credenciales inválidas"
- Recuperación: "Si la cuenta existe, recibirás instrucciones"
- No revela si un email está registrado

✅ **Manejo seguro de datos**
- Contraseña NUNCA se guarda en localStorage
- Solo username, email, role e id se almacenan
- Todas las contraseñas deben hashearse en el servidor

✅ **Estado de carga**
- Deshabilita botones durante peticiones
- Impide envíos duplicados
- Feedback visual del usuario

---

## 🔄 Flujo de Autenticación

### 1️⃣ Login
```
Usuario → Ingresa email/password
         ↓
Cliente  → Valida formato (regex email, min 8 chars)
         ↓
Axios    → POST /api/User/Login { email, password }
         ↓
Backend  → Verifica email en BD
         → Compara hash(password) con BD (Argon2id/bcrypt)
         → Genera JWT o sesión segura
         ↓
Cliente  → Guarda: username, email, role, id_Users (localStorage)
         → Redirige a /dashboard/clientes
```

### 2️⃣ Registro
```
Usuario → Ingresa username, email, password×2
         ↓
Cliente  → Valida: email regex, username 3-50 chars
         → Verifica que passwords coincidan (8+ chars)
         ↓
Axios    → POST /api/User/CreateUser { nom_Users, email, hashed_Password, confirm_Password }
         ↓
Backend  → Valida email no exista (UNIQUE)
         → Hash(password) con Argon2id
         → Inserta usuario en BD
         → Envía email de confirmación (PENDIENTE)
         ↓
Cliente  → Muestra éxito y redirige a login
```

### 3️⃣ Recuperación de Contraseña
```
Usuario → Ingresa email
         ↓
Cliente  → Valida email regex
         ↓
Axios    → POST /api/User/ResetPassUser { Email }
         ↓
Backend  → Genera token aleatorio (32 bytes)
         → Token expira en 1 hora
         → Guarda: hash(token), email, expiration en tabla temporal
         → Envía email con link: /user/reset_password?token={token}
         → Registra intento (sin guardar password)
         ↓
Usuario → Abre link en email
         ↓
Axios    → POST /api/User/validatepass { Token }
         ↓
Backend  → Valida token: existe, no expirado
         ↓
Usuario → Ingresa nueva password
         ↓
Axios    → POST /api/User/ResetPasswordConfirm { token, newPassword }
         ↓
Backend  → Valida token nuevamente
         → Hash(newPassword) con Argon2id
         → Actualiza usuario
         → Borra token (one-time use)
```

---

## 🚀 Endpoints Requeridos (Backend)

### ✅ Endpoints Existentes
Estos ya están implementados en el backend:

1. **POST /api/User/Login**
   - Entrada: `{ email: string, password: string }`
   - Salida: `{ username, email, role, id_Users, token? }`
   - Manejo: Compara password hasheado, genera sesión/JWT

2. **POST /api/User/CreateUser**
   - Entrada: `{ nom_Users, email, hashed_Password, confirm_Password }`
   - Salida: `{ message: "Registro exitoso", ... }`
   - Manejo: Crea usuario, hashea password

3. **POST /api/User/ResetPassUser**
   - Entrada: `{ Email: string }`
   - Salida: `{ message: "Instrucciones enviadas" }`
   - Manejo: Genera token, envía email

4. **POST /api/User/validatepass**
   - Entrada: `{ Token: string }`
   - Salida: `{ message: "Token valido" | "Token expirado" }`
   - Manejo: Valida token

5. **POST /api/User/ResetPasswordConfirm**
   - Entrada: `{ token: string, newPassword: string }`
   - Salida: `{ message: "Contraseña actualizada" }`
   - Manejo: Actualiza contraseña, valida token

---

## 🛡️ Recomendaciones de Seguridad para Backend

### Almacenamiento de Contraseñas
```csharp
// ❌ MAL
user.Password = inputPassword;  // Nunca sin hash

// ✅ BIEN
using System.Security.Cryptography;
user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(inputPassword, 12);
// O con Argon2id (más seguro)
```

### Protección contra Fuerza Bruta
```csharp
// Implementar en endpoint /api/User/Login
- Registrar intentos fallidos por IP/email
- Bloquear después de 5 intentos en 15 minutos
- Usar Redis o tabla temporal para tracking
- Responder siempre "Credenciales inválidas" (no revelar si email existe)
```

### Tokens de Recuperación
```csharp
// Generación segura
var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
var tokenHash = BCrypt.Net.BCrypt.HashPassword(token, 12);

// Almacenamiento (tabla PasswordReset)
- id
- user_id (FK)
- token_hash (NO guardar token plain)
- expires_at (NOW + 1 hour)
- used_at (null hasta usar)
- created_ip (para auditoría)

// Validación
if (DateTime.UtcNow > reset.expires_at) throw new Exception("Token expirado");
if (!BCrypt.Net.BCrypt.Verify(inputToken, reset.token_hash)) throw new Exception("Token inválido");
if (reset.used_at != null) throw new Exception("Token ya utilizado");
```

### Cookies Seguras
```csharp
// En Startup.cs o Program.cs
services.ConfigureApplicationCookie(options => {
    options.Cookie.HttpOnly = true;        // ✅ Protege contra XSS
    options.Cookie.Secure = true;          // ✅ Solo HTTPS
    options.Cookie.SameSite = SameSiteMode.Strict;  // ✅ Protege CSRF
    options.ExpireTimeSpan = TimeSpan.FromHours(1);
});
```

### Consultas Parametrizadas (EF Core)
```csharp
// ✅ BIEN - Previene SQL Injection
var user = await _context.Users
    .FromSqlInterpolated($"SELECT * FROM Users WHERE Email = {email}")
    .FirstOrDefaultAsync();

// O con LINQ (lo mejor)
var user = await _context.Users
    .Where(u => u.Email == email)
    .FirstOrDefaultAsync();
```

### Validación en Servidor
```csharp
[HttpPost("CreateUser")]
public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
{
    // ✅ Validar entrada
    if (!ModelState.IsValid) return BadRequest(ModelState);
    
    if (string.IsNullOrWhiteSpace(dto.Email)) 
        return BadRequest("Email requerido");
    
    if (dto.NomUsers?.Length < 3 || dto.NomUsers?.Length > 50)
        return BadRequest("Usuario entre 3 y 50 caracteres");
    
    if (dto.HashedPassword?.Length < 8)
        return BadRequest("Contraseña mínimo 8 caracteres");
    
    // ✅ Verificar email único
    if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
        return BadRequest("Email ya registrado");
    
    // ✅ Hashear (nunca guardar plain)
    var hashedPassword = BCrypt.Net.BCrypt.HashPassword(dto.HashedPassword, 12);
    
    var user = new User { 
        Email = dto.Email,
        NomUsers = dto.NomUsers,
        PasswordHash = hashedPassword,
        CreatedAt = DateTime.UtcNow
    };
    
    _context.Users.Add(user);
    await _context.SaveChangesAsync();
    
    return Ok(new { message = "Usuario creado exitosamente" });
}
```

### Gestión de Errores Segura
```csharp
// ❌ MAL - Expone detalles internos
catch (Exception ex)
{
    return BadRequest($"Error: {ex.Message}");  // ❌ Expone TODO
}

// ✅ BIEN - Mensaje genérico, log interno
catch (Exception ex)
{
    _logger.LogError($"CreateUser failed: {ex}");  // Guardamos el real
    return BadRequest("No se pudo completar la operación");  // Genérico al usuario
}
```

---

## 🧪 Pruebas Manuales

### Test 1: Login Correcto
```bash
curl -X POST http://localhost:5001/api/User/Login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

✅ Esperado: 200 OK con { username, email, role, id_Users }
```

### Test 2: Login con Email Inválido
```bash
curl -X POST http://localhost:5001/api/User/Login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"password123"}'

✅ Esperado: 400 Bad Request (validación cliente previene esto)
```

### Test 3: Login con Credenciales Incorrectas
```bash
curl -X POST http://localhost:5001/api/User/Login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'

✅ Esperado: 401 Unauthorized con "Credenciales inválidas" (genérico)
```

### Test 4: Registro Exitoso
```bash
curl -X POST http://localhost:5001/api/User/CreateUser \
  -H "Content-Type: application/json" \
  -d '{
    "nom_Users":"Juan Pérez",
    "email":"juan@example.com",
    "hashed_Password":"password123",
    "confirm_Password":"password123"
  }'

✅ Esperado: 200 OK con mensaje de éxito
```

### Test 5: Registro con Email Duplicado
```bash
curl -X POST http://localhost:5001/api/User/CreateUser \
  -H "Content-Type: application/json" \
  -d '{
    "nom_Users":"Otro Usuario",
    "email":"test@example.com",  # Email ya existe
    "hashed_Password":"password123",
    "confirm_Password":"password123"
  }'

✅ Esperado: 400 Bad Request con "Email ya registrado"
```

### Test 6: Recuperación de Contraseña
```bash
curl -X POST http://localhost:5001/api/User/ResetPassUser \
  -H "Content-Type: application/json" \
  -d '{"Email":"test@example.com"}'

✅ Esperado: 200 OK
✅ Se envía email con token válido por 1 hora
```

---

## 🔗 Rutas de la Aplicación

| Ruta | Modo Inicial | Descripción |
|------|--------------|-------------|
| `/user/login` | `login` | Pantalla de inicio de sesión |
| `/user/register` | `register` | Pantalla de registro |
| `/user/password` | `recover` | Recuperación de contraseña |
| `/user/reset_password?token={token}` | N/A | Restablecer contraseña con token |
| `/dashboard/clientes` | N/A | Dashboard (protegido) |

---

## 📦 Estructura de Componentes

```
src/
├── components/
│   └── auth/
│       ├── AuthModal.jsx (540 líneas)
│       └── AuthModal.module.css (500+ líneas)
├── app/
│   └── user/
│       ├── login/
│       │   ├── page.jsx (3 líneas - usa AuthModal)
│       │   └── Page.Module.css (no usar más)
│       ├── register/
│       │   ├── page.jsx (3 líneas - usa AuthModal)
│       │   └── page.module.css (no usar más)
│       ├── password/
│       │   ├── page.jsx (3 líneas - usa AuthModal)
│       │   └── page.module.css (no usar más)
│       └── reset_password/
│           └── page.jsx (sin cambios)
```

---

## 🎨 Animaciones

### Modal de Entrada
- **Duración**: 550ms
- **Curva**: cubic-bezier(0.2, 0.8, 0.2, 1)
- **Efecto**: Fade + Scale (0.98 → 1)

### Cambio de Modo (Login ↔ Registro ↔ Recuperación)
- **Panel izquierdo (formulario)**: Desliza de izquierda a derecha (left: 0 → 50%)
- **Panel derecho (bienvenida)**: Desliza de derecha a izquierda (left: 50% → 0)
- **Duración**: 650ms
- **Curva**: cubic-bezier(0.68, -0.05, 0.27, 1.05) (overshoot suave)

### Formularios
- **Fade in**: 350ms ease
- **Desplazamiento**: 14px desde la derecha

---

## 🌙 Soporte Dark Mode

El componente hereda estilos del tema global pero tiene colores explícitos:
- Fondo modal: Blanco (luz) / Gris (oscuro - requiere actualizar CSS)
- Panel bienvenida: Gradiente magenta (siempre)
- Texto: Negro/Gris (luz) / Blanco/Gris claro (oscuro)

**TODO**: Actualizar `AuthModal.module.css` para soportar dark mode:
```css
@media (prefers-color-scheme: dark) {
  .modal {
    background: #1f2937;
    border-color: rgba(233, 30, 99, 0.3);
  }
  
  label, .subheading {
    color: #e5e7eb;
  }
  
  input {
    background: #111827;
    border-color: #374151;
    color: #f3f4f6;
  }
}
```

---

## 📊 Validaciones Cliente

```javascript
email:      /^[^\s@]+@[^\s@]+\.[^\s@]+$/
password:   >= 8 caracteres
username:   3-50 caracteres
match:      password === confirmPassword
```

---

## 🔔 Notificaciones

- **Error**: Fondo rojo claro, texto rojo oscuro (5s autocierre)
- **Éxito**: Fondo verde claro, texto verde oscuro (redirige después)
- **Genéricas**: "Credenciales inválidas", "Si la cuenta existe..."

---

## ⚙️ Configuración Necesaria

1. **Backend .NET**
   - Verificar endpoints: `/api/User/Login`, `/api/User/CreateUser`, etc.
   - Implementar hash Argon2id o bcrypt
   - Configurar SMTP para emails
   - Implementar rate limiting

2. **Frontend**
   - `NEXT_PUBLIC_API_PORT=5001` en `.env.local`
   - axios configurado con `withCredentials: true` ✅ (ya hecho)

3. **Base de Datos**
   - Tabla `Users` con campos: id, email (UNIQUE), password_hash, username
   - Tabla `PasswordReset` (temporal) con: id, user_id, token_hash, expires_at
   - Índice en `Users.Email`

---

## 🚦 Estado de Implementación

| Componente | Estado | Detalles |
|-----------|--------|----------|
| Frontend Modal | ✅ Completo | Login, Registro, Recuperación |
| Validaciones Cliente | ✅ Completo | Email, Password, Username |
| Animaciones | ✅ Completo | Panel deslizante + transiciones |
| Endpoints Existentes | ✅ Utilizados | Login, CreateUser, ResetPassUser |
| Hash de Contraseñas | ⚠️ Backend | Implementar Argon2id/bcrypt |
| Rate Limiting | ⚠️ Backend | Implementar protección fuerza bruta |
| Email Recovery | ⚠️ Backend | Implementar SMTP + templating |
| Dark Mode CSS | ⚠️ Frontend | Añadir media query (prefers-color-scheme) |
| Tests Automatizados | ⚠️ No | Crear suite con Jest/Playwright |

---

## 🔗 Enlaces Útiles

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [BCrypt Documentation](https://en.wikipedia.org/wiki/Bcrypt)
- [Argon2 Password Hashing](https://github.com/kmaragon/Konscious.Security.Cryptography)
- [NIST Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

## 📝 Notas

- El componente es **totalmente responsive** (testeado hasta 320px)
- Compatible con **reducción de movimiento** (prefers-reduced-motion)
- **Accesibilidad**: Roles ARIA, aria-live para notificaciones
- **Performance**: CSS Module para evitar conflictos, sin librerías adicionales
- **Compatibilidad**: Soporta todos los navegadores modernos (ES2020+)

