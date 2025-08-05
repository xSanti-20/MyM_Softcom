"use client"

import { useState } from "react"
import { Search, User, AlertCircle, Loader2, CreditCard, Building2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import NavPrivada from "@/components/nav/PrivateNav"
import axiosInstance from "@/lib/axiosInstance"
import MonthlyQuotaTracker from "@/components/utils/MonthlyQuotaTracker" // Importar el nuevo componente

// Componente para mostrar información del cliente
const ClientInfo = ({ client, sale }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
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
            <p className="text-xl font-bold text-purple-800">{formatCurrency(sale.quota_value)}</p>
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
  const [clientData, setClientData] = useState(null)
  const [saleData, setSaleData] = useState(null)
  const [detailsData, setDetailsData] = useState([])
  const [error, setError] = useState("")

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
    setSaleData(null)
    setDetailsData([])

    try {
      const clientResponse = await axiosInstance.get(`/api/Client/GetByDocument/${parsedDocument}`)

      if (clientResponse.status === 200 && clientResponse.data) {
        const client = clientResponse.data
        setClientData(client)

        const salesResponse = await axiosInstance.get("/api/Sale/GetAllSales")
        const sales = salesResponse.data
        const clientSales = sales.filter((s) => s.id_Clients === client.id_Clients)

        if (clientSales.length === 0) {
          setError("El cliente no tiene ventas registradas")
          return
        }

        // Tomar la primera venta activa o la primera si no hay activas
        const activeSale =
          clientSales.find((sale) => sale.status === "Activo" || sale.status === "Active") || clientSales[0]
        setSaleData(activeSale)

        // Obtener detalles de pagos para la venta seleccionada
        const detailsResponse = await axiosInstance.get(`/api/Detail/GetDetailsBySaleId/${activeSale.id_Sales}`)
        setDetailsData(detailsResponse.data)
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

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch()
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
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Consulta de Detalles de Pago</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Busca por documento para ver el detalle de cuotas y pagos del cliente
                </p>
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
                        type="number" // Cambiado a tipo number para mejor UX en móviles
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

              {/* Resultados */}
              {clientData && saleData && (
                <div className="space-y-6">
                  {/* Información del cliente */}
                  <ClientInfo client={clientData} sale={saleData} />

                  {/* Resumen financiero */}
                  <FinancialSummary sale={saleData} />

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
