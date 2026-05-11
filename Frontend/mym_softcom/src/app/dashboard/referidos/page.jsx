"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import axiosInstance from "@/lib/axiosInstance"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import AlertModal from "@/components/AlertModal"
import ReferralDiscountModal from "@/components/utils/ReferralDiscountModal"
import {
  Gift,
  Plus,
  Loader2,
  Search,
  AlertCircle,
  Download,
  Filter,
  TrendingUp,
  Edit,
  Trash2,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function ReferidosPage() {
  const [showReferralModal, setShowReferralModal] = useState(false)
  const [discountToEdit, setDiscountToEdit] = useState(null)
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState("todos")
  const [searchTerm, setSearchTerm] = useState("")
  const [deletingId, setDeletingId] = useState(null)
  const [alertConfig, setAlertConfig] = useState({
    show: false,
    type: "info",
    message: "",
  })
  const [stats, setStats] = useState({
    totalDiscounts: 0,
    totalAmount: 0,
    byCartera: 0,
    byCuota: 0,
  })

  // Cargar descuentos
  const loadDiscounts = async () => {
    setLoading(true)
    try {
      const response = await axiosInstance.get("/api/Discount/GetReferralDiscounts")
      if (response.data && Array.isArray(response.data)) {
        setDiscounts(response.data)
        calculateStats(response.data)
      }
    } catch (error) {
      showAlert("error", "Error al cargar descuentos", error.response?.data?.message || "")
    } finally {
      setLoading(false)
    }
  }

  // Calcular estadísticas
  const calculateStats = (data) => {
    const total = data.length
    const amount = data.reduce((sum, d) => sum + (parseFloat(d.discount_amount) || 0), 0)
    const cartera = data.filter((d) => d.apply_to === "cartera").length
    const cuota = data.filter((d) => d.apply_to === "cuota").length

    setStats({
      totalDiscounts: total,
      totalAmount: amount,
      byCartera: cartera,
      byCuota: cuota,
    })
  }

  // Filtrar descuentos
  const filteredDiscounts = discounts.filter((discount) => {
    const matchesStatus =
      filterStatus === "todos" ||
      (filterStatus === "cartera" && discount.apply_to === "cartera") ||
      (filterStatus === "cuota" && discount.apply_to === "cuota")

    const matchesSearch =
      searchTerm === "" ||
      discount.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discount.document?.toString().includes(searchTerm)

    return matchesStatus && matchesSearch
  })

  const showAlert = (type, title, message = "") => {
    setAlertConfig({
      show: true,
      type,
      message: message ? `${title}: ${message}` : title,
    })
  }

  const closeAlert = () => {
    setAlertConfig({ ...alertConfig, show: false })
  }

  const handleDeleteDiscount = async (id) => {
    if (!window.confirm("¿Está seguro que desea eliminar este descuento?")) return

    try {
      await axiosInstance.delete(`/api/Discount/DeleteDiscount/${id}`)
      showAlert("success", "Descuento eliminado correctamente")
      loadDiscounts()
    } catch (error) {
      showAlert("error", "Error al eliminar", error.response?.data?.message || "")
    }
  }

  const handleEditDiscount = (discount) => {
    setDiscountToEdit(discount)
    setShowReferralModal(true)
  }

  const handleCloseModal = () => {
    setShowReferralModal(false)
    setDiscountToEdit(null)
  }

  useEffect(() => {
    loadDiscounts()
  }, [])

  // Columnas de la tabla
  const columns = [
    {
      header: "Cliente",
      accessor: "client_name",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold">{row.client_name}</p>
          <p className="text-xs text-gray-600">Doc: {row.document}</p>
        </div>
      ),
    },
    {
      header: "Monto",
      accessor: "discount_amount",
      cell: ({ row }) => (
        <span className="font-bold text-green-600">
          ${parseFloat(row.discount_amount).toLocaleString("es-CO", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      header: "Aplicado a",
      accessor: "apply_to",
      cell: ({ row }) => (
        <Badge
          variant={row.apply_to === "cartera" ? "default" : "secondary"}
          className={
            row.apply_to === "cartera"
              ? "bg-blue-600"
              : "bg-purple-600"
          }
        >
          {row.apply_to === "cartera" ? "Cartera Pendiente" : "Próxima Cuota"}
        </Badge>
      ),
    },
    {
      header: "Fecha",
      accessor: "discount_date",
      cell: ({ row }) => {
        const date = new Date(row.discount_date)
        return date.toLocaleDateString("es-CO")
      },
    },
    {
      header: "Notas",
      accessor: "notes",
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 truncate max-w-xs">
          {row.notes || "-"}
        </span>
      ),
    },
    {
      header: "Acciones",
      accessor: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditDiscount(row)}
            className="gap-1"
          >
            <Edit className="w-3 h-3" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDeleteDiscount(row.id_Discount)}
            className="gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Eliminar
          </Button>
        </div>
      ),
    },
  ]

  const TitlePage = "Referidos"

  return (
    <PrivateNav title={TitlePage}>
      <div className="w-full p-6 space-y-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="w-8 h-8 text-blue-600" />
            Gestión de Referidos
          </h1>
          <p className="text-gray-600 mt-1">
            Registra y controla descuentos por referidos de clientes
          </p>
        </div>
        <Button
          onClick={() => setShowReferralModal(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nuevo Descuento
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Descuentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-2xl font-bold">{stats.totalDiscounts}</div>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Aplicados a Cartera
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-2xl font-bold text-blue-600">{stats.byCartera}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Aplicados a Cuota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-2xl font-bold text-purple-600">{stats.byCuota}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar por Cliente o Documento</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <Input
                  id="search"
                  placeholder="Búsqueda..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Tipo de Aplicación</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="cartera">Cartera Pendiente</SelectItem>
                  <SelectItem value="cuota">Próxima Cuota</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Descuentos por Referidos
            <span className="text-sm font-normal ml-2 text-gray-600">
              ({filteredDiscounts.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : filteredDiscounts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    {columns.map((col) => (
                      <th key={col.accessor} className="px-4 py-2 text-left font-semibold">
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDiscounts.map((discount, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-50">
                      {columns.map((col) => (
                        <td key={col.accessor} className="px-4 py-3">
                          {col.cell ? col.cell({ row: discount }) : discount[col.accessor]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                No hay descuentos por referidos registrados aún.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Modal de Descuento */}
      <ReferralDiscountModal
        isOpen={showReferralModal}
        onClose={handleCloseModal}
        discountToEdit={discountToEdit}
        onSuccess={() => {
          loadDiscounts()
          showAlert(
            "success",
            discountToEdit ? "Descuento actualizado correctamente" : "Descuento registrado correctamente"
          )
        }}
        showAlert={showAlert}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertConfig.show}
        onClose={closeAlert}
        message={alertConfig.message}
        type={alertConfig.type}
      />
      </div>
    </PrivateNav>
  )
}

export default ReferidosPage
