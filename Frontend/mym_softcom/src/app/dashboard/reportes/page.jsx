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
import { Filter, ChevronDown, ChevronUp, AlertTriangle, Calendar, FileText, Download } from "lucide-react"
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

  // Calcular cuotas en mora para una venta
  const calculateOverdueQuotas = (sale, paymentDetails) => {
    if (!sale || !sale.plan) return { count: 0, details: [], totalOverdue: 0 }

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

    // Agrupar pagos por cuota
    const aggregatedQuotas = new Map()
    const uniquePayments = new Map()

    if (paymentDetails && Array.isArray(paymentDetails)) {
      paymentDetails.forEach((detail) => {
        if (detail.payment?.id_Payments) {
          const paymentId = detail.payment.id_Payments
          if (!uniquePayments.has(paymentId)) {
            uniquePayments.set(paymentId, {
              amount: detail.payment.amount || 0,
              date: detail.payment.payment_date,
              details: []
            })
          }
          uniquePayments.get(paymentId).details.push(detail)
        }
      })

      uniquePayments.forEach((payment) => {
        const detailsForPayment = payment.details
        const totalCovered = detailsForPayment.reduce((sum, d) => sum + (d.covered_amount || 0), 0)
        
        detailsForPayment.forEach((detail) => {
          if (detail.number_quota > 0) {
            const current = aggregatedQuotas.get(detail.number_quota) || { covered: 0, paymentDates: [] }
            
            let amountToAdd = detail.covered_amount || 0
            if (Math.abs(totalCovered - payment.amount) > 0.01 && totalCovered > 0) {
              const proportion = (detail.covered_amount || 0) / totalCovered
              amountToAdd = payment.amount * proportion
            }
            
            current.covered += amountToAdd
            if (payment.date && !current.paymentDates.some(d => d.getTime() === new Date(payment.date).getTime())) {
              current.paymentDates.push(new Date(payment.date))
            }
            aggregatedQuotas.set(detail.number_quota, current)
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
      totalOverdue: totalOverdueAmount
    }
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
      const [salesResponse, paymentsResponse] = await Promise.all([
        axiosInstance.get("/api/Sale/GetAllSales"),
        axiosInstance.get("/api/Payment/GetAllPayments")
      ])

      if (salesResponse.status === 200) {
        let filteredSales = salesResponse.data.filter(
          sale => sale.status?.toLowerCase() === "active" || sale.status?.toLowerCase() === "activa"
        )

        // Obtener todos los payment details
        const allPaymentDetails = paymentsResponse.data || []

        // Procesar cada venta para calcular mora
        const salesWithMora = filteredSales.map(sale => {
          // Filtrar payment details para esta venta
          const salePaymentDetails = allPaymentDetails.filter(
            pd => pd.id_Sales === sale.id_Sales
          )

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
            projectName: sale.lot?.project?.name || sale.lot?.Project?.name || "Sin proyecto",
            projectId: sale.lot?.project?.id_Projects || sale.lot?.Project?.id_Projects,
            sellerName: sale.user?.nom_Users || "N/A",
            sellerId: sale.user?.id_Users,
            saleDate: sale.sale_date,
            lotInfo: sale.lot ? `${sale.lot.block}-${sale.lot.lot_number}` : "N/A",
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
  }, [])

  useEffect(() => {
    const loadData = async () => {
      await fetchProjects()
      await fetchSellers()
      await fetchSalesWithOverdue()
    }
    loadData()
  }, [fetchProjects, fetchSellers, fetchSalesWithOverdue])

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

  // Calcular estadísticas
  const calculateStats = () => {
    const totalClients = filteredSales.length
    const totalOverdueQuotas = filteredSales.reduce((sum, sale) => sum + sale.overdueQuotasCount, 0)
    const totalOverdueAmount = filteredSales.reduce((sum, sale) => sum + sale.totalOverdue, 0)
    const totalDebt = filteredSales.reduce((sum, sale) => sum + sale.totalDebt, 0)

    return { totalClients, totalOverdueQuotas, totalOverdueAmount, totalDebt }
  }

  const stats = calculateStats()

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = ["Cliente", "Cédula", "Valor Total Lote", "Deuda Total", "Cuotas en Mora", "Monto en Mora", "Proyecto", "Vendedor", "Lote"]
    
    const csvData = filteredSales.map(sale => [
      sale.clientName,
      sale.clientDocument,
      sale.totalValue,
      sale.totalDebt,
      sale.overdueQuotasCount,
      sale.totalOverdue,
      sale.projectName,
      sale.sellerName,
      sale.lotInfo
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

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Clientes en Mora</CardDescription>
              <CardTitle className="text-3xl">{stats.totalClients}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Cuotas Vencidas</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.totalOverdueQuotas}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Monto Total en Mora</CardDescription>
              <CardTitle className="text-2xl text-red-600">{formatCurrency(stats.totalOverdueAmount)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Deuda Total</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(stats.totalDebt)}</CardTitle>
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
              Clientes en Mora ({filteredSales.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Cargando datos...</p>
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No se encontraron clientes con cuotas en mora</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Cédula</TableHead>
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
                          <TableCell>{sale.lotInfo}</TableCell>
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
                            <TableCell colSpan={10} className="bg-gray-50 p-0">
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
