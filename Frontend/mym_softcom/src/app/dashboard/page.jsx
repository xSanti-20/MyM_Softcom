"use client"

import { useEffect, useState, useCallback } from "react"
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

// Componente de tabla de datos resumida - Mejorado
const DataTable = ({ columns, data, title, maxRows = 5, footerData = null }) => {
  const [showAll, setShowAll] = useState(false)
  const displayData = showAll ? data : data.slice(0, maxRows)

  return (
    <div className="w-full">
      {title && <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</p>}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-50/50 dark:from-gray-800/50 dark:to-gray-900/30 border-b border-gray-200 dark:border-gray-800">
              <tr>
                {columns.map((column, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {displayData.length > 0 ? (
                displayData.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex} 
                    className="hover:bg-pink-50/30 dark:hover:bg-pink-900/20 transition-colors duration-150"
                  >
                    {columns.map((column, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 font-medium"
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
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center">
                      <Calendar className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                      No hay datos disponibles
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {/* Fila de totales */}
            {footerData && (
              <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 border-t border-gray-200 dark:border-gray-700">
                <tr>
                  {columns.map((column, i) => (
                    <td
                      key={i}
                      className={`px-4 py-3 whitespace-nowrap text-sm font-bold ${i === 0 ? "text-gray-900 dark:text-gray-100" : "text-pink-700 dark:text-pink-400"
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
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 text-right">
            <Button
              variant="ghost"
              size="sm"
              className="text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 gap-1.5 font-medium text-xs"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? (
                <>
                  Mostrar menos <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Ver todos ({data.length}) <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Componente de tarjeta de estadísticas - Mejorado
const StatCard = ({ icon: Icon, title, value, description, color = "blue", onClick = null }) => {
  const colorSchemes = {
    blue: {
      light: "bg-gradient-to-br from-blue-50 to-blue-50/40 dark:from-blue-900/20 dark:to-blue-900/10 hover:from-blue-100 hover:to-blue-50/50",
      icon: "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30",
      accent: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
      border: "border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700",
    },
    green: {
      light: "bg-gradient-to-br from-pink-50 to-pink-50/40 dark:from-pink-900/20 dark:to-pink-900/10 hover:from-pink-100 hover:to-pink-50/50",
      icon: "bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/30",
      accent: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
      border: "border border-pink-200 dark:border-pink-800 hover:border-pink-300 dark:hover:border-pink-700",
    },
    purple: {
      light: "bg-gradient-to-br from-purple-50 to-purple-50/40 dark:from-purple-900/20 dark:to-purple-900/10 hover:from-purple-100 hover:to-purple-50/50",
      icon: "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30",
      accent: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
      border: "border border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700",
    },
    amber: {
      light: "bg-gradient-to-br from-amber-50 to-amber-50/40 dark:from-amber-900/20 dark:to-amber-900/10 hover:from-amber-100 hover:to-amber-50/50",
      icon: "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30",
      accent: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
      border: "border border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700",
    },
    red: {
      light: "bg-gradient-to-br from-red-50 to-red-50/40 dark:from-red-900/20 dark:to-red-900/10 hover:from-red-100 hover:to-red-50/50",
      icon: "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30",
      accent: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
      border: "border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700",
    },
    cyan: {
      light: "bg-gradient-to-br from-cyan-50 to-cyan-50/40 dark:from-cyan-900/20 dark:to-cyan-900/10 hover:from-cyan-100 hover:to-cyan-50/50",
      icon: "bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30",
      accent: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
      border: "border border-cyan-200 dark:border-cyan-800 hover:border-cyan-300 dark:hover:border-cyan-700",
    },
    teal: {
      light: "bg-gradient-to-br from-teal-50 to-teal-50/40 dark:from-teal-900/20 dark:to-teal-900/10 hover:from-teal-100 hover:to-teal-50/50",
      icon: "bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30",
      accent: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
      border: "border border-teal-200 dark:border-teal-800 hover:border-teal-300 dark:hover:border-teal-700",
    },
  }

  const scheme = colorSchemes[color]

  return (
    <Card
      className={`${scheme.light} ${scheme.border} shadow-md hover:shadow-xl transition-all duration-300 ${onClick ? "cursor-pointer active:scale-95" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-xl ${scheme.icon} transform transition-transform duration-300 hover:scale-110`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-3">
        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
        <CardDescription className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</CardDescription>
      </CardContent>
      {description && <CardFooter className="pt-0 text-xs text-gray-600 dark:text-gray-400 font-medium">{description}</CardFooter>}
    </Card>
  )
}

// Componente de alerta - Mejorado
const AlertCard = ({ title, messages, icon: Icon = AlertCircle, color = "amber" }) => {
  const colorSchemes = {
    amber: "border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-amber-50/30 dark:from-amber-900/20 dark:to-amber-900/10 shadow-md",
    red: "border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-red-50/30 dark:from-red-900/20 dark:to-red-900/10 shadow-md",
    blue: "border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-blue-50/30 dark:from-blue-900/20 dark:to-blue-900/10 shadow-md",
    green: "border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-green-50/30 dark:from-green-900/20 dark:to-green-900/10 shadow-md",
    purple: "border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-purple-50/30 dark:from-purple-900/20 dark:to-purple-900/10 shadow-md",
  }

  const iconColors = {
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    red: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  }

  return (
    <Card className={`${colorSchemes[color]}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${iconColors[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {messages.map((message, index) => (
            <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-3">
              <span className="text-lg leading-none mt-0.5">•</span>
              <span>{message}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// Componente de actividad reciente - Mejorado
const ActivityItem = ({ action, details, time, icon: Icon = Activity, color = "blue" }) => {
  const colorSchemes = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    emerald: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  }

  return (
    <div className="py-4 px-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors duration-150 border-b last:border-b-0 border-gray-100 dark:border-gray-800">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colorSchemes[color]} flex-shrink-0 mt-0.5`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{action}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{details}</p>
          <span className="text-xs text-gray-500 dark:text-gray-500 mt-2 inline-block font-medium">{time}</span>
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
  const formatRelativeTime = useCallback((dateString) => {
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
  }, [])

  // Función para obtener el nombre del mes
  const getMonthName = (monthNumber) => {
    const date = new Date(2000, monthNumber - 1, 1) // Usar un año y día arbitrario
    return date.toLocaleString("es-ES", { month: "long" })
  }

  const normalizeProjectName = (name) =>
    name
      ?.toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ") || ""

  const getPaymentAmount = (payment) => {
    const numericAmount = Number(payment?.amount)
    return Number.isFinite(numericAmount) ? numericAmount : 0
  }

  const getPaymentProjectName = (payment) =>
    payment?.sale?.lot?.project?.name ||
    payment?.sale?.lot?.Project?.name ||
    payment?.sale?.Lot?.project?.name ||
    payment?.sale?.Lot?.Project?.name ||
    payment?.sale?.lot?.project_name ||
    ""

  const calculateProjectRevenueFromPayments = (paymentsList) => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const summary = {
      luxuryMonthly: 0,
      reservasMonthly: 0,
      malibuMonthly: 0,
      totalCurrentMonthProjectRevenue: 0,
    }

    ;(Array.isArray(paymentsList) ? paymentsList : []).forEach((payment) => {
      if (!payment?.payment_date) return

      const paymentDate = new Date(payment.payment_date)
      if (paymentDate.getMonth() !== currentMonth || paymentDate.getFullYear() !== currentYear) {
        return
      }

      const amount = getPaymentAmount(payment)
      const normalizedName = normalizeProjectName(getPaymentProjectName(payment))

      if (!normalizedName || amount <= 0) return

      if (normalizedName.includes("luxury") && normalizedName.includes("malibu")) {
        summary.luxuryMonthly += amount
      } else if (normalizedName.includes("reservas") && normalizedName.includes("poblado")) {
        summary.reservasMonthly += amount
      } else if (normalizedName === "malibu" || (normalizedName.includes("malibu") && !normalizedName.includes("luxury"))) {
        summary.malibuMonthly += amount
      }
    })

    summary.totalCurrentMonthProjectRevenue =
      summary.luxuryMonthly + summary.reservasMonthly + summary.malibuMonthly

    return summary
  }

  const calculateAnnualProjectRevenueFromPayments = (paymentsList) => {
    const currentYear = new Date().getFullYear()
    const currentMonthIndex = new Date().getMonth()
    const monthlyRows = Array.from({ length: currentMonthIndex + 1 }, (_, index) => ({
      monthNumber: index + 1,
      monthName: `${getMonthName(index + 1)} ${currentYear}`,
      luxuryMalibu: 0,
      reservasDelPoblado: 0,
      malibu: 0,
    }))

    ;(Array.isArray(paymentsList) ? paymentsList : []).forEach((payment) => {
      if (!payment?.payment_date) return

      const paymentDate = new Date(payment.payment_date)
      if (Number.isNaN(paymentDate.getTime()) || paymentDate.getFullYear() !== currentYear) return

      const amount = getPaymentAmount(payment)
      const normalizedName = normalizeProjectName(getPaymentProjectName(payment))
      const row = monthlyRows[paymentDate.getMonth()]

      if (!row || amount <= 0 || !normalizedName) return

      if (normalizedName.includes("luxury") && normalizedName.includes("malibu")) {
        row.luxuryMalibu += amount
      } else if (normalizedName.includes("reservas") && normalizedName.includes("poblado")) {
        row.reservasDelPoblado += amount
      } else if (normalizedName === "malibu" || (normalizedName.includes("malibu") && !normalizedName.includes("luxury"))) {
        row.malibu += amount
      }
    })

    const totalsRow = monthlyRows.reduce(
      (accumulator, row) => {
        accumulator.luxuryMalibu += row.luxuryMalibu
        accumulator.reservasDelPoblado += row.reservasDelPoblado
        accumulator.malibu += row.malibu
        return accumulator
      },
      {
        monthName: `TOTAL AÑO ${currentYear}`,
        luxuryMalibu: 0,
        reservasDelPoblado: 0,
        malibu: 0,
      },
    )

    return {
      columns: [
        { header: "MES", accessor: "monthName" },
        {
          header: "LUXURY MALIBU",
          accessor: "luxuryMalibu",
          cell: (row) => formatCurrency(row.luxuryMalibu),
        },
        {
          header: "RESERVAS DEL POBLADO",
          accessor: "reservasDelPoblado",
          cell: (row) => formatCurrency(row.reservasDelPoblado),
        },
        {
          header: "MALIBU",
          accessor: "malibu",
          cell: (row) => formatCurrency(row.malibu),
        },
      ],
      rows: [...monthlyRows].reverse(),
      totalsRow,
    }
  }

  // Calcular cuotas en mora para una venta (misma lógica que reportes)
  const calculateOverdueQuotas = useCallback((sale, paymentDetails) => {
    const totalDebt = Number.parseFloat(sale?.total_debt) || 0

    if (!sale || !sale.plan || totalDebt <= 0) {
      return { count: 0, details: [], totalOverdue: 0 }
    }

    const totalQuotas = sale.plan.number_quotas || 0
    const quotaValue = sale.quota_value || 0
    const saleDate = new Date(sale.sale_date)
    const currentDate = new Date()

    // Procesar customQuotas si existen
    let customQuotas = null
    const paymentPlanType = sale.paymentPlanType || sale.PaymentPlanType
    const customQuotasJson = sale.customQuotasJson || sale.CustomQuotasJson
    
    if (paymentPlanType?.toLowerCase() === "custom" && customQuotasJson) {
      try {
        customQuotas = JSON.parse(customQuotasJson)
      } catch (error) {
        console.error("Error parsing custom quotas JSON:", error)
      }
    }

    const parseAmount = (value) => {
      const parsed = Number.parseFloat(value)
      return Number.isFinite(parsed) ? parsed : 0
    }

    // Agrupar pagos por cuota
    const aggregatedQuotas = new Map()
    const uniquePayments = new Map()

    if (paymentDetails && Array.isArray(paymentDetails)) {
      paymentDetails.forEach((detail) => {
        const payment = detail?.payment || detail?.Payment || null
        const paymentId =
          payment?.id_Payments ||
          payment?.Id_Payments ||
          detail?.id_Payments ||
          detail?.Id_Payments
        const paymentAmount = parseAmount(
          payment?.amount ?? payment?.Amount ?? detail?.payment_amount ?? detail?.Payment_Amount,
        )
        const paymentDate =
          payment?.payment_date ||
          payment?.Payment_Date ||
          detail?.payment_date ||
          detail?.Payment_Date
        const quotaNumber = Number.parseInt(
          detail?.number_quota ?? detail?.Number_Quota ?? detail?.quotaNumber,
          10,
        )
        const coveredAmount = parseAmount(
          detail?.covered_amount ?? detail?.Covered_Amount ?? detail?.coveredAmount,
        )

        if (Number.isNaN(quotaNumber) || quotaNumber <= 0 || coveredAmount <= 0) {
          return
        }

        if (paymentId) {
          if (!uniquePayments.has(paymentId)) {
            uniquePayments.set(paymentId, {
              amount: paymentAmount,
              date: paymentDate,
              details: [],
            })
          }

          uniquePayments.get(paymentId).details.push({
            quotaNumber,
            coveredAmount,
            paymentDate,
          })
          return
        }

        const current = aggregatedQuotas.get(quotaNumber) || { covered: 0, paymentDates: [] }
        current.covered += coveredAmount
        if (paymentDate) {
          const normalizedDate = new Date(paymentDate)
          if (!Number.isNaN(normalizedDate.getTime())) {
            current.paymentDates.push(normalizedDate)
          }
        }
        aggregatedQuotas.set(quotaNumber, current)
      })

      uniquePayments.forEach((payment) => {
        const detailsForPayment = payment.details
        const totalCovered = detailsForPayment.reduce((sum, d) => sum + parseAmount(d.coveredAmount), 0)
        
        detailsForPayment.forEach((detail) => {
          if (detail.quotaNumber > 0) {
            const current = aggregatedQuotas.get(detail.quotaNumber) || { covered: 0, paymentDates: [] }
            
            let amountToAdd = parseAmount(detail.coveredAmount)
            if (Math.abs(totalCovered - payment.amount) > 0.01 && totalCovered > 0) {
              const proportion = parseAmount(detail.coveredAmount) / totalCovered
              amountToAdd = payment.amount * proportion
            }
            
            current.covered += amountToAdd
            if (payment.date) {
              const normalizedDate = new Date(payment.date)
              if (
                !Number.isNaN(normalizedDate.getTime()) &&
                !current.paymentDates.some((d) => d.getTime() === normalizedDate.getTime())
              ) {
                current.paymentDates.push(normalizedDate)
              }
            }
            aggregatedQuotas.set(detail.quotaNumber, current)
          }
        })
      })
    }

    const overdueQuotas = []
    let totalOverdueAmount = 0

    for (let i = 1; i <= totalQuotas; i++) {
      const coveredInfo = aggregatedQuotas.get(i)
      const coveredAmount = coveredInfo?.covered || 0

      // Calcular fecha de vencimiento
      let dueDate
      if (customQuotas && customQuotas.length > 0) {
        const customQuota = customQuotas.find((q) => q.QuotaNumber === i)
        if (customQuota && customQuota.DueDate) {
          const [year, month, day] = customQuota.DueDate.split('-').map(Number)
          dueDate = new Date(year, month - 1, day)
        } else {
          dueDate = new Date(saleDate)
          const targetMonth = saleDate.getMonth() + i
          const targetDay = saleDate.getDate()
          dueDate.setMonth(targetMonth)
          const maxDayInMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate()
          dueDate.setDate(Math.min(targetDay, maxDayInMonth))
        }
      } else {
        dueDate = new Date(saleDate)
        const targetMonth = saleDate.getMonth() + i
        const targetDay = saleDate.getDate()
        dueDate.setMonth(targetMonth)
        const maxDayInMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate()
        dueDate.setDate(Math.min(targetDay, maxDayInMonth))
      }

      // Determinar valor de la cuota
      let adjustedQuotaValue
      if (customQuotas && customQuotas.length > 0) {
        const customQuota = customQuotas.find((q) => q.QuotaNumber === i)
        adjustedQuotaValue = customQuota ? customQuota.Amount : quotaValue
      } else {
        adjustedQuotaValue = quotaValue
      }

      // Verificar si está en mora
      const isOverdue = dueDate < currentDate && coveredAmount < adjustedQuotaValue

      if (isOverdue) {
        const overdueAmount = adjustedQuotaValue - coveredAmount
        const daysOverdue = Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24))
        
        overdueQuotas.push({
          quotaNumber: i,
          dueDate: dueDate,
          expectedAmount: adjustedQuotaValue,
          coveredAmount: coveredAmount,
          overdueAmount: overdueAmount,
          daysOverdue: daysOverdue
        })
        
        totalOverdueAmount += overdueAmount
      }
    }

    return {
      count: overdueQuotas.length,
      details: overdueQuotas,
      totalOverdue: Math.min(totalOverdueAmount, totalDebt),
    }
  }, [])

  // Función para cargar todos los datos del dashboard
  const loadAllData = useCallback(async () => {
    setDataLoading(true)
    const newErrors = {}

    try {
      // Cargar estadísticas principales calculadas igual que reportes
      try {
        // Obtener clientes activos directamente del endpoint de clientes (igual que el módulo de clientes)
        const [salesResponse, clientsResponse, paymentsResponse] = await Promise.all([
          axiosInstance.get("/api/Sale/GetAllSales"),
          axiosInstance.get("/api/Client/GetClientsWithSalesSummary"),
          axiosInstance.get("/api/Payment/GetAllPayments"),
        ])

        // Contar clientes activos desde el endpoint de clientes (fuente de verdad)
        // Se excluyen solo los explícitamente "inactivo" — igual que el módulo de clientes
        const totalActiveClients = Array.isArray(clientsResponse.data)
          ? clientsResponse.data.filter(c => {
              const s = (c.status || "").toLowerCase()
              return s !== "inactivo" && s !== "inactive"
            }).length
          : 0

        if (salesResponse.status === 200) {
          const activeSales = salesResponse.data.filter(
            sale => sale.status?.toLowerCase() === "active" || sale.status?.toLowerCase() === "activa"
          )

          // Obtener payment details para cada venta
          const detailsPromises = activeSales.map(sale =>
            axiosInstance.get(`/api/Detail/GetDetailsBySaleId/${sale.id_Sales}`)
              .then(response => ({ saleId: sale.id_Sales, details: response.data }))
              .catch(() => ({ saleId: sale.id_Sales, details: [] }))
          )

          const allDetails = await Promise.all(detailsPromises)
          const detailsMap = new Map(allDetails.map(item => [item.saleId, item.details]))

          // Calcular estadísticas de mora (clientes únicos en mora)
          const clientsInMoraSet = new Set()
          let totalOwedAmount = 0

          activeSales.forEach(sale => {
            const clientId = sale.client?.id_Clients || sale.id_Sales

            const salePaymentDetails = detailsMap.get(sale.id_Sales) || []
            const moraInfo = calculateOverdueQuotas(sale, salePaymentDetails)

            if (moraInfo.count > 0) {
              clientsInMoraSet.add(clientId)
              totalOwedAmount += moraInfo.totalOverdue
            }
          })

          const clientsInMora = clientsInMoraSet.size

          console.log("=== DATOS DE MORA CALCULADOS (MISMA LÓGICA QUE REPORTES) ===")
          console.log("Total ventas activas:", activeSales.length)
          console.log("Total clientes activos (desde API clientes):", totalActiveClients)
          console.log("Clientes en mora:", clientsInMora)
          console.log("Total adeudado (mora):", totalOwedAmount)
          console.log("============================================================")

          const allPayments = Array.isArray(paymentsResponse?.data) ? paymentsResponse.data : []
          setPayments(allPayments)

          const revenueSummary = calculateProjectRevenueFromPayments(allPayments)
          console.log("=== PAYMENTS REVENUE SUMMARY ===")
          console.log("Luxury Malibu acumulado:", revenueSummary.luxuryMonthly)
          console.log("Reservas del Poblado acumulado:", revenueSummary.reservasMonthly)
          console.log("Malibu acumulado:", revenueSummary.malibuMonthly)
          console.log("Total acumulado proyectos:", revenueSummary.totalCurrentMonthProjectRevenue)
          console.log("=================================")

          // Obtener desistimientos del mes actual usando la fecha real del desistimiento
          let withdrawalsThisMonth = 0
          try {
            const withdrawalsResponse = await axiosInstance.get("/api/Withdrawal/GetAllWithdrawals")
            const currentMonth = new Date().getMonth()
            const currentYear = new Date().getFullYear()

            withdrawalsThisMonth = Array.isArray(withdrawalsResponse.data)
              ? withdrawalsResponse.data.filter((withdrawal) => {
                  if (!withdrawal?.withdrawal_date) return false
                  const withdrawalDate = new Date(withdrawal.withdrawal_date)
                  return (
                    withdrawalDate.getMonth() === currentMonth &&
                    withdrawalDate.getFullYear() === currentYear
                  )
                }).length
              : 0
          } catch (withdrawalError) {
            console.error("Error fetching withdrawals for dashboard stats:", withdrawalError)
            newErrors.withdrawals = `Error al cargar desistimientos del mes: ${withdrawalError.message || "Error desconocido"}`
          }

          setStats((prevStats) => ({
            ...prevStats,
            activeClients: totalActiveClients,
            overdueClients: clientsInMora,
            totalOwed: totalOwedAmount,
            cancellations: withdrawalsThisMonth,
            luxuryMonthly: revenueSummary.luxuryMonthly,
            reservasMonthly: revenueSummary.reservasMonthly,
            malibuMonthly: revenueSummary.malibuMonthly,
            totalCurrentMonthProjectRevenue: revenueSummary.totalCurrentMonthProjectRevenue,
          }))

          // Cargar recaudos históricos por proyecto usando los pagos reales del año actual
          const annualRevenue = calculateAnnualProjectRevenueFromPayments(allPayments)

          console.log("=== HISTORICAL PROJECT REVENUE FROM PAYMENTS ===")
          console.log("Rows:", annualRevenue.rows)
          console.log("Totals:", annualRevenue.totalsRow)
          console.log("===============================================")

          setHistoricalProjectColumns(annualRevenue.columns)
          setHistoricalProjectRevenue(annualRevenue.rows)
          setHistoricalProjectTotals(annualRevenue.totalsRow)
        }
      } catch (error) {
        console.error("Error fetching main stats:", error)
        newErrors.mainStats = `Error al cargar estadísticas principales: ${error.message || "Error desconocido"}`
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
  }, [formatRelativeTime, calculateOverdueQuotas])

  // Efecto para cargar datos iniciales
  useEffect(() => {
    loadAllData()

    // Configurar intervalo para actualizar datos cada 60 segundos
    const intervalId = setInterval(() => {
      loadAllData()
    }, 60000)

    // Limpiar intervalo al desmontar
    return () => clearInterval(intervalId)
  }, [loadAllData])

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
              <div className="mb-8">
                {/* Header content - simplified */}
              </div>

              <Tabs defaultValue="overview" className="mb-6" onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="overview" className="text-sm">
                    Resumen Financiero
                  </TabsTrigger>
                </TabsList>

                {/* Contenido de la pestaña Resumen */}
                <TabsContent value="overview" className="space-y-8">
                  {/* Sección 1: KPIs Principales */}
                  <div>
                    <div className="mb-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-pink-500 to-rose-600 rounded-full"></div>
                        Indicadores Clave
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Estado actual de clientes y cobros</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard icon={UserCheck} title="Clientes Activos" value={stats.activeClients.toString()} description="Con ventas activas" color="green" />
                      <StatCard icon={UserX} title="Clientes en Mora" value={stats.overdueClients.toString()} description="Con pagos vencidos" color="red" />
                      <StatCard icon={DollarSign} title="Total Adeudado" value={formatCurrency(stats.totalOwed)} description="Monto en mora" color="amber" />
                      <StatCard icon={XCircle} title="Desistimientos" value={stats.cancellations.toString()} description="Canceladas este mes" color="purple" />
                    </div>
                  </div>

                  {/* Sección 2: Recaudos */}
                  <div>
                    <div className="mb-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                        Recaudos
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Dinero recaudado por proyectos</p>
                    </div>
                    <div className="grid grid-cols-1 mb-6">
                      <StatCard icon={CreditCard} title="Recaudado Total (Mes Actual)" value={formatCurrency(stats.totalCurrentMonthProjectRevenue)} description="Suma de todos los proyectos" color="teal" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <StatCard icon={Building2} title="Luxury Malibu" value={formatCurrency(stats.luxuryMonthly)} description="Recaudo mes actual" color="blue" />
                      <StatCard icon={Building2} title="Reservas del Poblado" value={formatCurrency(stats.reservasMonthly)} description="Recaudo mes actual" color="cyan" />
                      <StatCard icon={Building2} title="Malibu" value={formatCurrency(stats.malibuMonthly)} description="Recaudo mes actual" color="green" />
                    </div>
                  </div>

                  {/* Contenido principal y actividades recientes */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <div className="mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <div className="w-1 h-6 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full"></div>
                          Recaudos Históricos
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Seguimiento mensual por proyecto</p>
                      </div>
                      <Card className="shadow-md border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all">
                        <CardHeader>
                          <CardTitle>Proyectos - Año Actual</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <DataTable columns={historicalProjectColumns} data={historicalProjectRevenue} maxRows={12} title="Historial Mensual" footerData={historicalProjectTotals} />
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <div className="w-1 h-6 bg-gradient-to-b from-pink-500 to-rose-600 rounded-full"></div>
                          Actividad Reciente
                        </h2>
                        <Card className="shadow-md border border-gray-200 dark:border-gray-800">
                          <CardContent className="p-0">
                            {recentActivity.length > 0 ? (
                              <div className="divide-y">
                                {recentActivity.map((item, index) => (
                                  <ActivityItem key={index} action={item.action} details={item.details} time={item.time} icon={item.icon} color={item.color} />
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <Calendar className="h-12 w-12 text-gray-300 mb-3" />
                                <p className="font-medium">Sin actividades</p>
                                <p className="text-sm text-gray-400">No hay registros recientes</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      <AlertCard title="Resumen Financiero" icon={Info} color="blue" messages={[`✓ ${stats.activeClients} clientes con ventas activas`, `💰 ${formatCurrency(stats.totalCurrentMonthProjectRevenue)} recaudado`, `⏳ ${formatCurrency(stats.totalOwed)} pendiente de cobro`, `❌ ${stats.cancellations} desistimientos este mes`]} />
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
