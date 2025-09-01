"use client"

import { useState, useEffect, useCallback } from "react"
import axiosInstance from "@/lib/axiosInstance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, DollarSign, Search, User, Loader2, CreditCard } from "lucide-react"

function RegisterPayment({ refreshData, paymentToEdit, onCancelEdit, closeModal, showAlert }) {
  const [formData, setFormData] = useState({
    amount: "",
    payment_date: "",
    payment_method: "",
    id_Sales: "",
  })

  // Estados para búsqueda de cliente
  const [clientDocument, setClientDocument] = useState("")
  const [foundClient, setFoundClient] = useState(null)
  const [clientSearchLoading, setClientSearchLoading] = useState(false)
  const [clientSearchError, setClientSearchError] = useState(null)

  // Estados para ventas del cliente
  const [clientSales, setClientSales] = useState([])
  const [selectedSale, setSelectedSale] = useState(null)
  const [salesLoading, setSalesLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const isEditing = !!paymentToEdit

  // Métodos de pago disponibles
  const paymentMethods = [
    { value: "EFECTIVO", label: "Efectivo", icon: <DollarSign className="w-4 h-4" /> },
    { value: "BANCO CORRIENTE", label: "Transferencia Corriente", icon: <CreditCard className="w-4 h-4" /> },
     { value: "BANCO AHORROS", label: "Transferencia Ahorro", icon: <CreditCard className="w-4 h-4" /> },
  ]

  // Función auxiliar para obtener el nombre del proyecto
  const getProjectName = (sale) => {
    // Intentar obtener el proyecto directamente del lote
    if (sale?.lot?.project?.name) {
      return sale.lot.project.name
    }

    // Intentar con diferentes capitalizaciones
    if (sale?.lot?.Project?.name) {
      return sale.lot.Project.name
    }

    // Intentar con diferentes estructuras
    if (sale?.Lot?.project?.name) {
      return sale.Lot.project.name
    }

    if (sale?.Lot?.Project?.name) {
      return sale.Lot.Project.name
    }

    // Intentar con propiedades directas
    if (sale?.lot?.project_name) {
      return sale.lot.project_name
    }

    // Intentar obtener el ID del proyecto y usar un mapeo
    const projectId = sale?.lot?.id_Projects || sale?.lot?.project?.id_Projects
    if (projectId) {
      // Aquí podrías tener un mapeo de IDs a nombres si es necesario
      // Por ahora, solo mostraremos el ID
      return `Proyecto #${projectId}`
    }

    return "Sin proyecto"
  }

  // Función para buscar cliente por documento
  const handleSearchClient = useCallback(async () => {
    if (!clientDocument) {
      setClientSearchError("Por favor, ingrese un número de documento.")
      setFoundClient(null)
      setClientSales([])
      setSelectedSale(null)
      setFormData((prev) => ({ ...prev, id_Sales: "" }))
      return
    }

    const parsedDocument = Number.parseInt(clientDocument, 10)
    if (isNaN(parsedDocument)) {
      setClientSearchError("El documento debe ser un número válido.")
      setFoundClient(null)
      setClientSales([])
      setSelectedSale(null)
      setFormData((prev) => ({ ...prev, id_Sales: "" }))
      return
    }

    setClientSearchLoading(true)
    setClientSearchError(null)
    setFoundClient(null)
    setClientSales([])
    setSelectedSale(null)
    setFormData((prev) => ({ ...prev, id_Sales: "" }))

    try {
      const response = await axiosInstance.get(`/api/Client/GetByDocument/${parsedDocument}`)
      if (response.status === 200 && response.data) {
        setFoundClient(response.data)
        // Buscar ventas del cliente
        await fetchClientSales(response.data.id_Clients)
      } else {
        setClientSearchError("Cliente no encontrado con ese documento.")
        showAlert("error", "Cliente no encontrado con ese documento.")
      }
    } catch (error) {
      console.error("Error al buscar cliente:", error)
      setClientSearchError("Error al buscar cliente. Intente de nuevo.")
      showAlert("error", "Error al buscar cliente. Intente de nuevo.")
    } finally {
      setClientSearchLoading(false)
    }
  }, [clientDocument, showAlert])

  // Función para obtener ventas del cliente
  const fetchClientSales = async (clientId) => {
    setSalesLoading(true)
    try {
      const response = await axiosInstance.get("/api/Sale/GetAllSales")
      if (response.data && Array.isArray(response.data)) {
        // Filtrar ventas del cliente específico que tengan deuda pendiente
        const clientActiveSales = response.data.filter(
          (sale) =>
            sale.id_Clients === clientId &&
            (sale.status === "Activo" || sale.status === "Active") &&
            sale.total_debt > 0,
        )
        setClientSales(clientActiveSales)

        if (clientActiveSales.length === 0) {
          setClientSearchError("Este cliente no tiene ventas activas con deuda pendiente.")
        }
      }
    } catch (error) {
      console.error("Error al cargar ventas del cliente:", error)
      setClientSearchError("Error al cargar las ventas del cliente.")
    } finally {
      setSalesLoading(false)
    }
  }

  // Función para seleccionar una venta
  const handleSelectSale = (saleId) => {
    const sale = clientSales.find((s) => s.id_Sales.toString() === saleId)
    setSelectedSale(sale)
    setFormData((prev) => ({ ...prev, id_Sales: saleId }))
  }

  // Cargar datos iniciales
  useEffect(() => {
    if (!isEditing) {
      setFormData((prev) => ({
        ...prev,
        payment_date: new Date().toISOString().split("T")[0],
      }))
    }
  }, [isEditing])

  // Poblar formulario para edición
  useEffect(() => {
    if (isEditing && paymentToEdit) {
      setFormData({
        amount: paymentToEdit.amount?.toString() || "",
        payment_date: paymentToEdit.payment_date
          ? new Date(paymentToEdit.payment_date).toISOString().split("T")[0]
          : "",
        payment_method: paymentToEdit.payment_method || "",
        id_Sales: paymentToEdit.id_Sales?.toString() || "",
      })

      // Cargar datos del cliente y venta para edición
      if (paymentToEdit.sale?.client) {
        setFoundClient(paymentToEdit.sale.client)
        setClientDocument(paymentToEdit.sale.client.document?.toString() || "")
        setSelectedSale(paymentToEdit.sale)
        setClientSales([paymentToEdit.sale])
      }
    } else {
      // Resetear estados
      setFormData({
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "",
        id_Sales: "",
      })
      setClientDocument("")
      setFoundClient(null)
      setClientSearchError(null)
      setClientSales([])
      setSelectedSale(null)
    }
  }, [paymentToEdit, isEditing])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const { amount, payment_date, payment_method, id_Sales } = formData

    if (!amount || !payment_date || !payment_method || !id_Sales) {
      showAlert("error", "Todos los campos obligatorios deben ser completados.")
      return
    }

    const parsedAmount = Number.parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showAlert("error", "El monto debe ser un número positivo.")
      return
    }

    // Validar que el monto no exceda la deuda pendiente
    if (selectedSale && parsedAmount > selectedSale.total_debt) {
      showAlert(
        "error",
        `El monto no puede exceder la deuda pendiente de ${selectedSale.total_debt.toLocaleString("es-CO", { style: "currency", currency: "COP" })}.`,
      )
      return
    }

    const body = {
      Amount: parsedAmount,
      Payment_Date: new Date(payment_date).toISOString(),
      Payment_Method: payment_method,
      Id_Sales: Number.parseInt(id_Sales, 10),
    }

    if (isEditing) {
      body.Id_Payments = paymentToEdit.id_Payments
    }

    try {
      setLoading(true)
      let response
      if (isEditing) {
        response = await axiosInstance.put("/api/Payment/UpdatePayment", body)
      } else {
        response = await axiosInstance.post("/api/Payment/CreatePayment", body)
      }

      const successMessage =
        response.data?.message || (isEditing ? "Pago actualizado con éxito." : "Pago registrado con éxito.")

      showAlert("success", successMessage)

      if (!isEditing || closeModal) {
        setFormData({
          amount: "",
          payment_date: new Date().toISOString().split("T")[0],
          payment_method: "",
          id_Sales: "",
        })
        setClientDocument("")
        setFoundClient(null)
        setClientSearchError(null)
        setClientSales([])
        setSelectedSale(null)
      }

      if (closeModal) closeModal()
      if (typeof refreshData === "function") refreshData()
    } catch (error) {
      console.error("Error completo:", error)
      const errorMessage = error.response?.data?.message || error.response?.data || "Error desconocido"

      showAlert(
        "error",
        `Ocurrió un error al ${isEditing ? "actualizar" : "registrar"} el pago: ` + JSON.stringify(errorMessage),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{isEditing ? "Editar Pago" : "Registrar Nuevo Pago"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección de Cliente */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Información del Cliente</h3>

          {/* Cliente - Búsqueda por Documento */}
          <div>
            <Label htmlFor="client_document" className="block text-sm font-medium text-gray-700 mb-1">
              Documento del Cliente *
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  id="client_document"
                  name="client_document"
                  placeholder="Documento del cliente"
                  value={clientDocument}
                  onChange={(e) => setClientDocument(e.target.value)}
                  required
                  className="w-full pr-10"
                  disabled={clientSearchLoading}
                />
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
              <Button
                type="button"
                onClick={handleSearchClient}
                disabled={clientSearchLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {clientSearchLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                {clientSearchLoading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
            {clientSearchError && <p className="text-red-500 text-sm mt-1">{clientSearchError}</p>}
            {foundClient && (
              <div className="mt-3 p-3 border border-blue-200 bg-blue-50 rounded-md text-sm text-blue-800">
                <p className="font-semibold">Cliente Encontrado:</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <p>
                    <strong>Nombre:</strong> {foundClient.names} {foundClient.surnames}
                  </p>
                  <p>
                    <strong>Documento:</strong> {foundClient.document}
                  </p>
                  <p>
                    <strong>Teléfono:</strong> {foundClient.phone || "N/A"}
                  </p>
                  <p>
                    <strong>Email:</strong> {foundClient.email || "N/A"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sección de Venta */}
        {foundClient && clientSales.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Selección de Venta</h3>

            <div>
              <Label htmlFor="id_Sales" className="block text-sm font-medium text-gray-700 mb-1">
                Venta a Pagar *
              </Label>
              <Select
                name="id_Sales"
                value={formData.id_Sales}
                onValueChange={(value) => {
                  handleSelectChange("id_Sales", value)
                  handleSelectSale(value)
                }}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una venta">
                    {selectedSale && (
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">
                          Venta #{selectedSale.id_Sales} - {selectedSale.lot?.block}-{selectedSale.lot?.lot_number}
                        </span>
                        <span className="text-sm text-gray-600 ml-2">{getProjectName(selectedSale)}</span>
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
                        <div className="text-sm text-red-600 font-medium mt-1">
                          Deuda: {sale.total_debt?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Información de la Venta Seleccionada */}
            {selectedSale && (
              <div className="mt-4 p-4 border border-green-200 bg-green-50 rounded-md text-sm">
                <p className="font-semibold text-green-800 mb-2">Venta Seleccionada:</p>
                <div className="grid grid-cols-2 gap-3 text-green-700">
                  <div>
                    <p>
                      <strong>ID:</strong> #{selectedSale.id_Sales}
                    </p>
                    <p>
                      <strong>Lote:</strong> {selectedSale.lot?.block}-{selectedSale.lot?.lot_number}
                    </p>
                    <p>
                      <strong>Proyecto:</strong> {getProjectName(selectedSale)}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Valor Total:</strong>{" "}
                      {selectedSale.total_value?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
                    </p>
                    <p>
                      <strong>Recaudo Actual:</strong>{" "}
                      {selectedSale.total_raised?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
                    </p>
                    <p>
                      <strong>Deuda Pendiente:</strong>{" "}
                      {selectedSale.total_debt?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
                    </p>
                  </div>
                </div>
                <p className="mt-2">
                  <strong>Plan:</strong> {selectedSale.plan?.name || "N/A"} ({selectedSale.plan?.number_quotas || 0}{" "}
                  cuotas)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sección de Detalles del Pago */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Detalles del Pago</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monto */}
            <div>
              <Label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Monto *
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  id="amount"
                  name="amount"
                  placeholder="Ej: 500000"
                  value={formData.amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  className="w-full pr-10"
                />
                <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
              {selectedSale && (
                <p className="text-sm text-gray-600 mt-1">
                  Máximo: {selectedSale.total_debt?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
                </p>
              )}
            </div>

            {/* Fecha de Pago */}
            <div>
              <Label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Pago *
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  id="payment_date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleChange}
                  required
                  className="w-full pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>
          </div>

          {/* Método de Pago */}
          <div className="mt-4">
            <Label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago *</Label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <label
                  key={method.value}
                  className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={method.value}
                    checked={formData.payment_method === method.value}
                    onChange={handleChange}
                    className="mr-3"
                    required
                  />
                  <div className="flex items-center">
                    {method.icon}
                    <span className="ml-2 font-medium">{method.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button type="button" onClick={onCancelEdit} variant="outline" disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || !foundClient || !selectedSale}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Actualizando..." : "Registrando..."}
              </>
            ) : isEditing ? (
              "Actualizar Pago"
            ) : (
              "Registrar Pago"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default RegisterPayment
