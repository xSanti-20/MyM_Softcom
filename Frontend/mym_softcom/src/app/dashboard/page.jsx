"use client"

import { useEffect, useState } from "react"
import NavPrivada from "@/components/nav/PrivateNav"
import {
  Loader2,
  CreditCard,
  AlertCircle,
  DollarSign,
  RefreshCw,
  Calendar,
  Activity,
  Info,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  XCircle,
  Building2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import axiosInstance from "@/lib/axiosInstance"
import Image from "next/image"
import { useRouter } from "next/navigation"

// Componente de tabla de datos resumida
const DataTable = ({ columns, data, title, maxRows = 5, footerData = null }) => {
  const [showAll, setShowAll] = useState(false)
  const displayData = showAll ? data : data.slice(0, maxRows)

  return (
    <div className="w-full">
      {title && <h3 className="text-base font-medium mb-3">{title}</h3>}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {columns.map((column, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {displayData.length > 0 ? (
                displayData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    {columns.map((column, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300"
                      >
                        {column.cell ? column.cell(row) : row[column.accessor]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No hay datos disponibles
                  </td>
                </tr>
              )}
            </tbody>
            {/* Nuevo: Pie de tabla para la fila de totales */}
            {footerData && (
              <tfoot className="bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <tr>
                  {columns.map((column, i) => (
                    <td
                      key={i}
                      className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${
                        i === 0 ? "text-gray-800 dark:text-gray-200" : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {column.cell ? column.cell(footerData) : footerData[column.accessor]}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {data.length > maxRows && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-right">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-blue-600 gap-1"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? (
                <>
                  Mostrar menos <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Ver todos ({data.length}) <ChevronDown className="h-3 w-3" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Componente de tarjeta de estadísticas
const StatCard = ({ icon: Icon, title, value, description, color = "blue", onClick = null }) => {
  const colorSchemes = {
    blue: {
      light: "bg-blue-50 text-blue-700 border-blue-100",
      icon: "bg-blue-100 text-blue-600",
      trend: "text-blue-600",
      border: "border-blue-100 hover:border-blue-200",
      shadow: "shadow-blue-100/50",
    },
    green: {
      light: "bg-green-50 text-green-700 border-green-100",
      icon: "bg-green-100 text-green-600",
      trend: "text-green-600",
      border: "border-green-100 hover:border-green-200",
      shadow: "shadow-blue-100/50",
    },
    purple: {
      light: "bg-purple-50 text-purple-700 border-purple-100",
      icon: "bg-purple-100 text-purple-600",
      trend: "text-purple-600",
      border: "border-purple-100 hover:border-purple-200",
      shadow: "shadow-purple-100/50",
    },
    amber: {
      light: "bg-amber-50 text-amber-700 border-amber-100",
      icon: "bg-amber-100 text-amber-600",
      trend: "text-amber-600",
      border: "border-amber-100 hover:border-amber-200",
      shadow: "shadow-amber-100/50",
    },
    red: {
      light: "bg-red-50 text-red-700 border-red-100",
      icon: "bg-red-100 text-red-600",
      trend: "text-red-600",
      border: "border-red-100 hover:border-red-200",
      shadow: "shadow-red-100/50",
    },
    cyan: {
      light: "bg-cyan-50 text-cyan-700 border-cyan-100",
      icon: "bg-cyan-100 text-cyan-600",
      trend: "text-cyan-600",
      border: "border-cyan-100 hover:border-cyan-200",
      shadow: "shadow-cyan-100/50",
    },
    teal: {
      light: "bg-teal-50 text-teal-700 border-teal-100",
      icon: "bg-teal-100 text-teal-600",
      trend: "text-teal-600",
      border: "border-teal-100 hover:border-teal-200",
      shadow: "shadow-teal-100/50",
    },
  }

  const scheme = colorSchemes[color]

  return (
    <Card
      className={`border ${scheme.border} shadow-sm hover:shadow-md transition-all duration-300 ${scheme.shadow} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className={`p-2.5 rounded-lg ${scheme.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <div className="text-2xl font-bold">{value}</div>
        <CardDescription className="text-sm">{title}</CardDescription>
      </CardContent>
      {description && <CardFooter className="pt-0 text-xs text-gray-500 dark:text-gray-400">{description}</CardFooter>}
    </Card>
  )
}

// Componente de alerta
const AlertCard = ({ title, messages, icon: Icon = AlertCircle, color = "amber" }) => {
  const colorSchemes = {
    amber: "border-l-amber-500 bg-amber-50/50",
    red: "border-l-red-500 bg-red-50/50",
    blue: "border-l-blue-500 bg-blue-50/50",
    green: "border-l-green-500 bg-green-50/50",
    purple: "border-l-purple-500 bg-purple-50/50",
  }

  const iconColors = {
    amber: "text-amber-500",
    red: "text-red-500",
    blue: "text-blue-500",
    green: "text-green-500",
    purple: "text-purple-500",
  }

  return (
    <Card className={`border-l-4 ${colorSchemes[color]} shadow-sm`}>
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-2">
          <Icon className={`h-5 w-5 ${iconColors[color]}`} />
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="py-1">
        <ul className="space-y-1.5">
          {messages.map((message, index) => (
            <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
              <span className="mr-2 text-gray-400">•</span>
              {message}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// Componente de actividad reciente
const ActivityItem = ({ action, details, time, icon: Icon = Activity, color = "blue" }) => {
  const colorSchemes = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    amber: "bg-amber-100 text-amber-600",
    purple: "bg-purple-100 text-purple-600",
  }

  return (
    <div className="py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150">
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-full ${colorSchemes[color]} mt-0.5`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{action}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{details}</p>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">{time}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  // Estados para almacenar datos
  const [payments, setPayments] = useState([]) // Mantener por si se necesita en el futuro, aunque la tabla se quita
  const [clients, setClients] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [stats, setStats] = useState({
    activeClients: 0,
    overdueClients: 0,
    totalOwed: 0,
    cancellations: 0,
    monthlyRevenue: 0, // Recaudo de pagos del mes actual
    // Nuevos campos para proyectos del mes actual
    luxuryMonthly: 0,
    reservasMonthly: 0,
    malibuMonthly: 0,
    totalCurrentMonthProjectRevenue: 0, // Total de recaudo de proyectos del mes actual
  })
  const [historicalProjectRevenue, setHistoricalProjectRevenue] = useState([])
  const [historicalProjectColumns, setHistoricalProjectColumns] = useState([])
  const [historicalProjectTotals, setHistoricalProjectTotals] = useState(null) // Nuevo estado para los totales

  // Estados para controlar la carga y errores
  const [dataLoading, setDataLoading] = useState(true)
  const [errors, setErrors] = useState({})
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isVerifying, setIsVerifying] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [role, setRole] = useState("")
  const [isCheckingRole, setIsCheckingRole] = useState(true)

  // Hook del router
  const router = useRouter()

  // Función para formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount || 0)
  }

  // Función para formatear fecha
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    } catch (error) {
      console.error("Error formatting date:", error)
      return "Fecha desconocida"
    }
  }

  // Función para formatear fecha relativa
  const formatRelativeTime = (dateString) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now - date
      const diffSecs = Math.floor(diffMs / 1000)
      const diffMins = Math.floor(diffSecs / 60)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffSecs < 60) return "Hace unos segundos"
      if (diffMins < 60) return `Hace ${diffMins} ${diffMins === 1 ? "minuto" : "minutos"}`
      if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`
      if (diffDays < 7) return `Hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`

      return formatDate(dateString)
    } catch (error) {
      return "Fecha desconocida"
    }
  }

  // Función para obtener el nombre del mes
  const getMonthName = (monthNumber) => {
    const date = new Date(2000, monthNumber - 1, 1) // Usar un año y día arbitrario
    return date.toLocaleString("es-ES", { month: "long" })
  }

  // Función para cargar todos los datos del dashboard
  const loadAllData = async () => {
    setDataLoading(true)
    const newErrors = {}

    try {
      // Cargar estadísticas principales
      try {
        const response = await axiosInstance.get("/api/Dashboard/GetMainStats")
        console.log("Main stats data:", response.data)

        if (response.data && typeof response.data === "object") {
          setStats((prevStats) => ({
            ...prevStats,
            activeClients: response.data.activeClients || 0,
            overdueClients: response.data.overdueClients || 0,
            totalOwed: response.data.totalOwed || 0,
            cancellations: response.data.withdrawalsThisMonth || 0,
            monthlyRevenue: response.data.monthlyRevenue || 0, // Recaudo mensual de pagos (del mes actual)
          }))
        }
      } catch (error) {
        console.error("Error fetching main stats:", error)
        newErrors.mainStats = `Error al cargar estadísticas principales: ${error.message || "Error desconocido"}`
      }

      // Cargar recaudos por proyecto (del mes actual)
      try {
        const response = await axiosInstance.get("/api/Dashboard/GetProjectRevenue")
        console.log("Current month project revenue data:", response.data)

        const projectRevenues = response.data && Array.isArray(response.data.projects) ? response.data.projects : []
        const totalCurrentMonthProjectRevenue =
          response.data && typeof response.data.totalCurrentMonthRevenue === "number"
            ? response.data.totalCurrentMonthRevenue
            : 0

        console.log("=== DEBUGGING PROJECT NAMES ===")
        console.log("Total projects returned:", projectRevenues.length)
        projectRevenues.forEach((project, index) => {
          console.log(`Project ${index + 1}:`, {
            id: project.projectId,
            name: project.projectName,
            revenue: project.monthlyRevenue,
            normalizedName: project.projectName?.toLowerCase().trim().replace(/\s+/g, " "),
          })
        })
        console.log("Total current month revenue:", totalCurrentMonthProjectRevenue)
        console.log("=== END DEBUGGING ===")

        // Función helper para normalizar nombres (quitar espacios extra, convertir a minúsculas)
        const normalizeProjectName = (name) => name?.toLowerCase().trim().replace(/\s+/g, " ") || ""

        // Buscar proyectos con matching más flexible
        const luxuryMalibuProject = projectRevenues.find((p) => {
          const normalized = normalizeProjectName(p.projectName)
          return normalized.includes("luxury") && normalized.includes("malibu")
        })

        const reservasProject = projectRevenues.find((p) => {
          const normalized = normalizeProjectName(p.projectName)
          return normalized.includes("reservas") && normalized.includes("poblado")
        })

        const malibuProject = projectRevenues.find((p) => {
          const normalized = normalizeProjectName(p.projectName)
          return normalized === "malibu" || (normalized.includes("malibu") && !normalized.includes("luxury"))
        })

        console.log("=== PROJECT MATCHING RESULTS ===")
        console.log("Luxury Malibu project found:", luxuryMalibuProject)
        console.log("Reservas project found:", reservasProject)
        console.log("Malibu project found:", malibuProject)
        console.log("=== END MATCHING RESULTS ===")

        setStats((prevStats) => ({
          ...prevStats,
          luxuryMonthly: luxuryMalibuProject?.monthlyRevenue || 0,
          reservasMonthly: reservasProject?.monthlyRevenue || 0,
          malibuMonthly: malibuProject?.monthlyRevenue || 0,
          totalCurrentMonthProjectRevenue: totalCurrentMonthProjectRevenue,
        }))
      } catch (error) {
        console.error("Error fetching current month project revenue:", error)
        newErrors.projectRevenue = `Error al cargar recaudos por proyecto del mes actual: ${error.message || "Error desconocido"}`
      }

      // Cargar recaudos históricos por proyecto (AHORA SOLO PARA EL AÑO ACTUAL)
      try {
        const response = await axiosInstance.get("/api/Dashboard/GetHistoricalProjectRevenue") // Ya no se pasa 'months'
        console.log("Historical project revenue data (current year):", response.data)

        const historicalData =
          response.data && Array.isArray(response.data.historicalData) ? response.data.historicalData : []
        const projectNames =
          response.data && Array.isArray(response.data.projectNames) ? response.data.projectNames : []

        // Preparar columnas dinámicas para la tabla histórica
        const dynamicColumns = [
          { header: "MES", accessor: "monthName" },
          ...projectNames.map((name) => ({
            header: name.toUpperCase(), // Nombre del proyecto como encabezado
            accessor: name, // El nombre del proyecto será la clave en los datos de la fila
            cell: (row) => formatCurrency(row[name]), // Formatear como moneda
          })),
        ]
        setHistoricalProjectColumns(dynamicColumns)

        // Formatear los datos históricos para la tabla
        const formattedHistoricalData = historicalData.map((item) => {
          const row = {
            monthName: `${getMonthName(item.month)} ${item.year}`, // "Enero 2023"
          }
          projectNames.forEach((name) => {
            row[name] = item[name] // Asignar el valor del proyecto
          })
          return row
        })
        setHistoricalProjectRevenue(formattedHistoricalData)

        // Calcular los totales para la fila de pie de tabla
        const totalsRow = { monthName: `TOTAL AÑO ${new Date().getFullYear()}` } // Etiqueta para el total anual
        projectNames.forEach((name) => {
          totalsRow[name] = formattedHistoricalData.reduce((sum, row) => sum + (row[name] || 0), 0)
        })
        setHistoricalProjectTotals(totalsRow)
      } catch (error) {
        console.error("Error fetching historical project revenue:", error)
        newErrors.historicalProjectRevenue = `Error al cargar recaudos históricos por proyecto: ${error.message || "Error desconocido"}`
        setHistoricalProjectRevenue([])
        setHistoricalProjectColumns([])
        setHistoricalProjectTotals(null)
      }

      // Cargar actividad reciente
      try {
        const response = await axiosInstance.get("/api/Dashboard/GetRecentActivity?limit=8")
        console.log("Recent activity data:", response.data)

        if (response.data && Array.isArray(response.data)) {
          const formattedActivity = response.data.map((activity) => ({
            action: activity.action || "Actividad desconocida",
            details: activity.details || "Sin detalles",
            time: formatRelativeTime(activity.date),
            date: new Date(activity.date || Date.now()),
            icon: activity.type === "payment" ? CreditCard : XCircle,
            color: activity.color || "blue",
          }))

          setRecentActivity(formattedActivity)
        } else {
          console.warn("Recent activity API returned non-array data:", response.data)
          setRecentActivity([])
        }
      } catch (error) {
        console.error("Error fetching recent activity:", error)
        newErrors.activity = `Error al cargar actividad reciente: ${error.message || "Error desconocido"}`
        setRecentActivity([])
      }

      // Cargar datos de clientes (para mantener compatibilidad)
      try {
        const response = await axiosInstance.get("/api/Client/GetAll")
        console.log("Client data:", response.data)

        if (response.data && Array.isArray(response.data)) {
          setClients(response.data)
        } else {
          console.warn("Client API returned non-array data:", response.data)
          setClients([])
        }
      } catch (error) {
        console.error("Error fetching clients:", error)
        newErrors.clients = `Error al cargar clientes: ${error.message || "Error desconocido"}`
        setClients([])
      }

      setErrors(newErrors)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Error general al cargar datos:", error)
      newErrors.general = `Error general: ${error.message || "Error desconocido"}`
      setErrors(newErrors)
    } finally {
      setDataLoading(false)
    }
  }

  // Efecto para cargar datos iniciales
  useEffect(() => {
    loadAllData()

    // Configurar intervalo para actualizar datos cada 60 segundos
    const intervalId = setInterval(() => {
      loadAllData()
    }, 60000)

    // Limpiar intervalo al desmontar
    return () => clearInterval(intervalId)
  }, [])

  // Efecto para obtener el rol del usuario
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("role")
      setRole(storedRole || "")
      setIsCheckingRole(false)
    }
  }, [])

  // Función para navegar a otras páginas
  const navigateToPage = (page) => {
    router.push(page)
  }

  // Show loading while checking role
  if (isCheckingRole) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-white to-gray-100">
        <div className="flex flex-col items-center">
          <Image src="/assets/img/mymsoftcom.png" alt="Cargando..." width={80} height={80} className="animate-spin" />
          <p className="text-lg text-gray-700 font-semibold mt-2">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  // Show access denied if not administrator
  if (role !== "Administrador") {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-white to-gray-100">
        <div className="flex flex-col items-center text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 rounded-full p-4 mb-4">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600 mb-4">
            No tienes permisos para ver esta página. Solo los administradores pueden acceder al dashboard.
          </p>
          <p className="text-sm text-gray-500">Tu rol actual: {role || "Sin rol asignado"}</p>
        </div>
      </div>
    )
  }

  // Mientras se verifica o cargan datos iniciales, mostrar un loader
  if (isVerifying) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-white to-gray-100">
        <div className="flex flex-col items-center">
          <Image src="/assets/img/mymsoftcom.png" alt="Cargando..." width={80} height={80} className="animate-spin" />
          <p className="text-lg text-gray-700 font-semibold mt-2">Cargando...</p>
        </div>
      </div>
    )
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-col flex-1">
        <NavPrivada>
          <div className="py-6 px-4 md:px-6">
            <div className="max-w-7xl mx-auto">
              {/* Encabezado del dashboard */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Bienvenido a M&M SoftCom</h1>

                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Resumen y control de la Actividad financiera
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div
                      className={`${
                        hasErrors ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      } text-xs font-medium px-3 py-1.5 rounded-full flex items-center`}
                    >
                      <span
                        className={`w-2 h-2 ${
                          hasErrors ? "bg-amber-500" : "bg-blue-500"
                        } rounded-full mr-1.5 animate-pulse`}
                      ></span>
                      {hasErrors ? "Datos parciales" : "Datos en tiempo real"}
                    </div>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1.5 bg-transparent"
                            onClick={loadAllData}
                            disabled={dataLoading}
                          >
                            {dataLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            Actualizar
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Última actualización: {lastUpdated.toLocaleTimeString()}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {dataLoading && (
                      <div className="flex items-center text-gray-500 text-xs">
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Actualizando...
                      </div>
                    )}
                  </div>
                </div>

                {/* Mostrar errores si existen */}
                {hasErrors && (
                  <Card className="border-l-4 border-l-amber-500 shadow-sm mb-6 bg-amber-50/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <CardTitle className="text-sm font-medium">Problemas de conexión</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="py-1">
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Algunos datos no pudieron cargarse correctamente. Se están mostrando datos parciales.
                      </p>
                      <details className="text-xs text-gray-600 dark:text-gray-400">
                        <summary className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 font-medium">
                          Ver detalles técnicos
                        </summary>
                        <ul className="mt-2 space-y-1 pl-4">
                          {Object.values(errors).map((err, index) => (
                            <li key={index} className="text-red-600 dark:text-red-400">
                              {err}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Pestañas del dashboard */}
              <Tabs defaultValue="overview" className="mb-6" onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="overview" className="text-sm">
                    Resumen Financiero
                  </TabsTrigger>
                </TabsList>

                {/* Contenido de la pestaña Resumen */}
                <TabsContent value="overview" className="space-y-6">
                  {/* Tarjetas de estadísticas de pagos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <StatCard
                      icon={UserCheck}
                      title="Clientes Activos"
                      value={stats.activeClients.toString()}
                      description="Clientes al día con sus pagos"
                      color="green"
                    />
                    <StatCard
                      icon={UserX}
                      title="Clientes en Mora"
                      value={stats.overdueClients.toString()}
                      description="Clientes con pagos vencidos"
                      color="red"
                    />
                    <StatCard
                      icon={DollarSign}
                      title="Total Adeudado"
                      value={formatCurrency(stats.totalOwed)}
                      description="Monto total en mora"
                      color="amber"
                    />
                    <StatCard
                      icon={XCircle}
                      title="Desistimientos"
                      value={stats.cancellations.toString()}
                      description="Pagos cancelados este mes"
                      color="purple"
                    />
                  </div>

                  {/* Tarjeta de recaudo total (suma de proyectos del mes actual) */}
                  <div className="grid grid-cols-1 mb-4">
                    <StatCard
                      icon={CreditCard}
                      title="Recaudado Total (Proyectos del Mes)"
                      value={formatCurrency(stats.totalCurrentMonthProjectRevenue)}
                      description="Dinero total recaudado por proyectos en el mes actual"
                      color="teal"
                    />
                  </div>

                  {/* Tarjetas de recaudos por proyecto del mes actual */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <StatCard
                      icon={Building2}
                      title="Luxury Malibu - Mes Actual"
                      value={formatCurrency(stats.luxuryMonthly)}
                      description="Recaudo total proyecto Luxury Malibu en el mes actual"
                      color="blue"
                    />
                    <StatCard
                      icon={Building2}
                      title="Reservas del Poblado - Mes Actual"
                      value={formatCurrency(stats.reservasMonthly)}
                      description="Recaudo total proyecto Reservas del Poblado en el mes actual"
                      color="cyan"
                    />
                    <StatCard
                      icon={Building2}
                      title="Malibu - Mes Actual"
                      value={formatCurrency(stats.malibuMonthly)}
                      description="Recaudo total proyecto Malibu en el mes actual"
                      color="green"
                    />
                  </div>

                  {/* Contenido principal y actividades recientes */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Tabla de recaudos históricos por proyecto */}
                    <div className="lg:col-span-2 space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Recaudos Históricos por Proyecto (Año Actual)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <DataTable
                            columns={historicalProjectColumns}
                            data={historicalProjectRevenue}
                            maxRows={12} // Se puede ajustar para mostrar más meses si el año tiene más datos
                            title="Historial Mensual de Proyectos"
                            footerData={historicalProjectTotals} // Pasar los totales aquí
                          />
                        </CardContent>
                        {/* No hay botón "Ver todos" aquí, ya que la tabla ya muestra el historial configurado */}
                      </Card>
                    </div>

                    {/* Alertas y actividades recientes */}
                    <div className="space-y-6">
                      <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Actividad Reciente</CardTitle>
                            <Badge variant="outline" className="text-xs font-normal">
                              {recentActivity.length} actividades
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          {recentActivity.length > 0 ? (
                            <div className="divide-y">
                              {recentActivity.map((item, index) => (
                                <ActivityItem
                                  key={index}
                                  action={item.action}
                                  details={item.details}
                                  time={item.time}
                                  icon={item.icon}
                                  color={item.color}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                              <Calendar className="h-10 w-10 text-gray-300 mb-2" />
                              <p>No hay actividades recientes</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <AlertCard
                        title="Resumen Financiero"
                        icon={Info}
                        color="blue"
                        messages={[
                          `${stats.activeClients} clientes activos`,
                          `${formatCurrency(stats.totalCurrentMonthProjectRevenue)} recaudado por proyectos este mes`, // Mensaje actualizado
                          `${formatCurrency(stats.totalOwed)} pendiente de cobro`,
                          `${stats.cancellations} desistimientos este mes`,
                        ]}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </NavPrivada>
      </div>
    </div>
  )
}
