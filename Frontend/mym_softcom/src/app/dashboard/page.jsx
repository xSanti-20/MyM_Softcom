"use client"

import { useEffect, useState } from "react"
import NavPrivada from "@/components/nav/PrivateNav"
import {
  Loader2,
  PiggyBankIcon as Pig,
  Users,
  AlertCircle,
  Home,
  RefreshCw,
  Calendar,
  Activity,
  Info,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import axiosInstance from "@/lib/axiosInstance"
import { useRouter } from "next/navigation"

// Componente de tabla de datos resumida
const DataTable = ({ columns, data, title, maxRows = 5 }) => {
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
      shadow: "shadow-green-100/50",
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

// Componente de panel de información
const InfoPanel = ({ title, value, description, icon: Icon, color = "blue" }) => {
  const colorSchemes = {
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
    amber: "text-amber-600",
    purple: "text-purple-600",
  }

  return (
    <div className="flex items-center gap-3 p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
      {Icon && (
        <div className={`${colorSchemes[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div>
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</div>
        <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{value}</div>
        {description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  // TODOS LOS HOOKS DEBEN ESTAR AL INICIO DEL COMPONENTE
  // Estados para almacenar datos
  const [piglets, setPiglets] = useState([])
  const [races, setRaces] = useState([])
  const [stages, setStages] = useState([])
  const [corrals, setCorrals] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [stats, setStats] = useState({
    totalPiglets: 0,
    totalRaces: 0,
    totalStages: 0,
    totalCorrals: 0,
    pigletsPerStage: {},
    pigletsPerCorral: {},
  })

  // Estados para controlar la carga y errores
  const [dataLoading, setDataLoading] = useState(true)
  const [errors, setErrors] = useState({})
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isVerifying, setIsVerifying] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [role, setRole] = useState("")

  // Hook del router
  const router = useRouter()

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

  // Función para formatear fecha corta
  const formatShortDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }).format(date)
    } catch (error) {
      return "N/A"
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

  // Función para cargar todos los datos
  const loadAllData = async () => {
    setDataLoading(true)
    const newErrors = {}

    try {
      // Cargar datos de lechones
      try {
        const response = await axiosInstance.get("/api/Piglet/ConsultAllPiglets")
        console.log("Piglet data:", response.data)

        // Transformar los datos como lo haces en tu página de lechones
        const formattedPiglets = response.data.map((piglet) => ({
          id: piglet.id_Piglet,
          nombre: piglet.name_Piglet,
          pesoAcumulado: piglet.acum_Weight ?? "Sin dato",
          nacimiento: piglet.fec_Birth ? new Date(piglet.fec_Birth).toLocaleDateString() : "Sin fecha",
          pesoInicial: piglet.weight_Initial ?? "Sin dato",
          sexo: piglet.sex_Piglet ?? "Sin dato",
          corral: piglet.des_Corral || "Sin corral",
          raza: piglet.nam_Race || "Sin raza",
          etapa: piglet.name_Stage || "Sin etapa",
          placasena: piglet.placa_Sena ?? "Sin dato",
          // Guardamos los datos originales
          original: piglet,
        }))

        setPiglets(formattedPiglets)
      } catch (error) {
        console.error("Error fetching piglets:", error)
        newErrors.piglets = `Error al cargar lechones: ${error.message || "Error desconocido"}`
      }

      // Cargar datos de razas
      try {
        const response = await axiosInstance.get("/api/Race/ConsultAllRaces")
        console.log("Race data:", response.data)
        setRaces(response.data || [])
      } catch (error) {
        console.error("Error fetching races:", error)
        newErrors.races = `Error al cargar razas: ${error.message || "Error desconocido"}`
      }

      // Cargar datos de etapas
      try {
        const response = await axiosInstance.get("/api/Stage/ConsultAllStages")
        console.log("Stage data:", response.data)
        setStages(response.data || [])
      } catch (error) {
        console.error("Error fetching stages:", error)
        newErrors.stages = `Error al cargar etapas: ${error.message || "Error desconocido"}`
      }

      // Cargar datos de corrales
      try {
        const response = await axiosInstance.get("/api/Corral/ConsultAllCorrals")
        console.log("Corral data:", response.data)
        setCorrals(response.data || [])
      } catch (error) {
        console.error("Error fetching corrals:", error)
        newErrors.corrals = `Error al cargar corrales: ${error.message || "Error desconocido"}`
      }

      setErrors(newErrors)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Error general al cargar datos:", error)
      newErrors.general = `Error general: ${error.message || "Error desconocido"}`
    } finally {
      setDataLoading(false)
    }
  }

  // Preparar datos de actividad reciente
  const prepareRecentActivity = () => {
    try {
      const allActivities = []

      // Añadir actividades recientes de lechones (los últimos 5 registrados)
      piglets.slice(0, 5).forEach((piglet) => {
        allActivities.push({
          action: "Lechón registrado",
          details: `${piglet.nombre || "Sin nombre"} - Raza: ${piglet.raza || "No especificada"}`,
          time: piglet.original?.fec_Birth ? formatRelativeTime(piglet.original.fec_Birth) : "Fecha desconocida",
          date: new Date(piglet.original?.fec_Birth || Date.now()),
          icon: Pig,
          color: "blue",
        })
      })

      // Ordenar por fecha más reciente y tomar los 8 primeros
      setRecentActivity(allActivities.sort((a, b) => b.date - a.date).slice(0, 8))
    } catch (err) {
      console.error("Error preparing recent activity:", err)
      setRecentActivity([])
    }
  }

  // Calcular estadísticas
  const calculateStats = () => {
    try {
      // Total de lechones
      const totalPiglets = piglets.length

      // Total de razas
      const totalRaces = races.length

      // Total de etapas
      const totalStages = stages.length

      // Total de corrales
      const totalCorrals = corrals.length

      // Calcular lechones por etapa
      const pigletsPerStage = {}
      stages.forEach((stage) => {
        const count = piglets.filter((piglet) => piglet.original?.id_Stage === stage.id_Stage).length
        pigletsPerStage[stage.name_Stage || "Sin etapa"] = count
      })

      // Calcular lechones por corral
      const pigletsPerCorral = {}
      corrals.forEach((corral) => {
        const count = piglets.filter((piglet) => piglet.original?.id_Corral === corral.id_Corral).length
        pigletsPerCorral[corral.des_Corral || "Sin corral"] = count
      })

      setStats({
        totalPiglets,
        totalRaces,
        totalStages,
        totalCorrals,
        pigletsPerStage,
        pigletsPerCorral,
      })
    } catch (err) {
      console.error("Error calculating stats:", err)
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

  // Efecto para procesar los datos cuando se cargan
  useEffect(() => {
    prepareRecentActivity()
    calculateStats()
  }, [piglets, races, stages, corrals])

  // Efecto para obtener el rol del usuario
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("role")
      if (storedRole) {
        setRole(storedRole)
      }
    }
  }, [])

  // Función para navegar a otras páginas
  const navigateToPage = (page) => {
    router.push(page)
  }

  // Mientras se verifica o cargan datos iniciales, mostrar un loader
  if (isVerifying) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-white to-gray-100">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <p className="text-gray-600 animate-pulse">Cargando PESOPIG...</p>
        </div>
      </div>
    )
  }

  const hasErrors = Object.keys(errors).length > 0

  // Columnas para tablas de datos
  const pigletColumns = [
    { header: "ID", accessor: "id" },
    { header: "NOMBRE", accessor: "nombre" },
    { header: "SEXO", accessor: "sexo" },
    { header: "PESO", cell: (row) => `${row.pesoInicial || "N/A"} kg` },
    { header: "RAZA", accessor: "raza" },
    { header: "ETAPA", accessor: "etapa" },
    { header: "CORRAL", accessor: "corral" },
  ]

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
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Inicio</h1>
                    {role === "Administrador" && (
                      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Bienvenido Administrador</h1>
                    )}
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Resumen de la actividad de Porcinos</p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div
                      className={`${hasErrors ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                        } text-xs font-medium px-3 py-1.5 rounded-full flex items-center`}
                    >
                      <span
                        className={`w-2 h-2 ${hasErrors ? "bg-amber-500" : "bg-blue-500"
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
                            className="text-xs gap-1.5"
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
                    Resumen
                  </TabsTrigger>
                </TabsList>

                {/* Contenido de la pestaña Resumen */}
                <TabsContent value="overview" className="space-y-6">
                  {/* Tarjetas de estadísticas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard
                      icon={Pig}
                      title="Lechones"
                      value={stats.totalPiglets.toString()}
                      description="Total de lechones registrados"
                      color="blue"
                    />
                    <StatCard
                      icon={Users}
                      title="Razas"
                      value={stats.totalRaces.toString()}
                      description="Total de razas registradas"
                      color="green"
                    />
                    <StatCard
                      icon={BarChart3}
                      title="Etapas"
                      value={stats.totalStages.toString()}
                      description="Total de etapas configuradas"
                      color="amber"
                    />
                    <StatCard
                      icon={Home}
                      title="Corrales"
                      value={stats.totalCorrals.toString()}
                      description="Total de corrales Registrados"
                      color="purple"
                    />
                  </div>

                  {/* Contenido principal y actividades recientes */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Tabla de lechones */}
                    <div className="lg:col-span-2 space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Últimos Lechones Registrados</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <DataTable columns={pigletColumns} data={piglets} maxRows={5} />
                        </CardContent>
                        <CardFooter className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-blue-600 gap-1"
                            onClick={() => navigateToPage("/dashboard/animals")}
                          >
                            Ver todos los lechones
                          </Button>
                        </CardFooter>
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
                        title="Resumen de Datos"
                        icon={Info}
                        color="blue"
                        messages={[
                          `${piglets.length} lechones en total`,
                          `${races.length} razas registradas`,
                          `${stages.length} etapas configuradas`,
                          `${corrals.length} corrales en total`,
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
