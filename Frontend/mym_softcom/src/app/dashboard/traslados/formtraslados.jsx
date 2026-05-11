"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import axiosInstance from "@/lib/axiosInstance"
import { AlertCircle, Loader2, Search } from "lucide-react"

export default function CreateTransfer({ isOpen, onClose, onSuccess, editingData }) {
  const [loading, setLoading] = useState(false)
  
  // Estados para búsqueda de cliente
  const [clientDocument, setClientDocument] = useState("")
  const [foundClient, setFoundClient] = useState(null)
  const [clientSearchLoading, setClientSearchLoading] = useState(false)
  const [clientSearchError, setClientSearchError] = useState(null)

  // Estados para ventas del cliente
  const [clientSales, setClientSales] = useState([])
  const [salesLoading, setSalesLoading] = useState(false)

  const [formData, setFormData] = useState({
    idSalesOrigen: "",
    idSalesDestino: "",
    type: "Completo",
    amountTransferred: "",
    accountingNote: "",
  })
  const [errors, setErrors] = useState({})

  // Función para buscar cliente por documento
  const handleSearchClient = useCallback(async () => {
    if (!clientDocument) {
      setClientSearchError("Por favor, ingrese un número de documento.")
      setFoundClient(null)
      setClientSales([])
      setFormData(prev => ({ ...prev, idSalesOrigen: "", idSalesDestino: "" }))
      return
    }

    const parsedDocument = Number.parseInt(clientDocument, 10)
    if (isNaN(parsedDocument)) {
      setClientSearchError("El documento debe ser un número válido.")
      setFoundClient(null)
      setClientSales([])
      return
    }

    setClientSearchLoading(true)
    setClientSearchError(null)
    setFoundClient(null)
    setClientSales([])
    setFormData(prev => ({ ...prev, idSalesOrigen: "", idSalesDestino: "" }))

    try {
      const response = await axiosInstance.get(`/api/Client/GetByDocument/${parsedDocument}`)
      if (response.status === 200 && response.data) {
        setFoundClient(response.data)
        await fetchClientActiveSales(response.data.id_Clients)
      } else {
        setClientSearchError("Cliente no encontrado con ese documento.")
      }
    } catch (error) {
      console.error("Error al buscar cliente:", error)
      setClientSearchError("Error al buscar cliente. Intente de nuevo.")
    } finally {
      setClientSearchLoading(false)
    }
  }, [clientDocument])

  // Función para obtener ventas activas del cliente
  const fetchClientActiveSales = async (clientId) => {
    setSalesLoading(true)
    try {
      const response = await axiosInstance.get("/api/Sale/GetAllSales")
      if (response.data && Array.isArray(response.data)) {
        const clientActiveSales = response.data.filter(
          (sale) => sale.id_Clients === clientId && (sale.status === "Activo" || sale.status === "Active")
        )
        setClientSales(clientActiveSales)

        if (clientActiveSales.length < 2) {
          setClientSearchError("Este cliente debe tener al menos 2 lotes activos para hacer un traslado.")
        }
      }
    } catch (error) {
      console.error("Error al cargar ventas del cliente:", error)
      setClientSearchError("Error al cargar las ventas del cliente.")
    } finally {
      setSalesLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }))
    }
  }

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!foundClient) newErrors.client = "Selecciona un cliente"
    if (!formData.idSalesOrigen) newErrors.idSalesOrigen = "Selecciona la venta de origen"
    if (!formData.idSalesDestino) newErrors.idSalesDestino = "Selecciona la venta destino"
    if (formData.idSalesOrigen === formData.idSalesDestino) 
      newErrors.idSalesDestino = "El lote origen y destino deben ser diferentes"
    if (!formData.type) newErrors.type = "Selecciona el tipo de traslado"

    if (formData.type === "Parcial") {
      if (!formData.amountTransferred) newErrors.amountTransferred = "Especifica el monto para traslados parciales"
      else if (parseFloat(formData.amountTransferred) <= 0) newErrors.amountTransferred = "El monto debe ser mayor a 0"

      const saleOrigen = clientSales.find(s => s.id_Sales == formData.idSalesOrigen)
      const maxAmount = saleOrigen?.total_raised || 0
      if (parseFloat(formData.amountTransferred) > maxAmount) {
        newErrors.amountTransferred = `El monto no puede exceder ${maxAmount}`
      }
    }

    if (formData.type === "Parcial" && !formData.accountingNote.trim()) {
      newErrors.accountingNote = "La nota contable es obligatoria en traslados parciales"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    try {
      const payload = {
        idSalesOrigen: parseInt(formData.idSalesOrigen),
        idSalesDestino: parseInt(formData.idSalesDestino),
        type: formData.type,
        amountTransferred: parseFloat(formData.amountTransferred) || 0,
        accountingNote: formData.accountingNote || "",
      }

      // ✅ LOGS DETALLADOS
      console.log("[FormTraslados] ===== ENVIANDO TRASLADO =====")
      console.log("[FormTraslados] idSalesOrigen:", formData.idSalesOrigen)
      console.log("[FormTraslados] idSalesDestino:", formData.idSalesDestino)
      console.log("[FormTraslados] type:", formData.type)
      console.log("[FormTraslados] amountTransferred (form):", formData.amountTransferred)
      console.log("[FormTraslados] accountingNote:", formData.accountingNote)

      if (formData.type === "Completo") {
        const saleOrigen = clientSales.find(s => s.id_Sales == formData.idSalesOrigen)
        payload.amountTransferred = saleOrigen?.total_raised || 0
        console.log("[FormTraslados] Tipo Completo - amountTransferred calculado:", payload.amountTransferred)
      }

      console.log("[FormTraslados] Payload final a enviar:", JSON.stringify(payload, null, 2))

      const response = await onSuccess(payload)
      console.log("[FormTraslados] Respuesta del servidor:", response)
      
      onClose()
      resetForm()
    } catch (error) {
      console.error("Error submitting form:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setClientDocument("")
    setFoundClient(null)
    setClientSales([])
    setFormData({ idSalesOrigen: "", idSalesDestino: "", type: "Completo", amountTransferred: "", accountingNote: "" })
    setErrors({})
  }

  const saleOrigen = clientSales.find(s => s.id_Sales == formData.idSalesOrigen)
  const maxAmount = saleOrigen?.total_raised || 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#947c4c]">Nuevo Traslado de Cartera</DialogTitle>
          <DialogDescription>Transfiere dinero entre lotes del mismo cliente</DialogDescription>
        </DialogHeader>

      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700 text-sm">{errors.general}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Búsqueda de Cliente */}
        <div className="space-y-2">
          <Label htmlFor="clientDocument" className="text-sm font-semibold">
            Buscar Cliente por Cédula <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              id="clientDocument"
              type="number"
              placeholder="Ingrese el número de cédula"
              value={clientDocument}
              onChange={(e) => setClientDocument(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearchClient()}
              disabled={clientSearchLoading}
              className={errors.client ? "border-red-500" : ""}
            />
            <Button
              type="button"
              onClick={handleSearchClient}
              disabled={clientSearchLoading || !clientDocument}
              className="bg-[#947c4c] hover:bg-[#7a6338] text-white"
            >
              {clientSearchLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          {clientSearchError && <p className="text-red-500 text-xs">{clientSearchError}</p>}
        </div>

        {/* Cliente Encontrado */}
        {foundClient && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-700 font-semibold">
              ✓ {foundClient.names} {foundClient.surnames}
            </p>
            <p className="text-green-600 text-sm">Cédula: {foundClient.document}</p>
          </div>
        )}

        {/* Ventas del Cliente */}
        {foundClient && clientSales.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="idSalesOrigen" className="text-sm font-semibold">
                  Lote Origen <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.idSalesOrigen} onValueChange={(value) => handleSelectChange("idSalesOrigen", value)}>
                  <SelectTrigger className={errors.idSalesOrigen ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecciona lote origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientSales.map((sale) => (
                      <SelectItem key={sale.id_Sales} value={sale.id_Sales.toString()}>
                        {sale.lot?.block}-{sale.lot?.lot_number} (${sale.total_raised?.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.idSalesOrigen && <p className="text-red-500 text-xs">{errors.idSalesOrigen}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="idSalesDestino" className="text-sm font-semibold">
                  Lote Destino <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.idSalesDestino} onValueChange={(value) => handleSelectChange("idSalesDestino", value)}>
                  <SelectTrigger className={errors.idSalesDestino ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecciona lote destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientSales
                      .filter(s => s.id_Sales != formData.idSalesOrigen)
                      .map((sale) => (
                        <SelectItem key={sale.id_Sales} value={sale.id_Sales.toString()}>
                          {sale.lot?.block}-{sale.lot?.lot_number}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.idSalesDestino && <p className="text-red-500 text-xs">{errors.idSalesDestino}</p>}
              </div>
            </div>

            {/* Tipo de Traslado */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-semibold">
                Tipo de Traslado <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
                <SelectTrigger className={errors.type ? "border-red-500" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Completo">Completo - Trasladar todo el dinero</SelectItem>
                  <SelectItem value="Parcial">Parcial - Especificar monto</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-red-500 text-xs">{errors.type}</p>}
            </div>

            {/* Monto (solo si es Parcial) */}
            {formData.type === "Parcial" && (
              <div className="space-y-2">
                <Label htmlFor="amountTransferred" className="text-sm font-semibold">
                  Monto a Trasladar <span className="text-red-500">*</span>
                  <span className="text-gray-500 text-xs ml-2">(Máximo disponible: ${maxAmount?.toLocaleString()})</span>
                </Label>
                <Input
                  id="amountTransferred"
                  name="amountTransferred"
                  type="number"
                  step="0.01"
                  min="0"
                  max={maxAmount}
                  placeholder="0.00"
                  value={formData.amountTransferred}
                  onChange={handleInputChange}
                  className={errors.amountTransferred ? "border-red-500" : ""}
                />
                {errors.amountTransferred && <p className="text-red-500 text-xs">{errors.amountTransferred}</p>}
              </div>
            )}

            {/* Nota Contable */}
            <div className="space-y-2">
              <Label htmlFor="accountingNote" className="text-sm font-semibold">
                Nota Contable / Descripción {formData.type === "Parcial" && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="accountingNote"
                name="accountingNote"
                placeholder="Especifica la razón o motivo del traslado..."
                value={formData.accountingNote}
                onChange={handleInputChange}
                className={`resize-none ${errors.accountingNote ? "border-red-500" : ""}`}
                rows={3}
              />
              {errors.accountingNote && <p className="text-red-500 text-xs">{errors.accountingNote}</p>}
            </div>
          </>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              onClose()
              resetForm()
            }} 
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-[#947c4c] hover:bg-[#7a6338] text-white"
            disabled={loading || !foundClient}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              "Crear Traslado"
            )}
          </Button>
        </div>
      </form>
    </DialogContent>
    </Dialog>
  )
}
