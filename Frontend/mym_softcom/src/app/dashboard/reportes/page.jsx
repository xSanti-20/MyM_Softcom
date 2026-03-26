"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import axiosInstance from "@/lib/axiosInstance"
import AlertModal from "@/components/AlertModal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Filter, ChevronDown, ChevronUp, AlertTriangle, Calendar, FileText, Download, Search } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

function ReportesPage() {
  const TitlePage = "Reportes de Mora"
  const [salesData, setSalesData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [projects, setProjects] = useState([])
  const [sellers, setSellers] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState("all")
  const [selectedSellerId, setSelectedSellerId] = useState("all")
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [expectedIncomeStats, setExpectedIncomeStats] = useState([])
  const [actualPaymentsStats, setActualPaymentsStats] = useState([])
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
  })

  const showAlert = (type, message) => {
    setAlertInfo({
      isOpen: true,
      message,
      type,
    })
  }

  const closeAlert = () => {
    setAlertInfo({
      isOpen: false,
      message: "",
      type: "success",
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date)
    } catch (error) {
      return "N/A"
    }
  }

  const normalizeSearchValue = (value) => {
    if (value === null || value === undefined) {
      return ""
    }

    return String(value).toLowerCase().trim()
  }

  const getQuotaValueForSale = (sale) => {
    if (!sale) return 0

    const paymentPlanType = sale.paymentPlanType || sale.PaymentPlanType
    const customQuotasJson = sale.customQuotasJson || sale.CustomQuotasJson

    if (paymentPlanType?.toLowerCase() === "custom" && customQuotasJson) {
      try {
        const customQuotas = JSON.parse(customQuotasJson)
        if (Array.isArray(customQuotas) && customQuotas.length > 0) {
          const amounts = customQuotas.map((q) => q.Amount || 0)
          const sorted = [...amounts].sort((a, b) => a - b)
          return sorted[Math.floor(sorted.length / 2)]
        }
      } catch (error) {
        console.error("Error parsing custom quotas JSON:", error)
      }
    }

    return Number(sale.quota_value) || 0
  }

  const getEffectiveSaleStatus = (sale) => {
    const quotaValue = Number.parseFloat(getQuotaValueForSale(sale)) || 0
    const totalDebt = Number.parseFloat(sale?.total_debt) || 0
    const rawStatus = sale?.status || "Active"

    if (quotaValue <= 0 || totalDebt <= 0) {
      return "Escriturar"
    }

    return rawStatus
  }

  // Calcular cuotas en mora para una venta
  const calculateOverdueQuotas = (sale, paymentDetails) => {
    const totalDebt = Number.parseFloat(sale?.total_debt) || 0

    if (!sale || !sale.plan || totalDebt <= 0) {
      return { count: 0, details: [], totalOverdue: 0 }
    }

    const totalQuotas = sale.plan.number_quotas || 0
    const quotaValue = sale.quota_value || 0
    const saleDate = new Date(sale.sale_date)
    const currentDate = new Date()

    console.log(`[MORA REPORT] Procesando venta ${sale.id_Sales} - Total cuotas: ${totalQuotas}`)
    console.log(`[MORA REPORT] Payment details recibidos:`, paymentDetails?.length || 0)

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
      console.log(`[MORA REPORT] Venta ${sale.id_Sales} - Detalles:`, paymentDetails.map(d => ({
        quota: d.number_quota,
        covered: d.covered_amount,
        hasPayment: !!d.payment
      })))

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

    console.log(`[MORA REPORT] Venta ${sale.id_Sales} - Cuotas en mora: ${overdueQuotas.length}`)
    console.log(`[MORA REPORT] Cuotas cubiertas:`, Array.from(aggregatedQuotas.entries()).map(([quota, info]) => ({
      quota,
      covered: info.covered
    })))

    return {
      count: overdueQuotas.length,
      details: overdueQuotas,
      totalOverdue: Math.min(totalOverdueAmount, totalDebt),
    }
  }

  // Sumar valor de cuotas que vencen en el mes actual, agrupado por proyecto
  const calculateExpectedMonthlyIncome = (allSales, projects) => {
    // Inicializar estadísticas para todos los proyectos
    const incomeByProject = {}
    projects.forEach((project) => {
      incomeByProject[project.id_Projects] = {
        projectId: project.id_Projects,
        projectName: project.name,
        expectedAmount: 0,
        clientsCount: 0,
      }
    })

    // Sumar 1 valor de cuota por cada venta/lote, agrupado por proyecto
    allSales.forEach((sale) => {
      if (!sale) {
        return
      }

      const projectId =
        sale.lot?.project?.id_Projects ||
        sale.lot?.Project?.id_Projects ||
        sale.lot?.id_Projects ||
        sale.Lot?.project?.id_Projects ||
        sale.Lot?.Project?.id_Projects ||
        sale.Lot?.id_Projects
      if (!projectId || !incomeByProject[projectId]) {
        return
      }

      const quotaValueForSale = getQuotaValueForSale(sale)

      if (quotaValueForSale > 0) {
        incomeByProject[projectId].expectedAmount += quotaValueForSale
        incomeByProject[projectId].clientsCount += 1
      }
    })

    return Object.values(incomeByProject)
  }

  // Calcular pagos recibidos del mes actual por proyecto (unificado)
  const calculateActualMonthlyPayments = (allPayments, projects) => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    // Inicializar estadísticas para todos los proyectos
    const paymentsByProject = {}
    projects.forEach((project) => {
      paymentsByProject[project.id_Projects] = {
        projectId: project.id_Projects,
        projectName: project.name,
        totalReceived: 0,
        paymentsCount: 0,
      }
    })

    // Filtrar pagos del mes actual
    const currentMonthPayments = allPayments.filter((payment) => {
      if (!payment.payment_date) return false
      const paymentDate = new Date(payment.payment_date)
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear
    })

    // Agrupar pagos por proyecto
    currentMonthPayments.forEach((payment) => {
      const projectId =
        payment.sale?.lot?.project?.id_Projects ||
        payment.sale?.lot?.Project?.id_Projects ||
        payment.sale?.Lot?.project?.id_Projects ||
        payment.sale?.Lot?.Project?.id_Projects

      if (!projectId || !paymentsByProject[projectId]) {
        return
      }

      const amount = payment.amount || 0
      paymentsByProject[projectId].totalReceived += amount
      paymentsByProject[projectId].paymentsCount += 1
    })

    return Object.values(paymentsByProject)
  }

  // Cargar proyectos
  const fetchProjects = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/api/Project/GetAllProjects")
      if (response.data && Array.isArray(response.data)) {
        const allProjects = response.data.map((project) => ({
          id_Projects: project.id_Projects,
          name: project.name,
        }))
        setProjects(allProjects)
      }
    } catch (error) {
      console.error("Error al cargar proyectos:", error)
      showAlert("error", "No se pudieron cargar los proyectos.")
    }
  }, [])

  // Cargar vendedores
  const fetchSellers = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/api/User/ConsultAllUser")
      if (response.data && Array.isArray(response.data)) {
        const allSellers = response.data.map((user) => ({
          id_Users: user.id_Users,
          nom_Users: user.nom_Users,
        }))
        setSellers(allSellers)
      }
    } catch (error) {
      console.error("Error al cargar vendedores:", error)
      showAlert("error", "No se pudieron cargar los vendedores.")
    }
  }, [])

  // Cargar ventas y calcular mora
  const fetchSalesWithOverdue = useCallback(async () => {
    try {
      setIsLoading(true)
      const salesResponse = await axiosInstance.get("/api/Sale/GetAllSales")

      if (salesResponse.status === 200) {
        let filteredSales = salesResponse.data.filter(
          sale => {
            const effectiveStatus = getEffectiveSaleStatus(sale).toLowerCase()
            return effectiveStatus === "active" || effectiveStatus === "activa"
          }
        )

        // Calcular ingresos esperados del mes con todas las ventas activas
        const expectedIncome = calculateExpectedMonthlyIncome(salesResponse.data, projects)
        setExpectedIncomeStats(expectedIncome)

        // Obtener payment details para cada venta
        const detailsPromises = filteredSales.map(sale =>
          axiosInstance.get(`/api/Detail/GetDetailsBySaleId/${sale.id_Sales}`)
            .then(response => ({ saleId: sale.id_Sales, details: response.data }))
            .catch(() => ({ saleId: sale.id_Sales, details: [] }))
        )

        const allDetails = await Promise.all(detailsPromises)
        const detailsMap = new Map(allDetails.map(item => [item.saleId, item.details]))

        // Procesar cada venta para calcular mora
        const salesWithMora = filteredSales.map(sale => {
          // Obtener payment details para esta venta
          const salePaymentDetails = detailsMap.get(sale.id_Sales) || []

          const moraInfo = calculateOverdueQuotas(sale, salePaymentDetails)

          return {
            id: sale.id_Sales,
            clientName: sale.client ? `${sale.client.names} ${sale.client.surnames}` : "N/A",
            clientDocument: sale.client?.document || "N/A",
            totalValue: sale.total_value || 0,
            totalDebt: sale.total_debt || 0,
            overdueQuotasCount: moraInfo.count,
            overdueQuotasDetails: moraInfo.details,
            totalOverdue: moraInfo.totalOverdue,
            projectName:
              sale.lot?.project?.name ||
              sale.lot?.Project?.name ||
              sale.Lot?.project?.name ||
              sale.Lot?.Project?.name ||
              "Sin proyecto",
            projectId:
              sale.lot?.project?.id_Projects ||
              sale.lot?.Project?.id_Projects ||
              sale.lot?.id_Projects ||
              sale.Lot?.project?.id_Projects ||
              sale.Lot?.Project?.id_Projects ||
              sale.Lot?.id_Projects,
            sellerName: sale.user?.nom_Users || "N/A",
            sellerId: sale.user?.id_Users,
            saleDate: sale.sale_date,
            block: sale.lot?.block || "N/A",
            lotNumber: sale.lot?.lot_number || "N/A",
            original: sale
          }
        })

        // Filtrar solo ventas con mora
        const salesInMora = salesWithMora.filter(sale => sale.overdueQuotasCount > 0)

        setSalesData(salesInMora)
      }
    } catch (error) {
      console.error("Error al cargar datos:", error)
      setError("No se pudieron cargar los datos de mora.")
      showAlert("error", "No se pudieron cargar los datos de mora.")
    } finally {
      setIsLoading(false)
    }
  }, [projects])

  // Cargar pagos para calcular estadísticas de pagos recibidos
  const fetchPayments = useCallback(async () => {
    try {
      const paymentsResponse = await axiosInstance.get("/api/Payment/GetAllPayments")
      if (paymentsResponse.status === 200) {
        const actualPayments = calculateActualMonthlyPayments(paymentsResponse.data, projects)
        setActualPaymentsStats(actualPayments)
      }
    } catch (error) {
      console.error("Error al cargar pagos:", error)
      showAlert("error", "No se pudieron cargar los datos de pagos.")
    }
  }, [projects])

  useEffect(() => {
    const loadData = async () => {
      await fetchProjects()
      await fetchSellers()
    }
    loadData()
  }, [fetchProjects, fetchSellers])

  useEffect(() => {
    if (projects.length > 0) {
      fetchSalesWithOverdue()
      fetchPayments()
    }
  }, [projects, fetchSalesWithOverdue, fetchPayments])

  // Filtrar datos según los filtros seleccionados
  const getFilteredSales = () => {
    let filtered = [...salesData]

    // Filtrar por proyecto
    if (selectedProjectId && selectedProjectId !== "all") {
      const targetProjectId = Number.parseInt(selectedProjectId, 10)
      filtered = filtered.filter(sale => sale.projectId === targetProjectId)
    }

    // Filtrar por vendedor
    if (selectedSellerId && selectedSellerId !== "all") {
      const targetSellerId = Number.parseInt(selectedSellerId, 10)
      filtered = filtered.filter(sale => sale.sellerId === targetSellerId)
    }

    // Filtrar por término de búsqueda
    if (searchTerm && searchTerm.trim() !== "") {
      const term = normalizeSearchValue(searchTerm)
      filtered = filtered.filter((sale) =>
        [
          sale.clientName,
          sale.clientDocument,
          sale.projectName,
          sale.sellerName,
          sale.block,
          sale.lotNumber,
        ].some((value) => normalizeSearchValue(value).includes(term))
      )
    }

    // Ordenar por manzana y lote
    filtered.sort((a, b) => {
      // Obtener manzanas
      const blockA = a.block || ""
      const blockB = b.block || ""

      // Verificar si son números o letras
      const isNumberA = /^\d+$/.test(blockA)
      const isNumberB = /^\d+$/.test(blockB)

      // Las letras van antes que los números
      if (!isNumberA && isNumberB) return -1
      if (isNumberA && !isNumberB) return 1

      // Si ambos son números, comparar numéricamente
      if (isNumberA && isNumberB) {
        const numA = parseInt(blockA)
        const numB = parseInt(blockB)
        if (numA !== numB) return numA - numB
      } else {
        // Si ambos son letras, comparar alfabéticamente
        const blockComparison = blockA.localeCompare(blockB)
        if (blockComparison !== 0) return blockComparison
      }

      // Si las manzanas son iguales, ordenar por número de lote
      const lotNumA = parseInt(a.lotNumber) || 0
      const lotNumB = parseInt(b.lotNumber) || 0
      return lotNumA - lotNumB
    })

    return filtered
  }

  const filteredSales = getFilteredSales()

  // Toggle expandir fila
  const toggleRow = (saleId) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(saleId)) {
      newExpanded.delete(saleId)
    } else {
      newExpanded.add(saleId)
    }
    setExpandedRows(newExpanded)
  }

  // Calcular estadísticas según los filtros aplicados
  const calculateGeneralStats = () => {
    const uniqueClientIds = new Set(filteredSales.map(sale => sale.clientDocument))
    const totalClients = uniqueClientIds.size
    const totalOverdueQuotas = filteredSales.reduce((sum, sale) => sum + sale.overdueQuotasCount, 0)
    const totalOverdueAmount = filteredSales.reduce((sum, sale) => sum + sale.totalOverdue, 0)
    const totalDebt = filteredSales.reduce((sum, sale) => sum + sale.totalDebt, 0)

    return { totalClients, totalOverdueQuotas, totalOverdueAmount, totalDebt }
  }

  const generalStats = calculateGeneralStats()

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = ["Cliente", "Cédula", "Valor Total Lote", "Deuda Total", "Cuotas en Mora", "Monto en Mora", "Proyecto", "Vendedor", "Manzana", "Lote"]

    const csvData = filteredSales.map(sale => [
      sale.clientName,
      sale.clientDocument,
      sale.totalValue,
      sale.totalDebt,
      sale.overdueQuotasCount,
      sale.totalOverdue,
      sale.projectName,
      sale.sellerName,
      sale.block,
      sale.lotNumber
    ])

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `reporte_mora_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <PrivateNav>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                {TitlePage}
              </h1>
              <p className="text-gray-600 mt-2">Reporte de clientes con cuotas en mora</p>
            </div>
            <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Panel de Ingresos Esperados vs Recibidos del Mes por Proyecto */}
        {(expectedIncomeStats.length > 0 || actualPaymentsStats.length > 0) && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Ingresos del Mes Actual por Proyecto</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const expected = expectedIncomeStats.find(s => s.projectId === project.id_Projects)
                const actual = actualPaymentsStats.find(s => s.projectId === project.id_Projects)
                const expectedAmount = expected?.expectedAmount || 0
                const actualAmount = actual?.totalReceived || 0
                const difference = actualAmount - expectedAmount
                const percentage = expectedAmount > 0 ? (actualAmount / expectedAmount) * 100 : 0

                // Solo mostrar proyectos con datos
                if (expectedAmount === 0 && actualAmount === 0) return null

                return (
                  <Card key={project.id_Projects}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <CardDescription>Comparación del mes</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Esperado:</span>
                        <span className="text-sm font-semibold text-purple-700">
                          {formatCurrency(expectedAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Recibido:</span>
                        <span className="text-sm font-semibold text-emerald-700">
                          {formatCurrency(actualAmount)}
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Diferencia:</span>
                          <span className={`text-sm font-bold ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                          </span>
                        </div>
                        <div className="mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${percentage >= 100 ? 'bg-green-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 text-right">
                            {percentage.toFixed(0)}% recaudado
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Estadísticas de Mora*/}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Clientes en Mora</CardDescription>
              <CardTitle className="text-3xl">{generalStats.totalClients}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Cuotas Vencidas</CardDescription>
              <CardTitle className="text-3xl text-red-600">{generalStats.totalOverdueQuotas}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Monto Total en Mora</CardDescription>
              <CardTitle className="text-2xl text-red-600">{formatCurrency(generalStats.totalOverdueAmount)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Deuda Total</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(generalStats.totalDebt)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filtro Proyecto */}
              <div>
                <Label htmlFor="project-filter">Proyecto</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger id="project-filter">
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los proyectos</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id_Projects} value={String(project.id_Projects)}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Vendedor */}
              <div>
                <Label htmlFor="seller-filter">Vendedor</Label>
                <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                  <SelectTrigger id="seller-filter">
                    <SelectValue placeholder="Seleccionar vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los vendedores</SelectItem>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id_Users} value={String(seller.id_Users)}>
                        {seller.nom_Users}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de datos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Clientes en Mora ({generalStats.totalClients})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Barra de búsqueda */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por cliente, cédula, proyecto, vendedor, manzana o lote..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Cargando datos...</p>
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'No se encontraron clientes con cuotas en mora'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Manzana</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Proyecto</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Deuda Total</TableHead>
                      <TableHead className="text-center">Cuotas en Mora</TableHead>
                      <TableHead className="text-right">Monto en Mora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <Fragment key={sale.id}>
                        <TableRow className="hover:bg-gray-50">
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(sale.id)}
                              className="p-0 h-8 w-8"
                            >
                              {expandedRows.has(sale.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{sale.clientName}</TableCell>
                          <TableCell>{sale.clientDocument}</TableCell>
                          <TableCell>{sale.block}</TableCell>
                          <TableCell>{sale.lotNumber}</TableCell>
                          <TableCell>{sale.projectName}</TableCell>
                          <TableCell>{sale.sellerName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(sale.totalValue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(sale.totalDebt)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive" className="font-semibold">
                              {sale.overdueQuotasCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            {formatCurrency(sale.totalOverdue)}
                          </TableCell>
                        </TableRow>

                        {/* Fila expandible con detalles de cuotas */}
                        {expandedRows.has(sale.id) && (
                          <TableRow>
                            <TableCell colSpan={11} className="bg-gray-50 p-0">
                              <div className="p-4">
                                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  Detalle de Cuotas en Mora
                                </h4>
                                <div className="bg-white rounded-lg border">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>N° Cuota</TableHead>
                                        <TableHead>Fecha Vencimiento</TableHead>
                                        <TableHead className="text-right">Valor Cuota</TableHead>
                                        <TableHead className="text-right">Pagado</TableHead>
                                        <TableHead className="text-right">Saldo Pendiente</TableHead>
                                        <TableHead className="text-center">Días Atraso</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {sale.overdueQuotasDetails.map((quota) => (
                                        <TableRow key={quota.quotaNumber}>
                                          <TableCell className="font-medium">#{quota.quotaNumber}</TableCell>
                                          <TableCell>{formatDate(quota.dueDate)}</TableCell>
                                          <TableCell className="text-right">{formatCurrency(quota.expectedAmount)}</TableCell>
                                          <TableCell className="text-right">{formatCurrency(quota.coveredAmount)}</TableCell>
                                          <TableCell className="text-right text-red-600 font-semibold">
                                            {formatCurrency(quota.overdueAmount)}
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <Badge variant="destructive">{quota.daysOverdue} días</Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertModal
        isOpen={alertInfo.isOpen}
        onClose={closeAlert}
        title={alertInfo.type === "success" ? "Éxito" : "Error"}
        message={alertInfo.message}
        type={alertInfo.type}
      />
    </PrivateNav>
  )
}

export default ReportesPage
