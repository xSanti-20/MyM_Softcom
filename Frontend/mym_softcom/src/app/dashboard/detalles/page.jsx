"use client"

import { useState } from "react"
import { Search, User, AlertCircle, Loader2, CreditCard, Building2, RefreshCw } from "lucide-react"
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

// Componente para mostrar información del cliente
const ClientInfo = ({ client, sale }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "activo":
        return "bg-green-100 text-green-800"
      case "escriturar":
        return "bg-blue-100 text-blue-800"
      case "desistida":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Información del Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-600">Nombre Completo</Label>
            <p className="text-lg font-semibold">
              {client.names} {client.surnames}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Documento</Label>
            <p className="text-lg">{client.document}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Teléfono</Label>
            <p className="text-lg">{client.phone || "No registrado"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Email</Label>
            <p className="text-lg">{client.email || "No registrado"}</p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-600">Proyecto</Label>
            <p className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {sale.lot?.project?.name || "No disponible"}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Lote</Label>
            <p className="text-lg">
              {sale.lot?.block}-{sale.lot?.lot_number || "No disponible"}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Estado de Venta</Label>
            <Badge className={getStatusColor(sale.status)}>{sale.status || "No disponible"}</Badge>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Resumen Financiero
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Label className="text-sm font-medium text-blue-600">Valor Total</Label>
            <p className="text-xl font-bold text-blue-800">{formatCurrency(sale.total_value)}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Label className="text-sm font-medium text-green-600">Total Pagado</Label>
            <p className="text-xl font-bold text-green-800">{formatCurrency(sale.total_raised)}</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <Label className="text-sm font-medium text-amber-600">Saldo Pendiente</Label>
            <p className="text-xl font-bold text-amber-800">{formatCurrency(sale.total_debt)}</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Label className="text-sm font-medium text-purple-600">Valor Cuota</Label>
            <p className="text-xl font-bold text-purple-800">{formatCurrency(displayQuotaValue)}</p>
            {sale.paymentPlanType?.toLowerCase() === "custom" && (
              <p className="text-xs text-purple-600 mt-1">Cuota típica</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso de Pago</span>
            <span>{progressPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
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

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-col flex-1">
        <NavPrivada>
          <div className="py-6 px-4 md:px-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                      Consulta de Detalles de Pago
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      Busca por documento para ver el detalle de cuotas y pagos del cliente
                    </p>
                  </div>
                  {saleData && (
                    <Button
                      onClick={refreshData}
                      disabled={refreshing}
                      variant="outline"
                      className="flex items-center gap-2 bg-transparent"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                      {refreshing ? "Actualizando..." : "Actualizar Información"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Formulario de búsqueda */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Buscar Cliente
                  </CardTitle>
                  <CardDescription>
                    Ingresa el número de documento del cliente para consultar sus detalles de pago
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label htmlFor="document">Número de Documento</Label>
                      <Input
                        id="document"
                        type="number"
                        placeholder="Ej: 12345678"
                        value={searchDocument}
                        onChange={(e) => setSearchDocument(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                      />
                    </div>
                    <Button onClick={handleSearch} disabled={loading} className="px-6">
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
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-700 text-sm">{error}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Selector de ventas/lotes */}
              {clientData && clientSales.length > 1 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Seleccionar Venta/Lote
                    </CardTitle>
                    <CardDescription>
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
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Gestión de Cuotas
                      </CardTitle>
                      <CardDescription>
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
