"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import axiosInstance from "@/lib/axiosInstance"
import styles from "./AuthModal.module.css"

/**
 * Validaciones de seguridad en cliente
 */
const validators = {
  email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  password: (password) => password.length >= 8,
  username: (username) => username.length >= 3 && username.length <= 50,
  passwordsMatch: (pwd1, pwd2) => pwd1 === pwd2 && pwd1.length >= 8,
}

/**
 * Sanitización básica para prevenir XSS en presentación
 */
const sanitizeInput = (input) => {
  return input.trim().replace(/[<>]/g, "")
}

/**
 * Componente de Modal de Autenticación Unificado
 * Integra: Login, Registro, Recuperación de Contraseña
 * Con animación del panel informativo
 */
export default function AuthModal({ initialMode = "login" }) {
  const router = useRouter()
  const [currentMode, setCurrentMode] = useState(initialMode)
  const [isLoading, setIsLoading] = useState(false)
  const [notice, setNotice] = useState({ message: "", type: "" })
  const [showPassword, setShowPassword] = useState({ login: false, register: false, confirm: false })

  // Estados del formulario
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [registerForm, setRegisterForm] = useState({ username: "", email: "", password: "", confirmPassword: "" })
  const [recoverForm, setRecoverForm] = useState({ email: "" })

  // Textos dinámicos según la vista
  const modeConfig = {
    login: {
      eyebrow: "Qué bueno verte",
      title: "Inicia sesión",
      subtitle: "Accede a tu cuenta para continuar donde lo dejaste.",
      welcomeTitle: "Todo empieza aquí.",
      welcomeText: "Inicia sesión para descubrir tu espacio, organizar tus ideas y seguir avanzando.",
      prompt: "¿Aún no tienes cuenta?",
      link: "Regístrate",
      nextMode: "register",
    },
    register: {
      eyebrow: "Empieza hoy",
      title: "Crea tu cuenta",
      subtitle: "Solo necesitas unos datos para unirte a nuestro sistema.",
      welcomeTitle: "Nos alegra que estés aquí.",
      welcomeText: "Crea tu cuenta y empieza a construir algo increíble. Te tomará menos de un minuto.",
      prompt: "¿Ya tienes cuenta?",
      link: "Inicia sesión",
      nextMode: "login",
    },
    recover: {
      eyebrow: "Recuperación segura",
      title: "Recupera tu acceso",
      subtitle: "Escribe el correo asociado a tu cuenta y te indicaremos cómo restablecer la contraseña.",
      welcomeTitle: "Volver será sencillo.",
      welcomeText: "Te ayudaremos a recuperar el acceso de forma segura usando el correo asociado a tu cuenta.",
      prompt: "¿Recordaste tu contraseña?",
      link: "Inicia sesión",
      nextMode: "login",
    },
  }

  const config = modeConfig[currentMode]

  /**
   * Mostrar notificación genérica
   */
  const showNotice = (message, type = "error") => {
    setNotice({ message, type })
    setTimeout(() => setNotice({ message: "", type: "" }), 5000)
  }

  /**
   * Manejo de Login
   */
  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setNotice({ message: "", type: "" })

    // Validaciones en cliente
    if (!validators.email(loginForm.email)) {
      showNotice("Por favor, ingresa un correo válido")
      setIsLoading(false)
      return
    }

    if (!validators.password(loginForm.password)) {
      showNotice("La contraseña debe tener al menos 8 caracteres")
      setIsLoading(false)
      return
    }

    try {
      const response = await axiosInstance.post("/api/User/Login", {
        email: sanitizeInput(loginForm.email),
        password: loginForm.password, // Nunca sanitizar contraseña
      })

      // Guardar datos en localStorage (nunca guardar contraseña)
      localStorage.setItem("username", response.data.username || "Usuario")
      localStorage.setItem("email", response.data.email)
      localStorage.setItem("role", response.data.role || "User")
      if (response.data.id_Users) {
        localStorage.setItem("id_Users", response.data.id_Users.toString())
      }

      showNotice("✓ Contraseña correcta, accediendo...", "success")
      setTimeout(() => router.push("/dashboard/clientes"), 1500)
    } catch (error) {
      // Mensaje específico basado en el error
      showNotice("✗ Correo o contraseña incorrectos. Intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Manejo de Registro
   */
  const handleRegister = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setNotice({ message: "", type: "" })

    // Validaciones en cliente
    if (!validators.username(registerForm.username)) {
      showNotice("✗ El usuario debe tener entre 3 y 50 caracteres")
      setIsLoading(false)
      return
    }

    if (!validators.email(registerForm.email)) {
      showNotice("✗ Por favor, ingresa un correo válido")
      setIsLoading(false)
      return
    }

    if (!validators.passwordsMatch(registerForm.password, registerForm.confirmPassword)) {
      showNotice("✗ Las contraseñas no coinciden o son menores a 8 caracteres")
      setIsLoading(false)
      return
    }

    try {
      const response = await axiosInstance.post("/api/User/CreateUser", {
        nom_Users: sanitizeInput(registerForm.username),
        email: sanitizeInput(registerForm.email),
        hashed_Password: registerForm.password,
        confirm_Password: registerForm.confirmPassword,
      })

      showNotice("✓ Registro exitoso. Redirigiendo al login...", "success")
      setTimeout(() => setCurrentMode("login"), 2000)
    } catch (error) {
      // Información segura del error
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0] ||
        "✗ El correo ya está registrado o datos inválidos. Intenta de nuevo."

      showNotice(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Manejo de Recuperación de Contraseña
   */
  const handleRecover = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setNotice({ message: "", type: "" })

    // Validación en cliente
    if (!validators.email(recoverForm.email)) {
      showNotice("✗ Por favor, ingresa un correo válido")
      setIsLoading(false)
      return
    }

    try {
      await axiosInstance.post("/api/User/ResetPassUser", {
        Email: sanitizeInput(recoverForm.email),
      })

      // Mensaje genérico para no revelar si el usuario existe
      showNotice("✓ Si la cuenta existe, recibirás instrucciones en tu correo.", "success")
      setTimeout(() => setCurrentMode("login"), 3000)
    } catch (error) {
      // Mensaje genérico aunque falle
      showNotice("✓ Si la cuenta existe, recibirás instrucciones en tu correo.", "success")
      setTimeout(() => setCurrentMode("login"), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Toggle de visibilidad de contraseña
   */
  const togglePassword = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  return (
    <div className={styles.backdrop}>
      <section className={`${styles.modal} ${currentMode !== "login" ? styles["is-secondary"] : ""}`}>
        {/* Lado del Formulario */}
        <div className={styles["form-side"]}>
          {/* Vista: Login */}
          <div className={`${styles["form-view"]} ${currentMode === "login" ? styles.active : ""}`}>
            <div className={styles.eyebrow}>
              <Image
                src="/assets/img/mymsoftcom.png"
                alt="M&M Softcom"
                width={60}
                height={50}
              />
            </div>
            <h1 className={styles.title}>{config.title}</h1>
            <p className={styles.subheading}>{config.subtitle}</p>

            <form onSubmit={handleLogin}>
              <div className={styles.field}>
                <label htmlFor="loginEmail" className={styles["field-label"]}>Correo electrónico</label>
                <input
                  id="loginEmail"
                  type="email"
                  className={styles["input-field"]}
                  placeholder="tu@correo.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="loginPassword" className={styles["field-label"]}>Contraseña</label>
                <div className={styles["input-wrap"]}>
                  <input
                    id="loginPassword"
                    type={showPassword.login ? "text" : "password"}
                    placeholder="Tu contraseña"
                    className={`${styles["input-field"]} ${styles["password-input"]}`}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                  {loginForm.password && (
                    <button
                      type="button"
                      className={styles["toggle-password"]}
                      onClick={() => togglePassword("login")}
                      disabled={isLoading}
                    >
                      {showPassword.login ? "OCULTAR" : "VER"}
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.row}>
                <label className={styles.check}>
                  <input type="checkbox" className={styles["check-input"]} name="remember" disabled={isLoading} />
                  Recordarme
                </label>
                <button
                  type="button"
                  className={styles["text-link"]}
                  onClick={() => setCurrentMode("recover")}
                  disabled={isLoading}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button type="submit" className={styles.primary} disabled={isLoading}>
                {isLoading ? "Iniciando..." : "Iniciar sesión"}
                <span aria-hidden="true" style={{ marginLeft: "8px" }}>
                  →
                </span>
              </button>
            </form>

            <p className={styles["fine-print"]}>
              Al continuar, aceptas nuestros términos de servicio y política de privacidad.
            </p>
          </div>

          {/* Vista: Registro */}
          <div className={`${styles["form-view"]} ${currentMode === "register" ? styles.active : ""}`}>
            <div className={styles.eyebrow}>
              <Image
                src="/assets/img/mymsoftcom.png"
                alt="M&M Softcom"
                width={60}
                height={50}
              />
            </div>
            <h1 className={styles.title}>{config.title}</h1>
            <p className={styles.subheading}>{config.subtitle}</p>

            <form onSubmit={handleRegister}>
              <div className={styles.field}>
                <label htmlFor="username" className={styles["field-label"]}>Nombre de usuario</label>
                <input
                  id="username"
                  type="text"
                  className={styles["input-field"]}
                  placeholder="Tu nombre"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="registerEmail" className={styles["field-label"]}>Correo electrónico</label>
                <input
                  id="registerEmail"
                  type="email"
                  className={styles["input-field"]}
                  placeholder="tu@correo.com"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="registerPassword" className={styles["field-label"]}>Crea una contraseña</label>
                <div className={styles["input-wrap"]}>
                  <input
                    id="registerPassword"
                    type={showPassword.register ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    className={`${styles["input-field"]} ${styles["password-input"]}`}
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                  {registerForm.password && (
                    <button
                      type="button"
                      className={styles["toggle-password"]}
                      onClick={() => togglePassword("register")}
                      disabled={isLoading}
                    >
                      {showPassword.register ? "OCULTAR" : "VER"}
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="confirmPassword" className={styles["field-label"]}>Confirma tu contraseña</label>
                <div className={styles["input-wrap"]}>
                  <input
                    id="confirmPassword"
                    type={showPassword.confirm ? "text" : "password"}
                    placeholder="Confirma tu contraseña"
                    className={`${styles["input-field"]} ${styles["password-input"]}`}
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                  {registerForm.confirmPassword && (
                    <button
                      type="button"
                      className={styles["toggle-password"]}
                      onClick={() => togglePassword("confirm")}
                      disabled={isLoading}
                    >
                      {showPassword.confirm ? "OCULTAR" : "VER"}
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.row}>
                <label className={styles.check}>
                  <input type="checkbox" className={styles["check-input"]} name="terms" required disabled={isLoading} />
                  Acepto los
                  <a href="/terms" className={styles["text-link"]} style={{ marginLeft: "4px" }}>
                    términos
                  </a>
                </label>
              </div>

              <button type="submit" className={styles.primary} disabled={isLoading}>
                {isLoading ? "Registrando..." : "Crear cuenta"}
                <span aria-hidden="true" style={{ marginLeft: "8px" }}>
                  →
                </span>
              </button>
            </form>

            <p className={styles["fine-print"]}>Tus datos están seguros. Nunca compartiremos tu información.</p>
          </div>

          {/* Vista: Recuperación */}
          <div className={`${styles["form-view"]} ${currentMode === "recover" ? styles.active : ""}`}>
            <div className={styles.eyebrow}>
              <Image
                src="/assets/img/mymsoftcom.png"
                alt="M&M Softcom"
                width={60}
                height={50}
              />
            </div>
            <h1 className={styles.title}>{config.title}</h1>
            <p className={styles.subheading}>{config.subtitle}</p>

            <form onSubmit={handleRecover}>
              <div className={styles.field}>
                <label htmlFor="recoverEmail" className={styles["field-label"]}>Correo electrónico</label>
                <input
                  id="recoverEmail"
                  type="email"
                  className={styles["input-field"]}
                  placeholder="tu@correo.com"
                  value={recoverForm.email}
                  onChange={(e) => setRecoverForm({ ...recoverForm, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <button type="submit" className={styles.primary} disabled={isLoading}>
                {isLoading ? "Enviando..." : "Enviar instrucciones"}
                <span aria-hidden="true" style={{ marginLeft: "8px" }}>
                  →
                </span>
              </button>
            </form>

            <p className={styles["fine-print"]}>Si la cuenta existe, recibirás instrucciones para continuar.</p>
          </div>
        </div>

        {/* Lado de Bienvenida */}
        <aside className={styles["welcome-side"]}>
          <div className={styles["welcome-content"]}>
            <div className={styles["welcome-icon"]} aria-hidden="true">
              ✦
            </div>
            <h2 id="welcomeTitle" className={styles["welcome-title"]}>{config.welcomeTitle}</h2>
            <p id="welcomeText" className={styles["welcome-text"]}>{config.welcomeText}</p>

            <p className={styles["welcome-prompt"]}>
              <span id="promptText">{config.prompt}</span>
              <button
                type="button"
                className={`${styles["text-link"]} ${styles["welcome-link"]}`}
                onClick={() => setCurrentMode(config.nextMode)}
                disabled={isLoading}
              >
                {config.link}
              </button>
            </p>

            <div className={styles.dots} aria-hidden="true">
              <span className={styles.dot}></span>
              <span className={styles.dot}></span>
              <span className={styles.dot}></span>
            </div>
          </div>
        </aside>
      </section>

      {/* Notificaciones Flotantes */}
      {notice.message && (
        <div
          className={`${styles.notice} ${notice.type === "error" ? styles.error : styles.success}`}
          role="status"
          aria-live="polite"
        >
          {notice.message}
        </div>
      )}
    </div>
  )
}
