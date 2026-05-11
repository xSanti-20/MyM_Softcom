"use client"

import { useState } from "react"
import { Search, User, AlertCircle, Loader2, CreditCard, Building2, RefreshCw, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import NavPrivada from "@/components/nav/PrivateNav"
import axiosInstance from "@/lib/axiosInstance"
import MonthlyQuotaTracker from "@/components/utils/MonthlyQuotaTracker"
import QuotaRedistributionButton from "@/components/utils/QuotaRedistributionButton"
import salesPdfService from "@/services/pdfExportService"

// Componente para mostrar información del cliente
const ClientInfo = ({ client, sale }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "activo":
        return "bg-emerald-100 text-emerald-800 border border-emerald-300"
      case "escriturar":
        return "bg-blue-100 text-blue-800 border border-blue-300"
      case "desistida":
        return "bg-red-100 text-red-800 border border-red-300"
      default:
        return "bg-gray-100 text-gray-800 border border-gray-300"
    }
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
        <CardTitle className="flex items-center gap-3 text-gray-800">
          <User className="h-5 w-5 text-slate-600" />
          <span className="text-xl font-semibold">Información del Cliente</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-l-4 border-slate-300 pl-4">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Completo</Label>
            <p className="text-base font-semibold text-gray-900 mt-1">
              {client.names} {client.surnames}
            </p>
          </div>
          <div className="border-l-4 border-slate-300 pl-4">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</Label>
            <p className="text-base font-semibold text-gray-900 mt-1">{client.document}</p>
          </div>
          <div className="border-l-4 border-slate-300 pl-4">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</Label>
            <p className="text-base text-gray-700 mt-1">{client.phone || "No registrado"}</p>
          </div>
          <div className="border-l-4 border-slate-300 pl-4">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</Label>
            <p className="text-base text-gray-700 mt-1 break-all">{client.email || "No registrado"}</p>
          </div>
        </div>

        <Separator className="bg-gray-200" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-l-4 border-indigo-400 pl-4">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Proyecto</Label>
            <p className="text-base font-semibold text-gray-900 mt-1 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              {sale.lot?.project?.name || "No disponible"}
            </p>
          </div>
          <div className="border-l-4 border-indigo-400 pl-4">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</Label>
            <p className="text-base font-semibold text-gray-900 mt-1">
              {sale.lot?.block}-{sale.lot?.lot_number || "No disponible"}
            </p>
          </div>
          <div className="border-l-4 border-indigo-400 pl-4">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estado de Venta</Label>
            <Badge className={`mt-1 font-semibold ${getStatusColor(sale.status)}`}>{sale.status || "No disponible"}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente para mostrar resumen financiero
const FinancialSummary = ({ sale }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount || 0)
  }

  // Calcular el valor de cuota correcto según el tipo de plan
  const calculateDisplayQuotaValue = () => {
    const paymentPlanType = sale.paymentPlanType || sale.PaymentPlanType
    
    console.log('Detalles - calculateDisplayQuotaValue:', {
      saleId: sale.id_Sales,
      paymentPlanType: paymentPlanType,
      hasCustomQuotas: !!(sale.customQuotasJson || sale.CustomQuotasJson),
      quota_value: sale.quota_value,
      customQuotasJsonRaw: sale.customQuotasJson
    })
    
    // Para planes personalizados, calcular promedio de las cuotas
    if (paymentPlanType?.toLowerCase() === "custom" && (sale.customQuotasJson || sale.CustomQuotasJson)) {
      try {
        const customQuotasJson = sale.customQuotasJson || sale.CustomQuotasJson
        console.log('Detalles - customQuotasJson string:', customQuotasJson)
        const customQuotas = JSON.parse(customQuotasJson)
        console.log('Detalles - parsed customQuotas:', customQuotas)
        
        if (customQuotas && customQuotas.length > 0) {
          const amounts = customQuotas.map(q => q.Amount || 0)
          console.log('Detalles - individual amounts:', amounts)
          
          // Opción 1: Mostrar el valor más común (mediana o moda)
          const sortedAmounts = [...amounts].sort((a, b) => a - b)
          const medianQuota = sortedAmounts[Math.floor(sortedAmounts.length / 2)]
          
          // Opción 2: Promedio (valor actual)
          const totalCustomAmount = customQuotas.reduce((sum, quota) => sum + (quota.Amount || 0), 0)
          const averageQuota = totalCustomAmount / customQuotas.length
          
          console.log('Detalles - median:', medianQuota, 'average:', averageQuota)
          
          // Cambiar esta línea para usar mediana en lugar de promedio
          return medianQuota  // Mostrará $1,000,000 en lugar de $1,194,444
          // return averageQuota  // Mostrará $1,194,444 (promedio real)
        }
      } catch (error) {
        console.error("Error parsing custom quotas for financial summary:", error)
      }
    }
    
    // Para planes automáticos y de casa, usar el valor del backend
    console.log('Detalles - Using standard quota_value:', sale.quota_value)
    return sale.quota_value
  }

  const displayQuotaValue = calculateDisplayQuotaValue()
  const progressPercentage = sale.total_value > 0 ? (sale.total_raised / sale.total_value) * 100 : 0

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
        <CardTitle className="flex items-center gap-3 text-gray-800">
          <CreditCard className="h-5 w-5 text-slate-600" />
          <span className="text-xl font-semibold">Resumen Financiero</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative p-5 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
            <Label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Valor Total</Label>
            <p className="text-2xl font-bold text-blue-900 mt-2">{formatCurrency(sale.total_value)}</p>
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-blue-100 rounded-full opacity-10"></div>
          </div>
          <div className="relative p-5 bg-emerald-50 rounded-lg border border-emerald-200 hover:shadow-md transition-shadow">
            <Label className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Pagado</Label>
            <p className="text-2xl font-bold text-emerald-900 mt-2">{formatCurrency(sale.total_raised)}</p>
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-emerald-100 rounded-full opacity-10"></div>
          </div>
          <div className="relative p-5 bg-amber-50 rounded-lg border border-amber-200 hover:shadow-md transition-shadow">
            <Label className="text-xs font-bold text-amber-700 uppercase tracking-wider">Saldo Pendiente</Label>
            <p className="text-2xl font-bold text-amber-900 mt-2">{formatCurrency(sale.total_debt)}</p>
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-amber-100 rounded-full opacity-10"></div>
          </div>
          <div className="relative p-5 bg-indigo-50 rounded-lg border border-indigo-200 hover:shadow-md transition-shadow">
            <Label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Valor Cuota</Label>
            <p className="text-2xl font-bold text-indigo-900 mt-2">{formatCurrency(displayQuotaValue)}</p>
            {sale.paymentPlanType?.toLowerCase() === "custom" && (
              <p className="text-xs text-indigo-600 mt-1 font-medium">Cuota típica</p>
            )}
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-indigo-100 rounded-full opacity-10"></div>
          </div>
        </div>

        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">Progreso de Pago</span>
            <span className="text-lg font-bold text-gray-900">{progressPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-500 via-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-600 pt-1">
            <span>Monto cubierto: {formatCurrency(sale.total_raised)}</span>
            <span>Pendiente: {formatCurrency(sale.total_debt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DetailsPage() {
  const [searchDocument, setSearchDocument] = useState("")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [clientData, setClientData] = useState(null)
  const [clientSales, setClientSales] = useState([])
  const [selectedSaleId, setSelectedSaleId] = useState("")
  const [saleData, setSaleData] = useState(null)
  const [detailsData, setDetailsData] = useState([])
  const [error, setError] = useState("")

  // Función para obtener el nombre del proyecto (igual que en pagos)
  const getProjectName = (sale) => {
    if (sale?.lot?.project?.name) return sale.lot.project.name
    if (sale?.lot?.Project?.name) return sale.lot.Project.name
    if (sale?.Lot?.project?.name) return sale.Lot.project.name
    if (sale?.Lot?.Project?.name) return sale.Lot.Project.name
    if (sale?.lot?.project_name) return sale.lot.project_name
    const projectId = sale?.lot?.id_Projects || sale?.lot?.project?.id_Projects
    if (projectId) return `Proyecto #${projectId}`
    return "Sin proyecto"
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount || 0)
  }

  const handleSearch = async () => {
    if (!searchDocument.trim()) {
      setError("Por favor ingresa un número de documento")
      return
    }

    const parsedDocument = Number.parseInt(searchDocument.trim(), 10)
    if (isNaN(parsedDocument)) {
      setError("El documento debe ser un número válido")
      return
    }

    setLoading(true)
    setError("")
    setClientData(null)
    setClientSales([])
    setSelectedSaleId("")
    setSaleData(null)
    setDetailsData([])

    try {
      const clientResponse = await axiosInstance.get(`/api/Client/GetByDocument/${parsedDocument}`)

      if (clientResponse.status === 200 && clientResponse.data) {
        const client = clientResponse.data
        setClientData(client)

        const salesResponse = await axiosInstance.get("/api/Sale/GetAllSales")
        const sales = salesResponse.data
        const clientSalesData = sales.filter((s) => s.id_Clients === client.id_Clients)

        if (clientSalesData.length === 0) {
          setError("El cliente no tiene ventas registradas")
          return
        }

        setClientSales(clientSalesData)

        // Si solo tiene una venta, seleccionarla automáticamente
        if (clientSalesData.length === 1) {
          const singleSale = clientSalesData[0]
          setSelectedSaleId(singleSale.id_Sales.toString())
          await loadSaleDetails(singleSale)
        }
      } else {
        setError("Cliente no encontrado con ese documento")
      }
    } catch (error) {
      console.error("Error al buscar datos:", error)
      if (error.response?.status === 404) {
        setError("Cliente no encontrado con ese documento")
      } else {
        setError("Error al buscar la información. Por favor intenta nuevamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  const loadSaleDetails = async (sale) => {
    try {
      setSaleData(sale)

      // Obtener detalles de pagos para la venta seleccionada
      const detailsResponse = await axiosInstance.get(`/api/Detail/GetDetailsBySaleId/${sale.id_Sales}`)
      setDetailsData(detailsResponse.data)
    } catch (error) {
      console.error("Error al cargar detalles de la venta:", error)
      setError("Error al cargar los detalles de la venta seleccionada")
    }
  }

  const handleSaleSelection = async (saleId) => {
    setSelectedSaleId(saleId)
    const selectedSale = clientSales.find((s) => s.id_Sales.toString() === saleId)
    if (selectedSale) {
      await loadSaleDetails(selectedSale)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleRedistributionComplete = async () => {
    if (saleData) {
      await loadSaleDetails(saleData)
    }
  }

  const refreshData = async () => {
    if (!saleData) return

    setRefreshing(true)
    try {
      // Refresh sale data
      const salesResponse = await axiosInstance.get("/api/Sale/GetAllSales")
      const sales = salesResponse.data
      const updatedSale = sales.find((s) => s.id_Sales === saleData.id_Sales)

      if (updatedSale) {
        setSaleData(updatedSale)

        // Update client sales list
        const clientSalesData = sales.filter((s) => s.id_Clients === clientData.id_Clients)
        setClientSales(clientSalesData)
      }

      // Refresh payment details
      const detailsResponse = await axiosInstance.get(`/api/Detail/GetDetailsBySaleId/${saleData.id_Sales}`)
      setDetailsData(detailsResponse.data)
    } catch (error) {
      console.error("Error al actualizar datos:", error)
      setError("Error al actualizar la información. Por favor intenta nuevamente.")
    } finally {
      setRefreshing(false)
    }
  }

  const handleGenerateReportPDF = async () => {
    if (!clientData || !saleData) {
      setError("Información incompleta para generar el reporte")
      return
    }

    setGeneratingPDF(true)
    try {
      await salesPdfService.generateSaleReportPDF(clientData, saleData, detailsData)
      console.log("PDF generado exitosamente")
    } catch (error) {
      console.error("Error al generar el PDF:", error)
      setError("Error al generar el reporte PDF. Por favor intenta nuevamente.")
    } finally {
      setGeneratingPDF(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-col flex-1">
        <NavPrivada>
          <div className="py-6 px-4 md:px-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8 pb-6 border-b-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                      Consulta de Detalles de Pago
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">
                      Ingresa documento para consultar estado de cuotas y pagos
                    </p>
                  </div>
                  {saleData && (
                    <div className="flex gap-3">
                      <Button
                        onClick={handleGenerateReportPDF}
                        disabled={generatingPDF}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        <FileText className={`h-4 w-4 ${generatingPDF ? "animate-spin" : ""}`} />
                        {generatingPDF ? "Generando..." : "Descargar Reporte PDF"}
                      </Button>
                      <Button
                        onClick={refreshData}
                        disabled={refreshing}
                        className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        {refreshing ? "Actualizando..." : "Actualizar Información"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Formulario de búsqueda */}
              <Card className="mb-6 border-gray-200 shadow-md">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
                  <CardTitle className="flex items-center gap-3 text-gray-800">
                    <Search className="h-5 w-5 text-slate-600" />
                    <span className="text-xl font-semibold">Buscar Cliente</span>
                  </CardTitle>
                  <CardDescription className="text-gray-600 font-medium mt-2">
                    Ingresa el número de documento para consultar sus detalles de pago
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label htmlFor="document" className="text-sm font-semibold text-gray-700 mb-2 block">Número de Documento</Label>
                      <Input
                        id="document"
                        type="number"
                        placeholder="Ej: 12345678"
                        value={searchDocument}
                        onChange={(e) => setSearchDocument(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                        className="border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <Button 
                      onClick={handleSearch} 
                      disabled={loading} 
                      className="px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Buscando...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Buscar
                        </>
                      )}
                    </Button>
                  </div>

                  {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-300 rounded-lg flex items-start gap-3 shadow-sm">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <span className="text-red-800 text-sm font-medium">{error}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Selector de ventas/lotes */}
              {clientData && clientSales.length > 1 && (
                <Card className="mb-6 border-gray-200 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
                    <CardTitle className="flex items-center gap-3 text-gray-800">
                      <Building2 className="h-5 w-5 text-slate-600" />
                      <span className="text-xl font-semibold">Seleccionar Venta/Lote</span>
                    </CardTitle>
                    <CardDescription className="text-gray-600 font-medium mt-2">
                      Este cliente tiene {clientSales.length} ventas registradas. Selecciona una para ver sus detalles.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="sale-select">Venta/Lote</Label>
                        <Select value={selectedSaleId} onValueChange={handleSaleSelection}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona una venta para ver sus detalles">
                              {saleData && (
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-medium">
                                    Venta #{saleData.id_Sales} - {saleData.lot?.block}-{saleData.lot?.lot_number}
                                  </span>
                                  <span className="text-sm text-gray-600 ml-2">{getProjectName(saleData)}</span>
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {clientSales.map((sale) => (
                              <SelectItem key={sale.id_Sales} value={sale.id_Sales.toString()}>
                                <div className="w-full">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                      Venta #{sale.id_Sales} - {sale.lot?.block}-{sale.lot?.lot_number}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-2">{getProjectName(sale)}</span>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    <span className="mr-4">Total: {formatCurrency(sale.total_value)}</span>
                                    <span className="mr-4">Pagado: {formatCurrency(sale.total_raised)}</span>
                                    <span
                                      className={`font-medium ${sale.total_debt > 0 ? "text-red-600" : "text-green-600"}`}
                                    >
                                      {sale.total_debt > 0
                                        ? `Debe: ${formatCurrency(sale.total_debt)}`
                                        : "Pagado completamente"}
                                    </span>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Resultados */}
              {clientData && saleData && (
                <div className="space-y-6">
                  {refreshing && (
                    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
                      <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Actualizando información...</span>
                      </div>
                    </div>
                  )}

                  {/* Información del cliente */}
                  <ClientInfo client={clientData} sale={saleData} />

                  {/* Resumen financiero */}
                  <FinancialSummary sale={saleData} />

                  {/* Gestión de Cuotas */}
                  <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
                      <CardTitle className="flex items-center gap-3 text-gray-800">
                        <CreditCard className="h-5 w-5 text-slate-600" />
                        <span className="text-xl font-semibold">Gestión de Cuotas</span>
                      </CardTitle>
                      <CardDescription className="text-gray-600 font-medium mt-2">
                        Herramientas para manejar cuotas vencidas y redistribución de pagos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <QuotaRedistributionButton
                        saleId={saleData.id_Sales}
                        paymentDetails={detailsData}
                        sale={saleData}
                        onRedistributionComplete={handleRedistributionComplete}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Detalles de cuotas con el nuevo componente */}
                  <MonthlyQuotaTracker sale={saleData} paymentDetails={detailsData} />
                </div>
              )}
            </div>
          </div>
        </NavPrivada>
      </div>
    </div>
  )
}
