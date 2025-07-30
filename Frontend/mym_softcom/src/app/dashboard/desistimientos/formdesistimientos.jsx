"use client"

import { useState, useEffect, useCallback } from "react"
import axiosInstance from "@/lib/axiosInstance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Search, User, Loader2, AlertTriangle, FileText, Calculator } from "lucide-react"

function RegisterWithdrawal({ refreshData, withdrawalToEdit, onCancelEdit, closeModal, showAlert }) {
  const [formData, setFormData] = useState({
    withdrawal_date: "",
    reason: "",
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

  // Estados para cálculo de penalización
  const [calculatedPenalty, setCalculatedPenalty] = useState(null)
  const [penaltyLoading, setPenaltyLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const isEditing = !!withdrawalToEdit

  // Función auxiliar para obtener el nombre del proyecto
  const getProjectName = (sale) => {
    if (sale?.lot?.project?.name) {
      return sale.lot.project.name
    }
    if (sale?.lot?.Project?.name) {
      return sale.lot.Project.name
    }
    const projectId = sale?.lot?.id_Projects || sale?.lot?.project?.id_Projects
    if (projectId) {
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
      setCalculatedPenalty(null)
      setFormData((prev) => ({ ...prev, id_Sales: "" }))
      return
    }

    const parsedDocument = Number.parseInt(clientDocument, 10)
    if (isNaN(parsedDocument)) {
      setClientSearchError("El documento debe ser un número válido.")
      setFoundClient(null)
      setClientSales([])
      setSelectedSale(null)
      setCalculatedPenalty(null)
      setFormData((prev) => ({ ...prev, id_Sales: "" }))
      return
    }

    setClientSearchLoading(true)
    setClientSearchError(null)
    setFoundClient(null)
    setClientSales([])
    setSelectedSale(null)
    setCalculatedPenalty(null)
    setFormData((prev) => ({ ...prev, id_Sales: "" }))

    try {
      const response = await axiosInstance.get(`/api/Client/GetByDocument/${parsedDocument}`)
      if (response.status === 200 && response.data) {
        setFoundClient(response.data)
        // Buscar ventas activas del cliente
        await fetchClientActiveSales(response.data.id_Clients)
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

  // Función para obtener ventas activas del cliente
  const fetchClientActiveSales = async (clientId) => {
    setSalesLoading(true)
    try {
      const response = await axiosInstance.get("/api/Sale/GetAllSales")
      if (response.data && Array.isArray(response.data)) {
        // Filtrar ventas del cliente específico que estén activas
        const clientActiveSales = response.data.filter(
          (sale) => sale.id_Clients === clientId && (sale.status === "Activo" || sale.status === "Active"),
        )

        setClientSales(clientActiveSales)

        if (clientActiveSales.length === 0) {
          setClientSearchError("Este cliente no tiene ventas activas disponibles para desistimiento.")
        }
      }
    } catch (error) {
      console.error("Error al cargar ventas del cliente:", error)
      setClientSearchError("Error al cargar las ventas del cliente.")
    } finally {
      setSalesLoading(false)
    }
  }

  // Función para seleccionar una venta y calcular penalización
  const handleSelectSale = async (saleId) => {
    const sale = clientSales.find((s) => s.id_Sales.toString() === saleId)
    setSelectedSale(sale)
    setFormData((prev) => ({ ...prev, id_Sales: saleId }))

    // Calcular penalización automáticamente
    if (sale) {
      await calculatePenalty(sale.id_Sales)
    }
  }

  // Función para calcular la penalización
  const calculatePenalty = async (saleId) => {
    setPenaltyLoading(true)
    try {
      const response = await axiosInstance.get(`/api/Withdrawal/CalculatePenalty/${saleId}`)
      if (response.status === 200) {
        // Manejar diferentes formatos de respuesta
        const penalty = response.data.penalty || response.data
        setCalculatedPenalty(penalty)
      }
    } catch (error) {
      console.error("Error al calcular penalización:", error)

      // Si el endpoint no existe, calcular localmente
      if (error.response?.status === 404) {
        if (selectedSale) {
          const totalRaised = selectedSale.total_raised || 0
          const totalValue = selectedSale.total_value || 0
          const penaltyPercentage = totalValue * 0.1
          const penalty = Math.max(0, totalRaised - penaltyPercentage)
          setCalculatedPenalty(penalty)
        }
      } else {
        showAlert("error", "Error al calcular la penalización.")
        setCalculatedPenalty(0)
      }
    } finally {
      setPenaltyLoading(false)
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    if (!isEditing) {
      setFormData((prev) => ({
        ...prev,
        withdrawal_date: new Date().toISOString().split("T")[0],
      }))
    }
  }, [isEditing])

  // Poblar formulario para edición
  useEffect(() => {
    if (isEditing && withdrawalToEdit) {
      setFormData({
        withdrawal_date: withdrawalToEdit.withdrawal_date
          ? new Date(withdrawalToEdit.withdrawal_date).toISOString().split("T")[0]
          : "",
        reason: withdrawalToEdit.reason || "",
        id_Sales: withdrawalToEdit.id_Sales?.toString() || "",
      })

      // Cargar datos del cliente y venta para edición
      if (withdrawalToEdit.sale?.client) {
        setFoundClient(withdrawalToEdit.sale.client)
        setClientDocument(withdrawalToEdit.sale.client.document?.toString() || "")
        setSelectedSale(withdrawalToEdit.sale)
        setClientSales([withdrawalToEdit.sale])
        setCalculatedPenalty(withdrawalToEdit.penalty)
      }
    } else {
      // Resetear estados
      setFormData({
        withdrawal_date: new Date().toISOString().split("T")[0],
        reason: "",
        id_Sales: "",
      })
      setClientDocument("")
      setFoundClient(null)
      setClientSearchError(null)
      setClientSales([])
      setSelectedSale(null)
      setCalculatedPenalty(null)
    }
  }, [withdrawalToEdit, isEditing])

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

    const { withdrawal_date, reason, id_Sales } = formData

    if (!withdrawal_date || !reason || !id_Sales) {
      showAlert("error", "Todos los campos obligatorios deben ser completados.")
      return
    }

    if (!selectedSale) {
      showAlert("error", "Debe seleccionar una venta válida.")
      return
    }

    // Construir el cuerpo de la solicitud según si es edición o creación
    const body = {
      reason: reason.trim(),
      withdrawal_date: new Date(withdrawal_date).toISOString(),
      id_Sales: Number.parseInt(id_Sales, 10),
    }

    if (isEditing) {
      // Para edición, incluimos el ID del desistimiento y la penalización existente
      body.id_Withdrawals = withdrawalToEdit.id_Withdrawals
      body.penalty = withdrawalToEdit.penalty || 0 // Mantener la penalización original
    }
    // Para creación, no incluimos id_Withdrawals ni penalty, ya que son autoincremental/autocalculado por el backend.

    console.log("Datos enviados al backend:", body)

    try {
      setLoading(true)
      let response
      if (isEditing) {
        response = await axiosInstance.put(`/api/Withdrawal/UpdateWithdrawal/${body.id_Withdrawals}`, body)
      } else {
        response = await axiosInstance.post("/api/Withdrawal/CreateWithdrawal", body)
      }

      const successMessage =
        response.data?.message ||
        (isEditing ? "Desistimiento actualizado con éxito." : "Desistimiento registrado con éxito.")

      showAlert("success", successMessage)

      if (!isEditing || closeModal) {
        setFormData({
          withdrawal_date: new Date().toISOString().split("T")[0],
          reason: "",
          id_Sales: "",
        })
        setClientDocument("")
        setFoundClient(null)
        setClientSearchError(null)
        setClientSales([])
        setSelectedSale(null)
        setCalculatedPenalty(null)
      }

      if (closeModal) closeModal()
      if (typeof refreshData === "function") refreshData()
    } catch (error) {
      console.error("Error completo:", error)

      // Manejo mejorado de errores
      let errorMessage = "Error desconocido"

      if (error.response?.data) {
        if (typeof error.response.data === "string") {
          errorMessage = error.response.data
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message
        } else {
          errorMessage = JSON.stringify(error.response.data)
        }
      } else if (error.message) {
        errorMessage = error.message
      }

      showAlert("error", `Error al ${isEditing ? "actualizar" : "registrar"} el desistimiento: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <AlertTriangle className="mr-2 text-red-500" />
          {isEditing ? "Editar Desistimiento" : "Registrar Nuevo Desistimiento"}
        </h2>
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
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Selección de Venta para Desistimiento</h3>

            <div>
              <Label htmlFor="id_Sales" className="block text-sm font-medium text-gray-700 mb-1">
                Venta a Desistir *
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
                        <div className="text-sm text-green-600 font-medium mt-1">
                          Recaudo: {sale.total_raised?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Información de la Venta Seleccionada */}
            {selectedSale && (
              <div className="mt-4 p-4 border border-amber-200 bg-amber-50 rounded-md text-sm">
                <p className="font-semibold text-amber-800 mb-2">Venta Seleccionada para Desistimiento:</p>
                <div className="grid grid-cols-2 gap-3 text-amber-700">
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

            {/* Cálculo de Penalización */}
            {selectedSale && (
              <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-md text-sm">
                <div className="flex items-center mb-2">
                  <Calculator className="mr-2 text-red-600" size={16} />
                  <p className="font-semibold text-red-800">Cálculo de Penalización (10%):</p>
                </div>
                {penaltyLoading ? (
                  <div className="flex items-center text-red-600">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculando penalización...
                  </div>
                ) : calculatedPenalty !== null ? (
                  <div className="text-red-700">
                    <p>
                      <strong>Penalización a aplicar:</strong>{" "}
                      {calculatedPenalty.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
                    </p>
                    <p className="text-xs mt-1">Fórmula: Recaudo Total - (Valor Total × 10%) = Penalización</p>
                  </div>
                ) : (
                  <p className="text-red-600">Error al calcular la penalización</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sección de Detalles del Desistimiento */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Detalles del Desistimiento</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fecha de Desistimiento */}
            <div>
              <Label htmlFor="withdrawal_date" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Desistimiento *
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  id="withdrawal_date"
                  name="withdrawal_date"
                  value={formData.withdrawal_date}
                  onChange={handleChange}
                  required
                  className="w-full pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>
          </div>

          {/* Motivo del Desistimiento */}
          <div className="mt-4">
            <Label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Motivo del Desistimiento *
            </Label>
            <div className="relative">
              <Textarea
                id="reason"
                name="reason"
                placeholder="Describa el motivo del desistimiento..."
                value={formData.reason}
                onChange={handleChange}
                required
                className="w-full min-h-[100px]"
                maxLength={500}
              />
              <FileText className="absolute right-3 top-3 text-gray-400" size={20} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{formData.reason.length}/500 caracteres</p>
          </div>
        </div>

        {/* Advertencia sobre consecuencias */}
        {selectedSale && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-semibold mb-2">Consecuencias del Desistimiento:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    Se aplicará una penalización de{" "}
                    {calculatedPenalty?.toLocaleString("es-CO", { style: "currency", currency: "COP" }) ||
                      "calculando..."}
                  </li>
                  <li>
                    El lote {selectedSale.lot?.block}-{selectedSale.lot?.lot_number} será liberado automáticamente
                  </li>
                  <li>La venta cambiará a estado "Desistida"</li>
                  <li>El cliente solo se desactivará si no tiene otras ventas activas</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button type="button" onClick={onCancelEdit} variant="outline" disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || !foundClient || !selectedSale}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Actualizando..." : "Registrando..."}
              </>
            ) : isEditing ? (
              "Actualizar Desistimiento"
            ) : (
              "Registrar Desistimiento"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default RegisterWithdrawal
