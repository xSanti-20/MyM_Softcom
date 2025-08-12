"use client"

import { useState, useCallback } from "react"
import axiosInstance from "@/lib/axiosInstance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, User, Loader2, ArrowRight, UserPlus, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"

function CesionForm({ refreshData, closeModal, showAlert }) {
  // Estados para búsqueda del cliente cedente
  const [cedenteDocument, setCedenteDocument] = useState("")
  const [foundCedente, setFoundCedente] = useState(null)
  const [cedenteSearchLoading, setCedenteSearchLoading] = useState(false)
  const [cedenteSearchError, setCedenteSearchError] = useState(null)
  const [cedenteSales, setCedenteSales] = useState([])
  const [selectedSale, setSelectedSale] = useState(null)

  // Estados para el nuevo cliente cesionario
  const [cesionarioData, setCesionarioData] = useState({
    names: "",
    surnames: "",
    document: "",
    phone: "",
    email: "",
  })

  // Estados para la cesión
  const [cesionData, setCesionData] = useState({
    reason: "",
    observations: "",
    created_by: "Usuario", // Puedes obtener esto del contexto de usuario
  })

  const [step, setStep] = useState(1) // 1: Buscar cedente, 2: Crear cesionario, 3: Confirmar cesión
  const [loading, setLoading] = useState(false)

  // Función para buscar cliente cedente por documento
  const handleSearchCedente = useCallback(async () => {
    if (!cedenteDocument) {
      setCedenteSearchError("Por favor, ingrese un número de documento.")
      setFoundCedente(null)
      setCedenteSales([])
      return
    }

    const parsedDocument = Number.parseInt(cedenteDocument, 10)
    if (isNaN(parsedDocument)) {
      setCedenteSearchError("El documento debe ser un número válido.")
      setFoundCedente(null)
      setCedenteSales([])
      return
    }

    setCedenteSearchLoading(true)
    setCedenteSearchError(null)
    setFoundCedente(null)
    setCedenteSales([])

    try {
      const response = await axiosInstance.get(`/api/Cesion/GetClientByDocument/${parsedDocument}`)
      if (response.status === 200 && response.data) {
        // La API devuelve los datos del cliente directamente
        const clientData = {
          names: response.data.nombre_Completo.split(" ")[0] || "",
          surnames: response.data.nombre_Completo.split(" ").slice(1).join(" ") || "",
          document: response.data.documento,
          phone: response.data.telefono,
          email: response.data.email,
          status: response.data.status,
        }
        setFoundCedente(clientData)

        // Verificar si tiene venta activa
        if (response.data.tiene_Venta_Activa && response.data.venta_Info) {
          const saleData = {
            id_Sales: response.data.venta_Info.id_Venta,
            lotInfo: response.data.venta_Info.lote,
            projectName: response.data.venta_Info.proyecto,
            total_value: response.data.venta_Info.valor_Total,
            total_debt: response.data.venta_Info.deuda_Pendiente,
            status: "Activa",
          }
          setCedenteSales([saleData])
        } else {
          setCedenteSales([])
          showAlert("warning", "El cliente no tiene ventas activas para ceder.")
        }
      } else {
        setCedenteSearchError("Cliente no encontrado con ese documento.")
        showAlert("error", "Cliente no encontrado con ese documento.")
      }
    } catch (error) {
      console.error("Error al buscar cliente:", error)
      setCedenteSearchError("Error al buscar cliente. Intente de nuevo.")
      showAlert("error", "Error al buscar cliente. Intente de nuevo.")
    } finally {
      setCedenteSearchLoading(false)
    }
  }, [cedenteDocument, showAlert])

  // Función para seleccionar una venta
  const handleSelectSale = (sale) => {
    setSelectedSale(sale)
    setStep(2)
  }

  // Función para manejar cambios en el formulario del cesionario
  const handleCesionarioChange = (e) => {
    const { name, value } = e.target
    setCesionarioData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Función para manejar cambios en los datos de cesión
  const handleCesionChange = (e) => {
    const { name, value } = e.target
    setCesionData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Función para procesar la cesión
  const handleProcessCesion = async () => {
    // Validar datos del cesionario
    const { names, surnames, document, phone, email } = cesionarioData
    if (!names || !surnames || !document) {
      showAlert("error", "Los campos nombres, apellidos y documento del cesionario son obligatorios.")
      return
    }

    // Validar datos de cesión
    if (!cesionData.reason) {
      showAlert("error", "El motivo de la cesión es obligatorio.")
      return
    }

    const cesionRequest = {
      nuevoCliente: {
        names: names.trim(),
        surnames: surnames.trim(),
        document: Number.parseInt(document, 10),
        phone: phone.trim() || null,
        email: email.trim() || null,
      },
      documentoCedente: foundCedente.document,
      motivoCesion: cesionData.reason.trim(),
      costoCesion: 0,
      observaciones: cesionData.observations.trim() || null,
      idUsuario: 1,
    }

    try {
      setLoading(true)
      const response = await axiosInstance.post("/api/Cesion/CreateCesion", cesionRequest)

      if (response.status === 200) {
        showAlert("success", "Cesión procesada exitosamente. El lote ha sido transferido al nuevo cliente.")

        // Resetear formulario
        setCedenteDocument("")
        setFoundCedente(null)
        setCedenteSales([])
        setSelectedSale(null)
        setCesionarioData({
          names: "",
          surnames: "",
          document: "",
          phone: "",
          email: "",
        })
        setCesionData({
          reason: "",
          observations: "",
          created_by: "Usuario",
        })
        setStep(1)

        if (typeof refreshData === "function") refreshData()
        if (closeModal) closeModal()
      }
    } catch (error) {
      console.error("Error al procesar cesión:", error)
      const errorMessage = error.response?.data?.message || "Error al procesar la cesión"
      showAlert("error", errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Nueva Cesión de Lote</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span className={`px-2 py-1 rounded ${step >= 1 ? "bg-blue-100 text-blue-800" : "bg-gray-100"}`}>
            1. Buscar Cliente
          </span>
          <ArrowRight className="w-4 h-4" />
          <span className={`px-2 py-1 rounded ${step >= 2 ? "bg-blue-100 text-blue-800" : "bg-gray-100"}`}>
            2. Nuevo Cliente
          </span>
          <ArrowRight className="w-4 h-4" />
          <span className={`px-2 py-1 rounded ${step >= 3 ? "bg-blue-100 text-blue-800" : "bg-gray-100"}`}>
            3. Confirmar
          </span>
        </div>
      </div>

      {/* Paso 1: Buscar Cliente Cedente */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Paso 1: Buscar Cliente Actual (Cedente)</h3>
            <p className="text-blue-700 text-sm">Ingrese el documento del cliente que desea ceder su lote.</p>
          </div>

          <div>
            <Label htmlFor="cedente_document" className="block text-sm font-medium text-gray-700 mb-1">
              Documento del Cliente Cedente *
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  id="cedente_document"
                  name="cedente_document"
                  placeholder="Documento del cliente que cede el lote"
                  value={cedenteDocument}
                  onChange={(e) => setCedenteDocument(e.target.value)}
                  required
                  className="w-full pr-10"
                  disabled={cedenteSearchLoading}
                />
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
              <Button
                type="button"
                onClick={handleSearchCedente}
                disabled={cedenteSearchLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {cedenteSearchLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                {cedenteSearchLoading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
            {cedenteSearchError && <p className="text-red-500 text-sm mt-1">{cedenteSearchError}</p>}
          </div>

          {/* Cliente encontrado */}
          {foundCedente && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">Cliente Encontrado:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p>
                    <strong>Nombre:</strong> {foundCedente.names} {foundCedente.surnames}
                  </p>
                  <p>
                    <strong>Documento:</strong> {foundCedente.document}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Teléfono:</strong> {foundCedente.phone || "N/A"}
                  </p>
                  <p>
                    <strong>Email:</strong> {foundCedente.email || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ventas del cliente */}
          {cedenteSales.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-4">Ventas Disponibles para Cesión:</h4>
              <div className="space-y-3">
                {cedenteSales.map((sale) => (
                  <div
                    key={sale.id_Sales}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectSale(sale)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            {sale.lotInfo}
                          </Badge>
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            {sale.projectName}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                          <p>
                            <strong>Valor Total:</strong>{" "}
                            {sale.total_value?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
                          </p>
                          <p>
                            <strong>Deuda:</strong>{" "}
                            {sale.total_debt?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
                          </p>
                          <p>
                            <strong>Estado:</strong> {sale.status}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        Seleccionar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paso 2: Crear Nuevo Cliente Cesionario */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Paso 2: Crear Nuevo Cliente (Cesionario)</h3>
            <p className="text-green-700 text-sm">Ingrese los datos del nuevo cliente que recibirá el lote.</p>
          </div>

          {/* Resumen de la venta seleccionada */}
          {selectedSale && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Lote a Transferir:</h4>
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  {selectedSale.lotInfo}
                </Badge>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {selectedSale.projectName}
                </Badge>
                <span className="text-blue-700">
                  Valor: {selectedSale.total_value?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">Información Personal</h4>

              <div>
                <Label htmlFor="names" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombres *
                </Label>
                <Input
                  type="text"
                  id="names"
                  name="names"
                  placeholder="Nombres del cesionario"
                  value={cesionarioData.names}
                  onChange={handleCesionarioChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="surnames" className="block text-sm font-medium text-gray-700 mb-1">
                  Apellidos *
                </Label>
                <Input
                  type="text"
                  id="surnames"
                  name="surnames"
                  placeholder="Apellidos del cesionario"
                  value={cesionarioData.surnames}
                  onChange={handleCesionarioChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="document" className="block text-sm font-medium text-gray-700 mb-1">
                  Documento *
                </Label>
                <Input
                  type="number"
                  id="document"
                  name="document"
                  placeholder="Número de documento"
                  value={cesionarioData.document}
                  onChange={handleCesionarioChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">Información de Contacto</h4>

              <div>
                <Label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </Label>
                <Input
                  type="text"
                  id="phone"
                  name="phone"
                  placeholder="Número de teléfono"
                  value={cesionarioData.phone}
                  onChange={handleCesionarioChange}
                />
              </div>

              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Correo electrónico"
                  value={cesionarioData.email}
                  onChange={handleCesionarioChange}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700">Detalles de la Cesión</h4>

            <div>
              <Label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                Motivo de la Cesión *
              </Label>
              <Textarea
                id="reason"
                name="reason"
                placeholder="Describa el motivo de la cesión..."
                value={cesionData.reason}
                onChange={handleCesionChange}
                required
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="observations" className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </Label>
              <Textarea
                id="observations"
                name="observations"
                placeholder="Observaciones adicionales (opcional)..."
                value={cesionData.observations}
                onChange={handleCesionChange}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t">
            <Button type="button" onClick={() => setStep(1)} variant="outline">
              Volver
            </Button>
            <Button type="button" onClick={() => setStep(3)} className="bg-green-600 hover:bg-green-700">
              <UserPlus className="mr-2 h-4 w-4" />
              Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Paso 3: Confirmar Cesión */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Paso 3: Confirmar Cesión</h3>
            <p className="text-yellow-700 text-sm">
              Revise los datos antes de procesar la cesión. Esta acción no se puede deshacer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cliente Cedente */}
            <div className="border border-red-200 bg-red-50 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-3">Cliente Cedente (Actual)</h4>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Nombre:</strong> {foundCedente?.names} {foundCedente?.surnames}
                </p>
                <p>
                  <strong>Documento:</strong> {foundCedente?.document}
                </p>
                <p>
                  <strong>Teléfono:</strong> {foundCedente?.phone || "N/A"}
                </p>
              </div>
            </div>

            {/* Cliente Cesionario */}
            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-3">Cliente Cesionario (Nuevo)</h4>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Nombre:</strong> {cesionarioData.names} {cesionarioData.surnames}
                </p>
                <p>
                  <strong>Documento:</strong> {cesionarioData.document}
                </p>
                <p>
                  <strong>Teléfono:</strong> {cesionarioData.phone || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Detalles del Lote */}
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-3">Lote a Transferir</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <p>
                <strong>Lote:</strong> {selectedSale?.lotInfo}
              </p>
              <p>
                <strong>Proyecto:</strong> {selectedSale?.projectName}
              </p>
              <p>
                <strong>Valor:</strong>{" "}
                {selectedSale?.total_value?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
              </p>
            </div>
          </div>

          {/* Detalles de la Cesión */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">Detalles de la Cesión</h4>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Motivo:</strong> {cesionData.reason}
              </p>
              {cesionData.observations && (
                <p>
                  <strong>Observaciones:</strong> {cesionData.observations}
                </p>
              )}
              <p>
                <strong>Procesado por:</strong> {cesionData.created_by}
              </p>
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t">
            <Button type="button" onClick={() => setStep(2)} variant="outline" disabled={loading}>
              Volver
            </Button>
            <Button
              type="button"
              onClick={handleProcessCesion}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Procesar Cesión
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Botón de cancelar siempre visible */}
      <div className="flex justify-end pt-4 border-t mt-6">
        <Button type="button" onClick={closeModal} variant="outline" disabled={loading}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

export default CesionForm
