# 🧪 GUÍA DE PRUEBAS RÁPIDAS - AuthModal

## ⚡ Inicio Rápido

### 1. Clonar/Actualizar Código
```bash
cd c:\Proyecto\MyM_Softcom\Frontend\mym_softcom
npm install  # Si es necesario
```

### 2. Configurar Variables de Entorno
```bash
# .env.local
NEXT_PUBLIC_API_PORT=5001
```

### 3. Compilar y Ejecutar
```bash
npm run dev
# Abre http://localhost:3001
```

---

## ✅ Suite de Pruebas Manuales

### TEST 1: Cargar Modal de Login
```
✓ Ir a: http://localhost:3001/user/login
✓ Verificar:
  - Modal aparece con animación suave
  - Logo "M & M" visible
  - Título "Inicia sesión"
  - Dos campos: email y contraseña
  - Botón "Iniciar sesión"
  - Panel derecho con texto de bienvenida
  - Punto animado en panel derecho
```

### TEST 2: Toggles de Contraseña
```
✓ Ir a: http://localhost:3001/user/login
✓ En campo de contraseña:
  - Escribir algo: aparece botón "VER"
  - Click en "VER": cambia a "OCULTAR" y muestra texto
  - Click en "OCULTAR": vuelve a ocultar y muestra puntos
✓ Lo mismo en campo de confirmación de contraseña en registro
```

### TEST 3: Validaciones Cliente
```
✓ Intentar submit con campos vacíos:
  - No hace POST (bloquea en cliente)
✓ Escribir email inválido (ej: "test"):
  - Validación HTML5 lo marca como inválido
✓ Escribir password < 8 caracteres:
  - Permite escribir, pero valida en submit
✓ No ingresa datos:
  - Muestra notificación genérica
```

### TEST 4: Cambiar a Registro
```
✓ Ir a: http://localhost:3001/user/login
✓ Click en botón "Regístrate" (abajo a la derecha)
✓ Verificar animaciones:
  - Panel izquierdo desliza hacia la derecha (left: 0% → 50%)
  - Panel derecho desliza hacia la izquierda (left: 50% → 0%)
  - Duración: ~650ms
✓ Formulario cambia a:
  - Título "Crea tu cuenta"
  - Campos: usuario, email, password, confirmPassword
  - Checkbox de términos
✓ Panel derecho cambia texto
```

### TEST 5: Validar Coincidencia de Contraseñas
```
✓ Ir a: http://localhost:3001/user/register
✓ Llenar:
  - Usuario: "TestUser"
  - Email: "test@example.com"
  - Password: "password123"
  - Confirm: "password456" (diferente)
✓ Click Submit
✓ Resultado: Notificación "Las contraseñas no coinciden"
✓ No hace POST
```

### TEST 6: Cambiar a Recuperación
```
✓ Desde login: click "¿Olvidaste tu contraseña?"
✓ O desde: http://localhost:3001/user/password
✓ Verificar:
  - Panel se desliza nuevamente
  - Título: "Recupera tu acceso"
  - Un solo campo: email
  - Botón: "Enviar instrucciones"
```

### TEST 7: Login Exitoso (Backend Simulado)
```
✓ Ir a: http://localhost:3001/user/login
✓ Ingresar:
  - Email: test@example.com
  - Password: password123
✓ Click "Iniciar sesión"
✓ Resultado esperado:
  - Botón muestra "Iniciando..." (disabled)
  - Si backend responde OK:
    → Notificación "Iniciando sesión..." (verde)
    → Redirección a /dashboard/clientes después de 1.5s
    → Datos guardados en localStorage
  - Si backend responde error:
    → Notificación "Credenciales inválidas" (rojo)
    → Permite reintentar
```

### TEST 8: Registro Exitoso (Backend Simulado)
```
✓ Ir a: http://localhost:3001/user/register
✓ Llenar:
  - Usuario: "Juan Pérez"
  - Email: "juan@example.com"
  - Password: "SecurePass123"
  - Confirm: "SecurePass123"
✓ Click "Crear cuenta"
✓ Resultado esperado:
  - Botón muestra "Registrando..." (disabled)
  - Si backend responde OK:
    → Notificación "Registro exitoso..." (verde)
    → Redirección a login después de 2s
  - Si backend responde error (email existe):
    → Notificación "Email ya registrado"
    → Permite reintentar
```

### TEST 9: Recuperación de Contraseña (Backend Simulado)
```
✓ Ir a: http://localhost:3001/user/password
✓ Ingresar:
  - Email: test@example.com
✓ Click "Enviar instrucciones"
✓ Resultado esperado:
  - Botón muestra "Enviando..." (disabled)
  - Después de 3s:
    → Notificación "Si la cuenta existe..." (verde)
    → Redirección a login
  - Nota: Mensaje es genérico (no revela si email existe)
```

### TEST 10: Responsive Design

#### Desktop (1920x1080)
```
✓ Modal centrado en pantalla
✓ Ancho: ~940px
✓ Alto: ~610px
✓ Panel izquierdo (50% ancho)
✓ Panel derecho (50% ancho)
✓ Decoraciones visibles (círculos)
✓ Todo el texto visible sin scroll
```

#### Tablet (768x1024)
```
✓ Redimensionar a 768px ancho
✓ Modal se ajusta: ~440px ancho
✓ Alto se expande si es necesario
✓ Padding se reduce (26px)
✓ Texto sigue siendo legible
```

#### Mobile (375x812)
```
✓ Redimensionar a 375px ancho
✓ Modal toma casi todo el ancho (100% - 24px padding)
✓ Altura: ~740px o según contenido
✓ Layout STACKED (no horizontal):
  - Formulario arriba (top: 0)
  - Panel abajo (bottom: 0, altura fija ~165px)
  - NO hay deslice horizontal
  - Si tú cambias de modo:
    - Formulario se anima dentro del mismo espacio
    - Panel abajo actualiza texto
✓ Font sizes se reducen
✓ Botones tienen altura adecuada para touch (44px)
✓ Inputs tienen altura 44px (recomendado iOS)
✓ Puntos indicadores ocultos
✓ Ícono de bienvenida oculto
```

### TEST 11: Accesibilidad

```
✓ Abrir inspector de accesibilidad (DevTools)
✓ Verificar:
  - Etiquetas <label> asociadas a inputs
  - Botones tienen aria-label cuando es necesario
  - Notificaciones tienen role="status"
  - Notificaciones tienen aria-live="polite"
  - Contraste de colores >= 4.5:1
  - Focus visible en todos los elementos
  - Tab order es lógico
  - Formularios se pueden completar con teclado
```

### TEST 12: Modo Reducido (prefers-reduced-motion)
```
✓ En DevTools:
  - Cmd/Ctrl+Shift+P → "Rendering"
  - Marcar "Emulate CSS media feature prefers-reduced-motion"
✓ Verificar:
  - Animaciones se deshabilitan
  - Transiciones se vuelven instantáneas (1ms)
  - Funcionalidad se preserva
  - No hay "parpadeos" extraños
```

### TEST 13: Dark Mode (Cuando esté implementado)
```
✓ En DevTools:
  - Cmd/Ctrl+Shift+P → "Rendering"
  - Marcar "Emulate CSS media feature prefers-color-scheme: dark"
✓ Verificar:
  - Modal tiene fondo oscuro
  - Texto es legible
  - Inputs tienen fondo oscuro
  - Contraste >= 4.5:1
  - Decoraciones visibles
```

### TEST 14: Notificaciones y Errores

```
✓ Notificación exitosa (verde):
  - Fondo: #d4edda
  - Texto: #155724
  - Borde: #c3e6cb
  - Auto-desaparece en 5s

✓ Notificación error (rojo):
  - Fondo: #f8d7da
  - Texto: #721c24
  - Borde: #f5c6cb
  - Auto-desaparece en 5s
  - Permite cerrar manualmente? NO (solo timeout)

✓ Animación de entrada:
  - Dura 300ms
  - Sube desde abajo (translateY(-10px))
```

### TEST 15: LocalStorage

```
✓ Abrir DevTools → Application → LocalStorage
✓ Ir a: http://localhost:3001/user/login
✓ Login exitoso
✓ Verificar datos guardados:
  - username: (debe haber algo)
  - email: (debe ser el email ingresado)
  - role: (debe ser "User" o lo que retorna backend)
  - id_Users: (debe ser un número)

✓ VERIFICAR QUE NO EXISTE:
  - password: ❌ NUNCA debe existir
  - Hashed_Password: ❌ NUNCA debe existir
  - token: ❌ NUNCA debe existir

✓ Logout:
  - Clear localStorage
  - Verificar que desaparecen todos los datos
```

---

## 🐛 Debugging

### Inspector de DevTools
```javascript
// Ver estado del localStorage
localStorage

// Ver RequestURLs enviadas
DevTools → Network tab → Filtrar por "api"

// Ver respuestas
Click en request → Preview/Response tab

// Simular error backend
DevTools → Network → Desconectar (offline)
→ Intentar login
→ Debe mostrar error genérico
```

### Console Logs
```javascript
// El componente no tiene console.log deliberadamente
// Pero puedes agregar en AuthModal.jsx:
console.log("currentMode:", currentMode)
console.log("isLoading:", isLoading)
console.log("notice:", notice)
```

### Simular Errores Backend
```bash
# Apagar backend
# O cambiar port en .env.local a uno que no exista
NEXT_PUBLIC_API_PORT=9999

# Intentar login
# Debe mostrar: "Error procesando solicitud"
```

---

## 📊 Checklist Final

- [ ] Modal se carga en /user/login
- [ ] Modal se carga en /user/register
- [ ] Modal se carga en /user/password
- [ ] Animación entrada modal (550ms)
- [ ] Animación cambio de modo (650ms)
- [ ] Validaciones cliente funcionan
- [ ] Toggles de contraseña funcionan
- [ ] Notificaciones aparecen y desaparecen
- [ ] Desktop layout es correcto
- [ ] Tablet layout es correcto
- [ ] Mobile layout es correcto
- [ ] Accesibilidad completa
- [ ] Focus visible en todos lados
- [ ] Tab order es lógico
- [ ] Dark mode soportado (cuando esté CSS)
- [ ] LocalStorage no contiene contraseña
- [ ] Mensajes son genéricos (no revelan info)
- [ ] Botones se deshabilitan durante peticiones

---

## 🚀 Próximo Paso

Una vez que backend implemente:
1. Hashing BCrypt
2. Rate limiting
3. Cookies seguras

Ejecutar test:
```bash
npm run test  # Cuando existan tests
```

Y desplegar a producción.

