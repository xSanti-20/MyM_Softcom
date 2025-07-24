"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import axiosInstance from "@/lib/axiosInstance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, DollarSign, Search, User, MapPin, Loader2, X, Building } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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

  // Estados para búsqueda de cliente
  const [clientDocument, setClientDocument] = useState("")
  const [foundClient, setFoundClient] = useState(null)
  const [clientSearchLoading, setClientSearchLoading] = useState(false)
  const [clientSearchError, setClientSearchError] = useState(null)

  // Estados para proyectos y lotes
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState("")
  const [lotSearchTerm, setLotSearchTerm] = useState("")
  const [lotSearchResults, setLotSearchResults] = useState([])
  const [lotSearchLoading, setLotSearchLoading] = useState(false)
  const [lotSearchError, setLotSearchError] = useState(null)
  const [selectedLot, setSelectedLot] = useState(null)
  const [showLotResults, setShowLotResults] = useState(false)

  const [users, setUsers] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const isEditing = !!saleToEdit

  // Refs para debounce y manejo de clicks fuera
  const lotSearchDebounceRef = useRef(null)
  const lotSearchContainerRef = useRef(null)

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

  // Función para cargar proyectos
  const fetchProjects = useCallback(async () => {
    try {
      // Obtener todos los lotes para extraer los proyectos únicos
      const response = await axiosInstance.get("/api/Lot/GetAllLot")
      if (response.data && Array.isArray(response.data)) {
        // Extraer proyectos únicos de los lotes
        const uniqueProjects = []
        const projectIds = new Set()

        response.data.forEach((lot) => {
          if (lot.project && !projectIds.has(lot.project.id_Projects)) {
            projectIds.add(lot.project.id_Projects)
            uniqueProjects.push({
              id_Projects: lot.project.id_Projects,
              name: lot.project.name,
              status: lot.project.status || "Activo",
            })
          }
        })

        // Filtrar solo proyectos activos
        const activeProjects = uniqueProjects.filter(
          (project) => project.status === "Activo" || project.status === "Active",
        )

        setProjects(activeProjects)
        console.log("Proyectos cargados:", activeProjects)
      }
    } catch (error) {
      console.error("Error al cargar proyectos:", error)
      showAlert("error", "No se pudieron cargar los proyectos.")
    }
  }, [showAlert])

  // Función mejorada para filtrar lotes localmente
  const filterLotsLocally = (lots, searchTerm) => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return lots
    }

    const term = searchTerm.trim().toUpperCase()

    return lots.filter((lot) => {
      const lotBlock = (lot.block || "").toUpperCase()
      const lotNumber = (lot.lot_number || "").toString()
      const fullLotName = `${lotBlock}-${lotNumber}`
      const compactLotName = `${lotBlock}${lotNumber}`

      // Búsqueda más precisa
      return (
        // Coincidencia exacta con el bloque
        lotBlock === term ||
        // Coincidencia exacta con el número
        lotNumber === term ||
        // Coincidencia con formato completo (A-28)
        fullLotName === term ||
        // Coincidencia con formato compacto (A28)
        compactLotName === term ||
        // Coincidencia que empiece con el término (para búsquedas parciales)
        lotBlock.startsWith(term) ||
        fullLotName.startsWith(term) ||
        compactLotName.startsWith(term)
      )
    })
  }

  // Función para buscar lotes por proyecto usando tus endpoints
  const searchLotsByProject = useCallback(
    async (projectId, searchTerm) => {
      if (!projectId) {
        setLotSearchResults([])
        setShowLotResults(false)
        setLotSearchError("Primero seleccione un proyecto.")
        return
      }

      setLotSearchLoading(true)
      setLotSearchError(null)

      try {
        // Siempre obtener todos los lotes del proyecto
        const response = await axiosInstance.get(`/api/Lot/GetLotsByProject/${projectId}`)
        const allLots = response.data || []

        // Filtrar solo lotes disponibles (excepto en edición)
        const availableLots = allLots.filter((lot) => {
          const isAvailable =
            lot.status === "Libre" ||
            lot.status === "Disponible" ||
            (isEditing && lot.id_Lots === Number.parseInt(formData.id_Lots))
          return isAvailable
        })

        // Aplicar filtro de búsqueda localmente
        const filteredLots = filterLotsLocally(availableLots, searchTerm)

        setLotSearchResults(filteredLots)
        setShowLotResults(true)

        if (filteredLots.length === 0 && searchTerm && searchTerm.trim().length > 0) {
          setLotSearchError(
            `No se encontraron lotes disponibles que coincidan con "${searchTerm}" en el proyecto seleccionado.`,
          )
        } else if (availableLots.length === 0) {
          setLotSearchError("No hay lotes disponibles en el proyecto seleccionado.")
        }
      } catch (error) {
        console.error("Error al buscar lotes:", error)
        setLotSearchError("Error al buscar lotes. Intente de nuevo.")
        setLotSearchResults([])
      } finally {
        setLotSearchLoading(false)
      }
    },
    [formData.id_Lots, isEditing],
  )

  // Debounce para búsqueda de lotes
  useEffect(() => {
    if (lotSearchDebounceRef.current) {
      clearTimeout(lotSearchDebounceRef.current)
    }

    lotSearchDebounceRef.current = setTimeout(() => {
      if (selectedProject) {
        searchLotsByProject(selectedProject, lotSearchTerm)
      }
    }, 300)

    return () => {
      if (lotSearchDebounceRef.current) {
        clearTimeout(lotSearchDebounceRef.current)
      }
    }
  }, [lotSearchTerm, selectedProject, searchLotsByProject])

  // Manejar clicks fuera del contenedor de búsqueda de lotes
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (lotSearchContainerRef.current && !lotSearchContainerRef.current.contains(event.target)) {
        setShowLotResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Función para seleccionar un lote
  const handleSelectLot = (lot) => {
    setSelectedLot(lot)
    setFormData((prev) => ({ ...prev, id_Lots: lot.id_Lots.toString() }))
    setLotSearchTerm(`${lot.block}-${lot.lot_number}`)
    setShowLotResults(false)
    // Limpiar error al seleccionar un lote
    setLotSearchError(null)
  }

  // Función para limpiar selección de lote
  const handleClearLotSelection = () => {
    setSelectedLot(null)
    setFormData((prev) => ({ ...prev, id_Lots: "" }))
    setLotSearchTerm("")
    setLotSearchResults([])
    setShowLotResults(false)
    setLotSearchError(null)
  }

  // Función para manejar cambio de proyecto
  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId)
    // Limpiar selección de lote al cambiar proyecto
    handleClearLotSelection()
  }

  // Cargar datos iniciales
  useEffect(() => {
    async function fetchDataForSelects() {
      try {
        const [usersRes, plansRes] = await Promise.all([
          axiosInstance.get("/api/User/ConsultAllUser"),
          axiosInstance.get("/api/Plan/GetAllPlans"),
        ])

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
    fetchProjects()
  }, [isEditing, showAlert, fetchProjects])

  // Poblar formulario para edición
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

      // Cargar cliente para edición
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

      // Cargar lote y proyecto para edición
      if (saleToEdit.lot) {
        setSelectedLot(saleToEdit.lot)
        setSelectedProject(saleToEdit.lot.project?.id_Projects?.toString() || "")
        setLotSearchTerm(`${saleToEdit.lot.block}-${saleToEdit.lot.lot_number}`)
      }
    } else {
      // Resetear estados
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
      setSelectedProject("")
      setLotSearchTerm("")
      setSelectedLot(null)
      setLotSearchResults([])
      setShowLotResults(false)
      setLotSearchError(null)
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

    if (!selectedProject) {
      showAlert("error", "Debe seleccionar un proyecto.")
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
        setSelectedProject("")
        setLotSearchTerm("")
        setSelectedLot(null)
        setLotSearchResults([])
        setShowLotResults(false)
        setLotSearchError(null)
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

            {/* Selección de Proyecto */}
            <div>
              <Label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">
                Proyecto *
              </Label>
              <div className="relative">
                <Select name="project" value={selectedProject} onValueChange={handleProjectChange} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id_Projects} value={project.id_Projects.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Building
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>
            </div>

            {/* Búsqueda de Lotes Mejorada */}
            <div ref={lotSearchContainerRef} className="relative">
              <Label htmlFor="lot_search" className="block text-sm font-medium text-gray-700 mb-1">
                Buscar Lote *
              </Label>
              <div className="text-xs text-gray-500 mb-2">Formatos válidos: A-28, A28, B-5, B5, etc.</div>
              <div className="relative">
                <Input
                  type="text"
                  id="lot_search"
                  name="lot_search"
                  placeholder={selectedProject ? "Ej: A-28, A28, B-5..." : "Primero seleccione un proyecto"}
                  value={lotSearchTerm}
                  onChange={(e) => {
                    setLotSearchTerm(e.target.value)
                    if (!e.target.value.trim()) {
                      handleClearLotSelection()
                    }
                  }}
                  onFocus={() => {
                    if (lotSearchResults.length > 0) {
                      setShowLotResults(true)
                    }
                  }}
                  className="w-full pr-20"
                  required
                  disabled={!selectedProject}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {lotSearchLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                  {selectedLot && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearLotSelection}
                      className="h-6 w-6 p-0 hover:bg-gray-100"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  <MapPin className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Resultados de búsqueda de lotes - UI mejorada */}
              {showLotResults && lotSearchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  <div className="sticky top-0 bg-gray-50 px-3 py-2 text-xs text-gray-600 border-b">
                    {lotSearchResults.length} lote{lotSearchResults.length !== 1 ? "s" : ""} encontrado
                    {lotSearchResults.length !== 1 ? "s" : ""}
                  </div>
                  {lotSearchResults.map((lot) => (
                    <div
                      key={lot.id_Lots}
                      onClick={() => handleSelectLot(lot)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {lot.block || lot.manzana}-{lot.lot_number || lot.numero}
                          </p>
                          <p className="text-sm text-gray-600">
                            {lot.price?.toLocaleString("es-CO", {
                              style: "currency",
                              currency: "COP",
                              minimumFractionDigits: 0,
                            })}
                          </p>
                        </div>
                        <Badge
                          variant={lot.status === "Libre" || lot.status === "Disponible" ? "default" : "secondary"}
                          className="ml-2 shrink-0"
                        >
                          {lot.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error de búsqueda de lotes - Solo mostrar si no hay lote seleccionado */}
              {lotSearchError && !selectedLot && <p className="text-red-500 text-sm mt-1">{lotSearchError}</p>}

              {/* Lote seleccionado */}
              {selectedLot && (
                <div className="mt-2 p-3 border border-green-200 bg-green-50 rounded-md text-sm text-green-800">
                  <p className="font-semibold">Lote Seleccionado:</p>
                  <p>
                    <strong>Lote:</strong> {selectedLot.block || selectedLot.manzana}-
                    {selectedLot.lot_number || selectedLot.numero}
                  </p>
                  <p>
                    <strong>Proyecto:</strong> {selectedLot.project?.name || "N/A"}
                  </p>
                </div>
              )}

              {/* Mensaje cuando no hay proyecto seleccionado */}
              {!selectedProject && (
                <p className="text-amber-600 text-sm mt-1">⚠️ Seleccione primero un proyecto para buscar lotes</p>
              )}
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

        {/* Campos de solo lectura para edición */}
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
          <Button type="submit" disabled={loading || !selectedProject} className="bg-blue-600 hover:bg-blue-700">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Actualizando..." : "Registrando..."}
              </>
            ) : isEditing ? (
              "Actualizar"
            ) : (
              "Registrar"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default RegisterSale
