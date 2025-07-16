"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, User, LogOut, Menu, X } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import axiosInstance from "@/lib/axiosInstance"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

function NavPrivada({ children, title }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const router = useRouter()
  const { isMobile, isTablet, isDesktop } = useMobile()
  const [role, setsole] = useState("")
  // Add these new state variables
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  const menuItems = [
    // Aquí condicionamos la inserción del item
    ...(role === "Administrador" ? [{ title: "Gestión de Usuarios", path: "/dashboard/Admi", icon: "👤" }] : []),
    { title: "Home", path: "/dashboard", icon: "📍" },
    { title: "Animales", path: "/dashboard/animals", icon: "🐷" },
    { title: "Alimento", path: "/dashboard/food", icon: "🌾" },
    { title: "Alimentación", path: "/dashboard/feeding", icon: "🍽️" },
    { title: "Pesaje", path: "/dashboard/weight", icon: "⚖️" },
    { title: "Etapa", path: "/dashboard/stage", icon: "📈" },
    { title: "Entradas", path: "/dashboard/entries", icon: "📝" },
    { title: "Raza", path: "/dashboard/race", icon: "🐽" },
    { title: "Corrales", path: "/dashboard/corral", icon: "🏠" },
  ]

  useEffect(() => {
    const storedUsername = localStorage.getItem("username")
    const storedEmail = localStorage.getItem("email")
    const storedrole = localStorage.getItem("role")
    if (storedUsername) setUsername(storedUsername)
    if (storedrole) setsole(storedrole)
    if (storedEmail) setEmail(storedEmail)
  }, [])

  // Auto-cerrar sidebar en móvil cuando cambia el tamaño
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false)
    } else if (isDesktop) {
      setIsMobileMenuOpen(false)
    }
  }, [isMobile, isDesktop])

  // Add this new useEffect for token validation
  useEffect(() => {
    async function validarToken() {
      try {
        const res = await axiosInstance.get("api/User/ValidateToken", { withCredentials: true })
        if (res.data.isValid) {
          setAuthenticated(true)
          // Datos ya cargados en el otro useEffect
        } else {
          setAuthenticated(false)
          router.push("/user/login")
        }
      } catch (error) {
        setAuthenticated(false)
        router.push("/user/login")
      } finally {
        setCheckingAuth(false)
      }
    }
    validarToken()
  }, [router])

  const handleLogout = async () => {
    try {
      const response = await axiosInstance.post("api/User/logout", {}, { withCredentials: true })

      if (response.status === 200) {
        toast.success(response.data.message || "Sesión cerrada correctamente")
        // Borra localStorage solo si el logout backend fue exitoso
        localStorage.clear()
        router.push("/user/login")
      } else {
        toast.error("Error al cerrar sesión")
        console.error("Error al cerrar sesión en el servidor")
      }
    } catch (error) {
      toast.error("Error al cerrar sesión")
      console.error("Error en la petición logout:", error)
    }
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  // Add this loading check before the return statement's first element
  if (checkingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
        <img src="/assets/img/pesopig.png" alt="Cargando..." className="w-20 h-20 animate-spin" />
      </div>
    )
  }

  // Add this authentication check
  if (!authenticated) {
    return <div className="text-center mt-10 text-red-600 font-bold">No autorizado. Redirigiendo a login...</div>
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={10000} theme="colored" />
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar - Solo mostrar si NO es móvil */}
        {!isMobile && (
          <div className={`nav-sidebar transition-all duration-300 relative ${isOpen ? "w-64" : "w-16"}`}>
            <div className="h-full flex flex-col relative pt-4">
              {/* Logo */}
              <div className="flex justify-center items-center mb-8 pt-2">
                <img
                  src="/assets/img/pesopig.png"
                  alt="PesoPig"
                  width={isOpen ? "65" : "40"}
                  height={isOpen ? "60" : "35"}
                />
              </div>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-1 shadow-lg w-6 h-6 flex items-center justify-center text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                {isOpen ? "◀" : "▶"}
              </button>

              {/* Menu */}
              <div className="flex-1 flex-col justify-center overflow-y-auto">
                {menuItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.path}
                    className="flex items-center px-4 py-3 text-white hover:bg-white/20 transition-colors font-bold rounded-lg mx-2"
                    style={{ fontFamily: "Arial, sans-serif", fontSize: "14px", whiteSpace: "nowrap" }}
                  >
                    <span className="text-xl min-w-[24px] text-center">{item.icon}</span>
                    {isOpen && <span className="ml-3">{item.title}</span>}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu Overlay - Solo mostrar si ES móvil */}
        {isMobile && isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={closeMobileMenu} />

            {/* Menu Panel */}
            <div className="fixed left-0 top-0 h-full w-64 nav-sidebar-mobile z-50 animate-slide-right">
              <div className="h-full flex flex-col pt-4">
                {/* Logo y botón cerrar */}
                <div className="flex justify-between items-center px-4 mb-8">
                  <img src="/assets/img/pesopig.png" alt="PesoPig" width="50" height="45" />
                  <Button variant="ghost" size="sm" onClick={closeMobileMenu} className="text-white hover:bg-white/20">
                    <X className="w-6 h-6" />
                  </Button>
                </div>

                {/* Menu Items */}
                <div className="flex-1 overflow-y-auto px-2">
                  {menuItems.map((item, index) => (
                    <Link
                      key={index}
                      href={item.path}
                      onClick={closeMobileMenu}
                      className="flex items-center px-4 py-3 text-white hover:bg-white/20 transition-colors font-bold rounded-lg mb-1"
                      style={{ fontFamily: "Arial, sans-serif", fontSize: "14px" }}
                    >
                      <span className="text-xl min-w-[24px] text-center mr-3">{item.icon}</span>
                      <span>{item.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Main Content */}
        <div className="flex-col flex-1 overflow-hidden">
          <nav className="navbar bg-nav-private shadow-lg z-40 h-16 md:h-20 flex items-center">
            <div className="container mx-auto flex items-center justify-between px-4">
              {/* Mobile Menu Button - Solo mostrar si ES móvil */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMobileMenu}
                  className="text-white hover:bg-white/20 mr-2"
                >
                  <Menu className="w-6 h-6" />
                </Button>
              )}

              {/* Título */}
              <h1
                className={`text-white font-bold ${isMobile ? "text-lg" : "text-2xl"}`}
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                PESO PIG
              </h1>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center text-white hover:bg-white/20 px-2 md:px-3 py-2 rounded-lg transition-colors"
                >
                  <User className="mr-1 md:mr-2" size={isMobile ? 16 : 20} />
                  <span className={`mr-1 md:mr-2 ${isMobile ? "text-sm" : ""}`}>
                    {isMobile
                      ? username?.substring(0, 8) + (username?.length > 8 ? "..." : "") || "User"
                      : username || "Usuario"}
                  </span>
                  <ChevronDown size={isMobile ? 14 : 16} />
                </button>

                {isUserMenuOpen && (
                  <div
                    className={`absolute right-0 mt-2 bg-white rounded-lg shadow-lg py-2 z-50 ${isMobile ? "w-48" : "w-64"}`}
                    style={{ position: "absolute", top: "calc(100% + 8px)" }}
                  >
                    <div
                      className={`px-4 py-2 text-gray-700 font-semibold border-b ${isMobile ? "text-sm" : "text-sm"}`}
                    >
                      {username || "Usuario"}
                      <span className="block text-xs text-gray-500">{email || "email@demo.com"}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className={`flex w-full items-center px-4 py-2 text-red-600 hover:bg-gray-100 transition-colors ${isMobile ? "text-sm" : "text-sm"}`}
                    >
                      <LogOut className="mr-2" size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </nav>

          {/* Página con ScrollArea */}
          <div className="flex-1 overflow-hidden">
            {title && <div className={`px-2 md:px-4 pt-2 md:pt-4 ${isMobile ? "text-sm" : ""}`}>{title}</div>}
            <ScrollArea className={`${isMobile ? "h-[calc(100vh-4rem)]" : "h-[calc(100vh-5rem)]"}`}>
              <main className={`${isMobile ? "p-2" : "p-4"}`}>{children}</main>
            </ScrollArea>
          </div>
        </div>

        <style jsx>{`
        .nav-sidebar {
          background: linear-gradient(135deg, var(--bg-color-primary), var(--bg-color-rosado)) !important;
          box-shadow: 4px 0 10px rgba(0, 0, 0, 0.1);
          height: 100vh;
          z-index: 10;
        }
        
        .nav-sidebar-mobile {
          background: linear-gradient(135deg, var(--bg-color-primary), var(--bg-color-rosado)) !important;
          box-shadow: 4px 0 10px rgba(0, 0, 0, 0.1);
        }
        
        .navbar.bg-nav-private {
          background: linear-gradient(135deg, var(--bg-color-primary), var(--bg-color-rosado)) !important;
        }
        
        @keyframes slide-right {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-right {
          animation: slide-right 0.3s ease-out;
        }
      `}</style>
      </div>
    </>
  )
}

export default NavPrivada