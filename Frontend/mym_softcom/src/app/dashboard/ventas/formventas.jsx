"use client"

import { useState, useEffect, useCallback } from "react"
import axiosInstance from "@/lib/axiosInstance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, DollarSign, Search, User } from "lucide-react"

function RegisterSale({ refreshData, saleToEdit, onCancelEdit, closeModal, showAlert }) {
  const [formData, setFormData] = useState({
    sale_date: "",
    total_value: "",
    initial_payment: "",
    id_Clients: "",
    id_Lots: "",
    id_Users: "",
    id_Plans: "",
  })

  const [clientDocument, setClientDocument] = useState("")
  const [foundClient, setFoundClient] = useState(null)
  const [clientSearchLoading, setClientSearchLoading] = useState(false)
  const [clientSearchError, setClientSearchError] = useState(null)

  const [lots, setLots] = useState([])
  const [users, setUsers] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const isEditing = !!saleToEdit

  // Función para buscar cliente por documento
  const handleSearchClient = useCallback(async () => {
    if (!clientDocument) {
      setClientSearchError("Por favor, ingrese un número de documento.")
      setFoundClient(null)
      setFormData((prev) => ({ ...prev, id_Clients: "" }))
      return
    }

    const parsedDocument = Number.parseInt(clientDocument, 10)
    if (isNaN(parsedDocument)) {
      setClientSearchError("El documento debe ser un número válido.")
      setFoundClient(null)
      setFormData((prev) => ({ ...prev, id_Clients: "" }))
      return
    }

    setClientSearchLoading(true)
    setClientSearchError(null)
    setFoundClient(null)
    setFormData((prev) => ({ ...prev, id_Clients: "" }))

    try {
      const response = await axiosInstance.get(`/api/Client/GetByDocument/${parsedDocument}`)
      if (response.status === 200 && response.data) {
        setFoundClient(response.data)
        setFormData((prev) => ({ ...prev, id_Clients: response.data.id_Clients }))
        // Eliminado: showAlert("success", `Cliente encontrado: ${response.data.names} ${response.data.surnames}`);
      } else {
        setClientSearchError("Cliente no encontrado con ese documento.")
        showAlert("error", "Cliente no encontrado con ese documento.") // Mantener alerta para errores
      }
    } catch (error) {
      console.error("Error al buscar cliente:", error)
      setClientSearchError("Error al buscar cliente. Intente de nuevo.")
      showAlert("error", "Error al buscar cliente. Intente de nuevo.") // Mantener alerta para errores
    } finally {
      setClientSearchLoading(false)
    }
  }, [clientDocument, showAlert])

  // Fetch data for dropdowns (excluding clients now)
  useEffect(() => {
    async function fetchDataForSelects() {
      try {
        const [lotsRes, usersRes, plansRes] = await Promise.all([
          axiosInstance.get("/api/Lot/GetLotsForSelect"),
          axiosInstance.get("/api/User/ConsultAllUser"),
          axiosInstance.get("/api/Plan/GetAllPlans"),
        ])

        setLots(lotsRes.data)
        setUsers(usersRes.data.filter((user) => user.status !== "Inactivo"))
        setPlans(plansRes.data)

        if (!isEditing) {
          setFormData((prev) => ({
            ...prev,
            sale_date: new Date().toISOString().split("T")[0],
          }))
        }
      } catch (error) {
        console.error("Error al cargar datos para los selectores:", error)
        showAlert("error", "No se pudieron cargar las opciones necesarias para el formulario de ventas.")
      }
    }
    fetchDataForSelects()
  }, [isEditing, showAlert])

  // Populate form for editing and fetch client details
  useEffect(() => {
    if (isEditing && saleToEdit) {
      setFormData({
        sale_date: saleToEdit.sale_date ? new Date(saleToEdit.sale_date).toISOString().split("T")[0] : "",
        total_value: saleToEdit.total_value?.toString() || "",
        initial_payment: saleToEdit.initial_payment?.toString() || "",
        id_Clients: saleToEdit.id_Clients?.toString() || "",
        id_Lots: saleToEdit.id_Lots?.toString() || "",
        id_Users: saleToEdit.id_Users?.toString() || "",
        id_Plans: saleToEdit.id_Plans?.toString() || "",
      })

      if (saleToEdit.id_Clients) {
        const fetchClientForEdit = async () => {
          try {
            const response = await axiosInstance.get(`/api/Client/${saleToEdit.id_Clients}`)
            if (response.status === 200 && response.data) {
              setFoundClient(response.data)
              setClientDocument(response.data.document?.toString() || "")
            }
          } catch (error) {
            console.error("Error al cargar cliente para edición:", error)
            setClientSearchError("No se pudo cargar el cliente asociado a esta venta.")
          }
        }
        fetchClientForEdit()
      }
    } else {
      setFormData((prev) => ({
        sale_date: new Date().toISOString().split("T")[0],
        total_value: "",
        initial_payment: "",
        id_Clients: "",
        id_Lots: "",
        id_Users: "",
        id_Plans: "",
      }))
      setClientDocument("")
      setFoundClient(null)
      setClientSearchError(null)
    }
  }, [saleToEdit, isEditing])

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

    const { sale_date, total_value, initial_payment, id_Clients, id_Lots, id_Users, id_Plans } = formData

    if (!sale_date || !total_value || !initial_payment || !id_Clients || !id_Lots || !id_Users || !id_Plans) {
      showAlert("error", "Todos los campos obligatorios deben ser completados.")
      return
    }

    const parsedTotalValue = Number.parseFloat(total_value)
    const parsedInitialPayment = Number.parseFloat(initial_payment)

    if (isNaN(parsedTotalValue) || parsedTotalValue <= 0) {
      showAlert("error", "El valor total debe ser un número positivo.")
      return
    }
    if (isNaN(parsedInitialPayment) || parsedInitialPayment < 0) {
      showAlert("error", "La cuota inicial debe ser un número válido y no negativo.")
      return
    }
    if (parsedInitialPayment > parsedTotalValue) {
      showAlert("error", "La cuota inicial no puede ser mayor que el valor total.")
      return
    }

    const body = {
      sale_date: new Date(sale_date).toISOString(),
      total_value: parsedTotalValue,
      initial_payment: parsedInitialPayment,
      id_Clients: Number.parseInt(id_Clients, 10),
      id_Lots: Number.parseInt(id_Lots, 10),
      id_Users: Number.parseInt(id_Users, 10),
      id_Plans: Number.parseInt(id_Plans, 10),
    }

    if (isEditing) {
      body.id_Sales = saleToEdit.id_Sales
      body.total_raised = saleToEdit.total_raised
      body.total_debt = saleToEdit.total_debt
      body.status = saleToEdit.status
    }

    try {
      setLoading(true)
      let response
      if (isEditing) {
        response = await axiosInstance.put(`/api/Sale/UpdateSale/${body.id_Sales}`, body)
      } else {
        response = await axiosInstance.post("/api/Sale/CreateSale", body)
      }

      const successMessage =
        response.data?.message || (isEditing ? "Venta actualizada con éxito." : "Venta registrada con éxito.")

      showAlert("success", successMessage)

      if (!isEditing || closeModal) {
        setFormData({
          sale_date: new Date().toISOString().split("T")[0],
          total_value: "",
          initial_payment: "",
          id_Clients: "",
          id_Lots: "",
          id_Users: "",
          id_Plans: "",
        })
        setClientDocument("")
        setFoundClient(null)
        setClientSearchError(null)
      }

      if (closeModal) closeModal()
      if (typeof refreshData === "function") refreshData()
    } catch (error) {
      console.error("Error completo:", error)
      const errorMessage = error.response?.data?.message || error.response?.data || "Error desconocido"

      showAlert(
        "error",
        `Ocurrió un error al ${isEditing ? "actualizar" : "registrar"} la venta: ` + JSON.stringify(errorMessage),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{isEditing ? "Editar Venta" : "Registrar Nueva Venta"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna izquierda: Información de la Venta */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Detalles de la Venta</h3>

            {/* Fecha de Venta */}
            <div>
              <Label htmlFor="sale_date" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Venta *
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  id="sale_date"
                  name="sale_date"
                  value={formData.sale_date}
                  onChange={handleChange}
                  required
                  className="w-full pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>

            {/* Valor Total */}
            <div>
              <Label htmlFor="total_value" className="block text-sm font-medium text-gray-700 mb-1">
                Valor Total *
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  id="total_value"
                  name="total_value"
                  placeholder="Ej: 44000000"
                  value={formData.total_value}
                  onChange={handleChange}
                  step="0.01"
                  required
                  className="w-full pr-10"
                />
                <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>

            {/* Cuota Inicial */}
            <div>
              <Label htmlFor="initial_payment" className="block text-sm font-medium text-gray-700 mb-1">
                Cuota Inicial *
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  id="initial_payment"
                  name="initial_payment"
                  placeholder="Ej: 2000000"
                  value={formData.initial_payment}
                  onChange={handleChange}
                  step="0.01"
                  required
                  className="w-full pr-10"
                />
                <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>
          </div>

          {/* Columna derecha: Relaciones */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Asociaciones</h3>

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
                  <Search className="mr-2 h-4 w-4" />
                  {clientSearchLoading ? "Buscando..." : "Buscar"}
                </Button>
              </div>
              {clientSearchError && <p className="text-red-500 text-sm mt-1">{clientSearchError}</p>}
              {foundClient && (
                <div className="mt-2 p-3 border border-blue-200 bg-blue-50 rounded-md text-sm text-blue-800">
                  <p className="font-semibold">Cliente Seleccionado:</p>
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
              )}
            </div>

            {/* Lote */}
            <div>
              <Label htmlFor="id_Lots" className="block text-sm font-medium text-gray-700 mb-1">
                Lote *
              </Label>
              <Select
                name="id_Lots"
                value={formData.id_Lots}
                onValueChange={(value) => handleSelectChange("id_Lots", value)}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un lote" />
                </SelectTrigger>
                <SelectContent>
                  {lots.map((lot) => (
                    <SelectItem key={lot.id_Lots} value={lot.id_Lots.toString()}>
                      {lot.Display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Usuario */}
            <div>
              <Label htmlFor="id_Users" className="block text-sm font-medium text-gray-700 mb-1">
                Usuario *
              </Label>
              <Select
                name="id_Users"
                value={formData.id_Users}
                onValueChange={(value) => handleSelectChange("id_Users", value)}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id_Users} value={user.id_Users.toString()}>
                      {user.nom_Users}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Plan */}
            <div>
              <Label htmlFor="id_Plans" className="block text-sm font-medium text-gray-700 mb-1">
                Plan *
              </Label>
              <Select
                name="id_Plans"
                value={formData.id_Plans}
                onValueChange={(value) => handleSelectChange("id_Plans", value)}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id_Plans} value={plan.id_Plans.toString()}>
                      {plan.name} ({plan.number_quotas} cuotas)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Campos de solo lectura para edición (si aplica) */}
        {isEditing && saleToEdit && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Estado Financiero</h3>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Recaudo Total</Label>
                <Input
                  type="text"
                  value={
                    saleToEdit.total_raised?.toLocaleString("es-CO", { style: "currency", currency: "COP" }) || "N/A"
                  }
                  readOnly
                  disabled
                  className="w-full bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Deuda Total</Label>
                <Input
                  type="text"
                  value={
                    saleToEdit.total_debt?.toLocaleString("es-CO", { style: "currency", currency: "COP" }) || "N/A"
                  }
                  readOnly
                  disabled
                  className="w-full bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Detalles del Plan</h3>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Valor Cuota</Label>
                <Input
                  type="text"
                  value={
                    saleToEdit.quota_value?.toLocaleString("es-CO", { style: "currency", currency: "COP" }) || "N/A"
                  }
                  readOnly
                  disabled
                  className="w-full bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Estado de Venta</Label>
                <Input
                  type="text"
                  value={saleToEdit.status || "N/A"}
                  readOnly
                  disabled
                  className="w-full bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button type="button" onClick={onCancelEdit} variant="outline" disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? (isEditing ? "Actualizando..." : "Registrando...") : isEditing ? "Actualizar" : "Registrar"}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default RegisterSale
