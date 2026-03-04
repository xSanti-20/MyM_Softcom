"use client"

import { useState, useCallback } from "react"
import axiosInstance from "@/lib/axiosInstance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, User, Loader2, ArrowRight, UserPlus, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function CesionForm({ refreshData, closeModal, showAlert }) {
  // Estados para búsqueda del cliente cedente
  const [cedenteDocument, setCedenteDocument] = useState("")
  const [foundCedente, setFoundCedente] = useState(null)
  const [cedenteSearchLoading, setCedenteSearchLoading] = useState(false)
  const [cedenteSearchError, setCedenteSearchError] = useState(null)
  const [cedenteSales, setCedenteSales] = useState([])
  const [selectedSale, setSelectedSale] = useState(null)

  // Estados para el tipo de cesionario (nuevo o existente)
  const [cesionarioType, setCesionarioType] = useState("new") // "new" o "existing"
  
  // Estados para el nuevo cliente cesionario
  const [cesionarioData, setCesionarioData] = useState({
    names: "",
    surnames: "",
    document: "",
    phone: "",
    email: "",
  })

  // Estados para buscar cliente cesionario existente
  const [cesionarioExistingDocument, setCesionarioExistingDocument] = useState("")
  const [foundCesionario, setFoundCesionario] = useState(null)
  const [cesionarioSearchLoading, setCesionarioSearchLoading] = useState(false)
  const [cesionarioSearchError, setCesionarioSearchError] = useState(null)

  // Estados para la cesión
  const [cesionData, setCesionData] = useState({
    reason: "",
    observations: "",
    created_by: "Usuario",
  })

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // ✅ CORREGIDO: Función para buscar cliente cedente con camelCase correcto
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
    setSelectedSale(null)

    try {
      const response = await axiosInstance.get(`/api/Cesion/GetClientByDocument/${parsedDocument}`)
      if (response.status === 200 && response.data) {
        console.log("Response data:", response.data) // Para debug

        // ✅ CORREGIDO: Usar camelCase correcto según la respuesta del backend
        const clientData = {
          id_Clients: response.data.id_Cliente, // camelCase
          names: response.data.nombre_Completo ? response.data.nombre_Completo.split(" ")[0] || "" : "",
          surnames: response.data.nombre_Completo
            ? response.data.nombre_Completo.split(" ").slice(1).join(" ") || ""
            : "",
          document: response.data.documento,
          phone: response.data.telefono,
          email: response.data.email,
          status: response.data.status,
        }
        setFoundCedente(clientData)

        // ✅ CORREGIDO: Usar camelCase correcto para las ventas
        if (response.data.tiene_Ventas_Activas && response.data.ventas_Info && response.data.ventas_Info.length > 0) {
          const salesData = response.data.ventas_Info.map((venta) => ({
            id_Sales: venta.id_Venta,
            lotInfo: venta.lote,
            projectName: venta.proyecto,
            total_value: venta.valor_Total,
            total_raised: venta.valor_Pagado,
            total_debt: venta.deuda_Pendiente,
            fecha_venta: venta.fecha_Venta,
            status: "Activa",
          }))
          setCedenteSales(salesData)

          if (salesData.length > 1) {
            showAlert("info", `El cliente tiene ${salesData.length} ventas activas. Seleccione cuál desea ceder.`)
          }
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

  // Función para buscar cliente cesionario existente
  const handleSearchCesionario = useCallback(async () => {
    if (!cesionarioExistingDocument) {
      setCesionarioSearchError("Por favor, ingrese un número de documento.")
      setFoundCesionario(null)
      return
    }

    const parsedDocument = Number.parseInt(cesionarioExistingDocument, 10)
    if (isNaN(parsedDocument)) {
      setCesionarioSearchError("El documento debe ser un número válido.")
      setFoundCesionario(null)
      return
    }

    // Validar que no sea el mismo cliente cedente
    if (foundCedente && parsedDocument === foundCedente.document) {
      setCesionarioSearchError("El cesionario no puede ser el mismo que el cedente.")
      showAlert("error", "El cesionario no puede ser el mismo que el cedente.")
      return
    }

    setCesionarioSearchLoading(true)
    setCesionarioSearchError(null)
    setFoundCesionario(null)

    try {
      const response = await axiosInstance.get(`/api/Client/GetByDocument/${parsedDocument}`)
      if (response.status === 200 && response.data) {
        setFoundCesionario(response.data)
        showAlert("success", "Cliente encontrado exitosamente.")
      }
    } catch (error) {
      console.error("Error al buscar cliente cesionario:", error)
      if (error.response?.status === 404) {
        setCesionarioSearchError("Cliente no encontrado. Puede crear uno nuevo.")
        showAlert("warning", "Cliente no encontrado. Puede crear uno nuevo cambiando a 'Crear Nuevo Cliente'.")
      } else {
        setCesionarioSearchError("Error al buscar cliente. Intente de nuevo.")
        showAlert("error", "Error al buscar cliente. Intente de nuevo.")
      }
    } finally {
      setCesionarioSearchLoading(false)
    }
  }, [cesionarioExistingDocument, foundCedente, showAlert])

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
    // Validar que se haya seleccionado una venta
    if (!selectedSale) {
      showAlert("error", "Debe seleccionar una venta para ceder.")
      return
    }

    // Validar datos de cesión
    if (!cesionData.reason) {
      showAlert("error", "El motivo de la cesión es obligatorio.")
      return
    }

    let cesionRequest

    // Si es cliente nuevo
    if (cesionarioType === "new") {
      const { names, surnames, document, phone, email } = cesionarioData
      if (!names || !surnames || !document) {
        showAlert("error", "Los campos nombres, apellidos y documento del cesionario son obligatorios.")
        return
      }

      cesionRequest = {
        nuevoCliente: {
          names: names.trim(),
          surnames: surnames.trim(),
          document: Number.parseInt(document, 10),
          phone: phone.trim() || null,
          email: email.trim() || null,
        },
        documentoCedente: foundCedente.document,
        idVentaACeder: selectedSale.id_Sales,
        motivoCesion: cesionData.reason.trim(),
        costoCesion: 0,
        observaciones: cesionData.observations.trim() || null,
        idUsuario: 1,
      }
    } 
    // Si es cliente existente
    else if (cesionarioType === "existing") {
      if (!foundCesionario) {
        showAlert("error", "Debe buscar y seleccionar un cliente existente.")
        return
      }

      // El backend siempre requiere nuevoCliente, pero detectará que ya existe por el documento
      cesionRequest = {
        nuevoCliente: {
          names: foundCesionario.names,
          surnames: foundCesionario.surnames,
          document: foundCesionario.document,
          phone: foundCesionario.phone || null,
          email: foundCesionario.email || null,
        },
        documentoCedente: foundCedente.document,
        idVentaACeder: selectedSale.id_Sales,
        motivoCesion: cesionData.reason.trim(),
        costoCesion: 0,
        observaciones: cesionData.observations.trim() || null,
        idUsuario: 1,
      }
    }

    console.log("📤 Cesión Request:", cesionRequest)

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
        setCesionarioType("new")
        setCesionarioData({
          names: "",
          surnames: "",
          document: "",
          phone: "",
          email: "",
        })
        setCesionarioExistingDocument("")
        setFoundCesionario(null)
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
      console.error("❌ Error al procesar cesión:", error)
      console.error("📥 Response data:", error.response?.data)
      console.error("📥 Response status:", error.response?.status)
      console.error("📥 Full error response:", error.response)
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.response?.data || 
                          "Error al procesar la cesión"
      showAlert("error", `Error: ${JSON.stringify(errorMessage)}`)
    } finally {
      setLoading(false)
    }
  }

  // Función para formatear moneda
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "N/A"
    const num = Number.parseFloat(value)
    if (isNaN(num)) return "N/A"

    if (num % 1 === 0) {
      return num.toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    }
    return num.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
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

          {/* ✅ MODIFICADO: Ventas del cliente en Select */}
          {cedenteSales.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3">
                Seleccionar Venta para Cesión ({cedenteSales.length} disponibles):
              </h4>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="sale_select" className="block text-sm font-medium text-gray-700 mb-2">
                    Venta a Ceder *
                  </Label>
                  <Select
                    name="sale_select"
                    value={selectedSale?.id_Sales?.toString() || ""}
                    onValueChange={(value) => {
                      const sale = cedenteSales.find((s) => s.id_Sales.toString() === value)
                      setSelectedSale(sale)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccione la venta que desea ceder" />
                    </SelectTrigger>
                    <SelectContent>
                      {cedenteSales.map((sale) => (
                        <SelectItem key={sale.id_Sales} value={sale.id_Sales.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              Venta #{sale.id_Sales} - {sale.lotInfo} ({sale.projectName})
                            </span>
                            <span className="text-xs text-gray-500">
                              Valor: {formatCurrency(sale.total_value)} | Pagado: {formatCurrency(sale.total_raised)} |
                              Deuda: {formatCurrency(sale.total_debt)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Detalles de la venta seleccionada */}
                {selectedSale && (
                  <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
                    <h5 className="font-semibold text-blue-800 mb-2">Detalles de la Venta Seleccionada:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <p>
                          <strong>ID Venta:</strong> #{selectedSale.id_Sales}
                        </p>
                        <p>
                          <strong>Lote:</strong> {selectedSale.lotInfo}
                        </p>
                        <p>
                          <strong>Proyecto:</strong> {selectedSale.projectName}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p>
                          <strong>Valor Total:</strong> {formatCurrency(selectedSale.total_value)}
                        </p>
                        <p>
                          <strong>Valor Pagado:</strong> {formatCurrency(selectedSale.total_raised)}
                        </p>
                        <p>
                          <strong>Deuda Pendiente:</strong> {formatCurrency(selectedSale.total_debt)}
                        </p>
                      </div>
                      {selectedSale.fecha_venta && (
                        <p className="col-span-full text-xs text-gray-600">
                          <strong>Fecha de venta:</strong> {new Date(selectedSale.fecha_venta).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Botón para continuar */}
                {selectedSale && (
                  <div className="flex justify-end">
                    <Button type="button" onClick={() => setStep(2)} className="bg-blue-600 hover:bg-blue-700">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Continuar con esta venta
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paso 2: Crear Nuevo Cliente Cesionario O Seleccionar Existente */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Paso 2: Cliente Cesionario</h3>
            <p className="text-green-700 text-sm">Seleccione si desea crear un nuevo cliente o elegir uno existente.</p>
          </div>

          {/* Resumen de la venta seleccionada */}
          {selectedSale && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Lote a Transferir:</h4>
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  Venta #{selectedSale.id_Sales}
                </Badge>
                <Badge variant="outline" className="bg-purple-100 text-purple-800">
                  {selectedSale.lotInfo}
                </Badge>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {selectedSale.projectName}
                </Badge>
                <span className="text-blue-700">Valor: {formatCurrency(selectedSale.total_value)}</span>
                <span className="text-blue-700">Deuda: {formatCurrency(selectedSale.total_debt)}</span>
              </div>
            </div>
          )}

          {/* Selector de tipo de cesionario */}
          <div className="border border-gray-200 rounded-lg p-4">
            <Label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Cliente Cesionario *
            </Label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="cesionarioType"
                  value="new"
                  checked={cesionarioType === "new"}
                  onChange={(e) => {
                    setCesionarioType(e.target.value)
                    setFoundCesionario(null)
                    setCesionarioExistingDocument("")
                    setCesionarioSearchError(null)
                  }}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Crear Nuevo Cliente</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="cesionarioType"
                  value="existing"
                  checked={cesionarioType === "existing"}
                  onChange={(e) => {
                    setCesionarioType(e.target.value)
                    setCesionarioData({
                      names: "",
                      surnames: "",
                      document: "",
                      phone: "",
                      email: "",
                    })
                  }}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Seleccionar Cliente Existente</span>
              </label>
            </div>
          </div>

          {/* Formulario para NUEVO cliente */}
          {cesionarioType === "new" && (
            <>
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
            </>
          )}

          {/* Formulario para CLIENTE EXISTENTE */}
          {cesionarioType === "existing" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="cesionario_document" className="block text-sm font-medium text-gray-700 mb-1">
                  Documento del Cliente Cesionario *
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      id="cesionario_document"
                      name="cesionario_document"
                      placeholder="Documento del cliente que recibirá el lote"
                      value={cesionarioExistingDocument}
                      onChange={(e) => setCesionarioExistingDocument(e.target.value)}
                      required
                      className="w-full pr-10"
                      disabled={cesionarioSearchLoading}
                    />
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSearchCesionario}
                    disabled={cesionarioSearchLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {cesionarioSearchLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    {cesionarioSearchLoading ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
                {cesionarioSearchError && <p className="text-red-500 text-sm mt-1">{cesionarioSearchError}</p>}
              </div>

              {/* Cliente encontrado */}
              {foundCesionario && (
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Cliente Encontrado:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p>
                        <strong>Nombre:</strong> {foundCesionario.names} {foundCesionario.surnames}
                      </p>
                      <p>
                        <strong>Documento:</strong> {foundCesionario.document}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Teléfono:</strong> {foundCesionario.phone || "N/A"}
                      </p>
                      <p>
                        <strong>Email:</strong> {foundCesionario.email || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
            <Button
              type="button"
              onClick={() => {
                // Validar antes de continuar
                if (cesionarioType === "existing" && !foundCesionario) {
                  showAlert("error", "Debe buscar y seleccionar un cliente existente antes de continuar.")
                  return
                }
                if (cesionarioType === "new") {
                  const { names, surnames, document } = cesionarioData
                  if (!names || !surnames || !document) {
                    showAlert("error", "Complete los campos obligatorios del nuevo cliente.")
                    return
                  }
                }
                setStep(3)
              }}
              className="bg-green-600 hover:bg-green-700"
            >
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
              <h4 className="font-semibold text-green-800 mb-3">
                Cliente Cesionario {cesionarioType === "new" ? "(Nuevo)" : "(Existente)"}
              </h4>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Nombre:</strong>{" "}
                  {cesionarioType === "new"
                    ? `${cesionarioData.names} ${cesionarioData.surnames}`
                    : `${foundCesionario?.names} ${foundCesionario?.surnames}`}
                </p>
                <p>
                  <strong>Documento:</strong>{" "}
                  {cesionarioType === "new" ? cesionarioData.document : foundCesionario?.document}
                </p>
                <p>
                  <strong>Teléfono:</strong>{" "}
                  {cesionarioType === "new"
                    ? cesionarioData.phone || "N/A"
                    : foundCesionario?.phone || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Detalles del Lote */}
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-3">Lote a Transferir</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <p>
                <strong>Venta ID:</strong> #{selectedSale?.id_Sales}
              </p>
              <p>
                <strong>Lote:</strong> {selectedSale?.lotInfo}
              </p>
              <p>
                <strong>Proyecto:</strong> {selectedSale?.projectName}
              </p>
              <p>
                <strong>Valor:</strong> {formatCurrency(selectedSale?.total_value)}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
              <p>
                <strong>Valor Pagado:</strong> {formatCurrency(selectedSale?.total_raised)}
              </p>
              <p>
                <strong>Deuda Pendiente:</strong> {formatCurrency(selectedSale?.total_debt)}
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
