"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import axiosInstance from "@/lib/axiosInstance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, DollarSign, Search, User, MapPin, Loader2, X, Building, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function RegisterSale({ refreshData, saleToEdit, onCancelEdit, closeModal, showAlert }) {
  const [formData, setFormData] = useState({
    sale_date: "",
    total_value: "",
    initial_payment: "",
    initial_payment_method: "Efectivo",
    id_Clients: "",
    id_Lots: "",
    id_Users: "",
    id_Plans: "",
    paymentPlanType: "automatic",
    houseInitialPercentage: "30",
    customQuotas: [],
  })

  const [customQuotaInput, setCustomQuotaInput] = useState({ quotaNumber: "", amount: "", dueDate: "" })
  
  // Ref para rastrear si ya se cargaron los datos de edición
  const editDataLoadedRef = useRef(false)
  
  // Ref para evitar limpiezas durante la carga inicial
  const isInitialLoadRef = useRef(false)

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

  // Función para calcular el valor de cuota correcto basado en el tipo de plan
  function calculateDisplayQuotaValue(sale) {
    if (!sale) return 0

    // Si es plan personalizado y tiene cuotas personalizadas
    if (sale.paymentPlanType === 'custom' && sale.customQuotasJson) {
      try {
        const customQuotas = JSON.parse(sale.customQuotasJson)
        if (Array.isArray(customQuotas) && customQuotas.length > 0) {
          // Calcular el promedio de las cuotas personalizadas
          const total = customQuotas.reduce((sum, quota) => sum + (parseFloat(quota.Amount) || 0), 0)
          return total / customQuotas.length
        }
      } catch (error) {
        console.error('Error parsing customQuotasJson:', error)
      }
    }

    // Para planes automáticos o sin datos personalizados, usar quota_value
    return sale.quota_value || 0
  }

  // Refs para debounce y manejo de clicks fuera
  const lotSearchDebounceRef = useRef(null)
  const lotSearchContainerRef = useRef(null)

  const addCustomQuota = () => {
    const quotaNumber = Number.parseInt(customQuotaInput.quotaNumber)
    const amount = Number.parseFloat(customQuotaInput.amount)
    const dueDate = customQuotaInput.dueDate

    if (!quotaNumber || !amount || quotaNumber <= 0 || amount <= 0) {
      showAlert("error", "Por favor ingrese un número de cuota y monto válidos.")
      return
    }

    if (!dueDate) {
      showAlert("error", "Por favor ingrese una fecha de vencimiento para la cuota.")
      return
    }

    // Check if quota number already exists
    if (formData.customQuotas.some((q) => q.quotaNumber === quotaNumber)) {
      showAlert("error", "Ya existe una cuota con ese número.")
      return
    }

    const newQuotas = [...formData.customQuotas, { quotaNumber, amount, dueDate }].sort((a, b) => a.quotaNumber - b.quotaNumber)

    setFormData((prev) => ({ ...prev, customQuotas: newQuotas }))
    setCustomQuotaInput({ quotaNumber: "", amount: "", dueDate: "" })
  }

  const removeCustomQuota = (quotaNumber) => {
    setFormData((prev) => ({
      ...prev,
      customQuotas: prev.customQuotas.filter((q) => q.quotaNumber !== quotaNumber),
    }))
  }

  const calculateTotals = () => {
    const totalValue = Number.parseFloat(formData.total_value) || 0
    const initialPayment = Number.parseFloat(formData.initial_payment) || 0

    switch (formData.paymentPlanType) {
      case "house":
        const housePercentage = Number.parseFloat(formData.houseInitialPercentage) || 30
        const houseInitialAmount = totalValue * (housePercentage / 100)
        const houseRemaining = houseInitialAmount - initialPayment
        return {
          baseAmount: houseInitialAmount,
          remainingAmount: houseRemaining,
          description: `${housePercentage}% del valor total`,
          totalDebt: houseRemaining,
        }
      case "custom":
        const customTotal = formData.customQuotas.reduce((sum, quota) => sum + quota.amount, 0)
        return {
          baseAmount: customTotal,
          remainingAmount: customTotal,
          description: `${formData.customQuotas.length} cuotas personalizadas`,
          totalDebt: customTotal,
        }
      case "automatic":
      default:
        const automaticRemaining = totalValue - initialPayment
        return {
          baseAmount: totalValue,
          remainingAmount: automaticRemaining,
          description: "Valor total menos separado",
          totalDebt: automaticRemaining,
        }
    }
  }

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
      console.log("🏗️ [PROJECTS] Iniciando carga de proyectos...")
      // Obtener todos los lotes para extraer los proyectos únicos
      const response = await axiosInstance.get("/api/Lot/GetAllLot")
      console.log("🏗️ [PROJECTS] Respuesta recibida:", response.status, "Lotes:", response.data?.length || 0)
      
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
        console.log("✅ [PROJECTS] Proyectos activos cargados:", activeProjects.length, activeProjects)
      }
    } catch (error) {
      console.error("❌ [PROJECTS] Error al cargar proyectos:", error)
      console.error("❌ [PROJECTS] Status:", error.response?.status)
      console.error("❌ [PROJECTS] Message:", error.response?.data?.message || error.response?.data)
      
      if (error.response?.status === 403) {
        showAlert("error", "No tiene permisos para cargar los proyectos. Contacte al administrador.")
      } else {
        showAlert("error", "No se pudieron cargar los proyectos.")
      }
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
    console.log("🗑️ [CLEAR LOT] Iniciando limpieza. isEditing:", isEditing, "editDataLoaded:", editDataLoadedRef.current, "isInitialLoad:", isInitialLoadRef.current)
    
    // No limpiar durante la carga inicial en modo edición
    if (isEditing && isInitialLoadRef.current) {
      console.log("⏸️ [CLEAR LOT] Carga inicial en progreso, cancelando limpieza")
      return
    }
    
    console.log("✅ [CLEAR LOT] Procediendo con limpieza")
    setSelectedLot(null)
    setFormData((prev) => ({ ...prev, id_Lots: "" }))
    setLotSearchTerm("")
    setLotSearchResults([])
    setShowLotResults(false)
    setLotSearchError(null)
  }

  // Función para manejar cambio de proyecto
  const handleProjectChange = (projectId) => {
    console.log("🔄 [PROJECT CHANGE] Cambio de proyecto solicitado:", projectId, "anterior:", selectedProject, "isEditing:", isEditing, "isInitialLoad:", isInitialLoadRef.current)
    
    // Ignorar cambios a undefined o vacío durante la carga inicial
    if (!projectId && isInitialLoadRef.current) {
      console.log("⏸️ [PROJECT CHANGE] Ignorando cambio a vacío durante carga inicial")
      return
    }
    
    // Si es carga inicial y en modo edición, solo actualizar el proyecto sin limpiar
    if (isEditing && isInitialLoadRef.current) {
      console.log("⏩ [PROJECT CHANGE] Carga inicial - Solo actualizando proyecto, NO limpiando lote")
      setSelectedProject(projectId)
      return
    }
    
    const previousProject = selectedProject
    
    // Actualizar el proyecto
    setSelectedProject(projectId)
    
    // Solo limpiar si el proyecto cambió realmente y no es la primera vez que se establece
    if (previousProject && projectId !== previousProject) {
      console.log("🗑️ [PROJECT CHANGE] Usuario cambió proyecto de", previousProject, "a", projectId, "- limpiando lote")
      handleClearLotSelection()
    } else if (!projectId && previousProject) {
      console.log("🗑️ [PROJECT CHANGE] Proyecto deseleccionado, limpiando lote")
      handleClearLotSelection()
    } else {
      console.log("✅ [PROJECT CHANGE] Proyecto establecido sin limpiar lote")
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    async function fetchDataForSelects() {
      try {
        const [usersRes, plansRes] = await Promise.all([
          axiosInstance.get("/api/User/ConsultAllUser"),
          axiosInstance.get("/api/Plan/GetAllPlans"),
        ])

        console.log("📊 [FORM INIT] Usuarios recibidos:", usersRes.data?.length || 0)
        console.log("📊 [FORM INIT] Planes recibidos:", plansRes.data?.length || 0)

        setUsers(usersRes.data.filter((user) => user.status !== "Inactivo"))
        setPlans(plansRes.data)

        // NO establecer fecha actual automáticamente
        // Dejar que el usuario seleccione la fecha que desee
      } catch (error) {
        console.error("❌ [FORM INIT] Error al cargar datos para los selectores:", error)
        console.error("❌ [FORM INIT] Status:", error.response?.status)
        console.error("❌ [FORM INIT] Message:", error.response?.data?.message)
        
        // Si es un error de permisos, mostrar un mensaje más específico
        if (error.response?.status === 403) {
          showAlert("error", "No tiene permisos para cargar la lista de usuarios. Contacte al administrador.")
        } else {
          showAlert("error", "No se pudieron cargar las opciones necesarias para el formulario de ventas.")
        }
      }
    }

    fetchDataForSelects()
    fetchProjects()
  }, [showAlert, fetchProjects])

  // Resetear flag cuando cambia la venta a editar o se cancela la edición
  useEffect(() => {
    if (!isEditing || !saleToEdit) {
      editDataLoadedRef.current = false
      isInitialLoadRef.current = false
    }
  }, [isEditing, saleToEdit])

  // Poblar formulario para edición
  useEffect(() => {
    // ⚠️ IMPORTANTE: Solo cargar si no se ha cargado antes
    // Ya no requerimos que users y plans estén cargados para poblar el formulario
    if (isEditing && saleToEdit && !editDataLoadedRef.current) {
      console.log("🔧 [EDIT MODE] Cargando datos de venta:", saleToEdit)
      console.log("🔧 [EDIT MODE] Users disponibles:", users.length)
      console.log("🔧 [EDIT MODE] Plans disponibles:", plans.length)
      
      // ✅ IMPORTANTE: Marcar como cargado INMEDIATAMENTE para evitar re-ejecuciones
      editDataLoadedRef.current = true
      isInitialLoadRef.current = true // Activar protección de carga inicial
      
      // Desactivar protección después de 2 segundos (tiempo suficiente para completar la carga)
      setTimeout(() => {
        isInitialLoadRef.current = false
        console.log("⏰ [EDIT MODE] Protección de carga inicial desactivada")
      }, 2000)
      
      let customQuotas = []
      if (saleToEdit.customQuotasJson) {
        try {
          const parsed = JSON.parse(saleToEdit.customQuotasJson)
          console.log("📋 [EDIT MODE] Raw customQuotasJson:", saleToEdit.customQuotasJson)
          console.log("📋 [EDIT MODE] Parsed custom quotas:", parsed)
          
          // 🔧 SOLUCIÓN: Generar fechas automáticamente cuando falten
          const saleDate = new Date(saleToEdit.sale_date)
          
          customQuotas = parsed.map((q, index) => {
            const quotaNumber = q.QuotaNumber || q.quotaNumber
            const amount = q.Amount || q.amount
            let dueDate = q.DueDate || q.dueDate || ""
            
            // Si no hay fecha, generarla automáticamente
            if (!dueDate) {
              const monthsToAdd = quotaNumber
              const targetDate = new Date(saleDate)
              targetDate.setMonth(saleDate.getMonth() + monthsToAdd)
              
              // Ajustar al último día del mes si es necesario
              const targetDay = saleDate.getDate()
              const maxDayInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate()
              targetDate.setDate(Math.min(targetDay, maxDayInMonth))
              
              dueDate = targetDate.toISOString().split('T')[0]
              
              if (index < 3) {
                console.warn(`🔧 [EDIT MODE] Cuota #${quotaNumber} generando fecha automáticamente: ${dueDate}`)
              }
            }
            
            return {
              quotaNumber,
              amount,
              dueDate
            }
          })
          
          console.log("📅 [EDIT MODE] Mapped custom quotas with dates:", customQuotas.slice(0, 5))
          
          const quotasWithoutDate = customQuotas.filter(q => !q.dueDate)
          if (quotasWithoutDate.length > 0) {
            console.error(`❌ [EDIT MODE] ${quotasWithoutDate.length} cuotas aún sin fecha de ${customQuotas.length} totales`)
          } else {
            console.log(`✅ [EDIT MODE] Todas las ${customQuotas.length} cuotas tienen fecha asignada`)
          }
          
          // Informar al usuario si se generaron fechas automáticamente
          const hadMissingDates = parsed.some(q => !(q.DueDate || q.dueDate))
          if (hadMissingDates) {
            console.warn(`⚠️ [BACKEND ISSUE] Esta venta fue creada sin fechas. Se generaron automáticamente. Guarda la venta para actualizarlas en el backend.`)
          }
        } catch (e) {
          console.error("❌ [EDIT MODE] Error parsing custom quotas:", e)
        }
      }

      const editFormData = {
        sale_date: saleToEdit.sale_date ? new Date(saleToEdit.sale_date).toISOString().split("T")[0] : "",
        total_value: saleToEdit.total_value?.toString() || "",
        initial_payment: saleToEdit.initial_payment?.toString() || "",
        initial_payment_method: saleToEdit.initial_payment_method || "Efectivo",
        id_Clients: saleToEdit.id_Clients?.toString() || "",
        id_Lots: saleToEdit.id_Lots?.toString() || "",  // ✅ Ya incluido aquí
        id_Users: saleToEdit.id_Users?.toString() || "",
        id_Plans: saleToEdit.id_Plans?.toString() || "",
        paymentPlanType: saleToEdit.paymentPlanType?.toLowerCase() || "automatic",
        houseInitialPercentage: saleToEdit.houseInitialPercentage?.toString() || "30",
        customQuotas: customQuotas,
      }
      
      console.log("📝 [EDIT MODE] Datos del formulario a establecer:", editFormData)
      
      // ✅ IMPORTANTE: Establecer PRIMERO el formData completo
      setFormData(editFormData)

      // Cargar cliente para edición
      if (saleToEdit.id_Clients) {
        // Primero intentar usar los datos del cliente si ya vienen en saleToEdit
        if (saleToEdit.client) {
          console.log("👤 [EDIT MODE] Usando datos de cliente de saleToEdit:", saleToEdit.client)
          setFoundClient(saleToEdit.client)
          setClientDocument(saleToEdit.client.document?.toString() || "")
        } else {
          console.log("👤 [EDIT MODE] Cargando datos de cliente desde API...")
          // Si no vienen, hacer la petición al backend
          const fetchClientForEdit = async () => {
            try {
              const response = await axiosInstance.get(`/api/Client/${saleToEdit.id_Clients}`)
              if (response.status === 200 && response.data) {
                console.log("✅ [EDIT MODE] Cliente cargado exitosamente:", response.data)
                setFoundClient(response.data)
                setClientDocument(response.data.document?.toString() || "")
              }
            } catch (error) {
              console.error("❌ [EDIT MODE] Error al cargar cliente para edición:", error)
              console.error("❌ [EDIT MODE] Status:", error.response?.status)
              setClientSearchError("No se pudo cargar el cliente asociado a esta venta.")
            }
          }
          fetchClientForEdit()
        }
      }

      // Cargar lote y proyecto para edición
      if (saleToEdit.lot) {
        console.log("🏗️ [EDIT MODE] Cargando lote y proyecto:", saleToEdit.lot)
        const projectId = saleToEdit.lot.project?.id_Projects?.toString() || ""
        const projectName = saleToEdit.lot.project?.name || "Proyecto desconocido"
        const lotSearchValue = `${saleToEdit.lot.block}-${saleToEdit.lot.lot_number}`
        
        console.log("📍 [EDIT MODE] ID del proyecto:", projectId, "Nombre:", projectName)
        console.log("📍 [EDIT MODE] Lote a establecer:", lotSearchValue)
        console.log("📍 [EDIT MODE] Proyectos disponibles en este momento:", projects.length)
        
        // PRIMERO: Asegurarse de que el proyecto esté en la lista
        if (projectId && saleToEdit.lot.project) {
          setProjects(prevProjects => {
            const projectExists = prevProjects.some(p => p.id_Projects.toString() === projectId)
            
            if (!projectExists) {
              console.log("⚠️ [EDIT MODE] Proyecto no está en la lista, agregándolo:", projectName)
              return [...prevProjects, {
                id_Projects: saleToEdit.lot.project.id_Projects,
                name: saleToEdit.lot.project.name,
                status: saleToEdit.lot.project.status || "Activo"
              }]
            }
            
            console.log("✅ [EDIT MODE] Proyecto ya está en la lista")
            return prevProjects
          })
        }
        
        // SEGUNDO: Establecer los estados de proyecto y lote
        setSelectedProject(projectId)
        setSelectedLot(saleToEdit.lot)
        setLotSearchTerm(lotSearchValue)
        
        console.log("✅ [EDIT MODE] Estados de lote establecidos:")
        console.log("   - selectedProject:", projectId)
        console.log("   - selectedLot.id_Lots:", saleToEdit.lot.id_Lots)
        console.log("   - lotSearchTerm:", lotSearchValue)
        console.log("   - formData.id_Lots ya establecido en:", saleToEdit.id_Lots)
      } else {
        console.warn("⚠️ [EDIT MODE] No hay información de lote en saleToEdit")
      }
    }
    // ✅ NOTA: El reset del formulario ahora solo ocurre después de guardar exitosamente o cancelar edición
  }, [saleToEdit, isEditing])

  // useEffect para debuggear cambios en lotSearchTerm y selectedLot
  useEffect(() => {
    if (isEditing && saleToEdit) {
      console.log("🔍 [DEBUG LOT] Cambio detectado:")
      console.log("   - lotSearchTerm:", lotSearchTerm)
      console.log("   - selectedLot:", selectedLot?.id_Lots || "null")
      console.log("   - selectedProject:", selectedProject)
      console.log("   - formData.id_Lots:", formData.id_Lots)
    }
  }, [lotSearchTerm, selectedLot, selectedProject, formData.id_Lots, isEditing, saleToEdit])

  // useEffect guardián: Si estamos editando y el lote se pierde, restaurarlo
  useEffect(() => {
    // Solo actuar si NO estamos en carga inicial
    if (isEditing && saleToEdit?.lot && editDataLoadedRef.current && !isInitialLoadRef.current && !selectedLot && formData.id_Lots) {
      console.warn("🔧 [GUARDIAN LOT] Detectado lote perdido después de carga inicial, restaurando...")
      console.log("   - saleToEdit.lot:", saleToEdit.lot)
      console.log("   - formData.id_Lots:", formData.id_Lots)
      
      setSelectedLot(saleToEdit.lot)
      setLotSearchTerm(`${saleToEdit.lot.block}-${saleToEdit.lot.lot_number}`)
      setSelectedProject(saleToEdit.lot.project?.id_Projects?.toString() || "")
      
      console.log("✅ [GUARDIAN LOT] Lote restaurado")
    }
  }, [isEditing, saleToEdit, selectedLot, formData.id_Lots, selectedProject])

  // useEffect guardián para el proyecto: asegurarse de que no se pierda durante renders
  useEffect(() => {
    if (isEditing && saleToEdit?.lot?.project && editDataLoadedRef.current && !selectedProject && formData.id_Lots) {
      const correctProjectId = saleToEdit.lot.project.id_Projects?.toString() || ""
      if (correctProjectId) {
        console.warn("🔧 [GUARDIAN PROJECT] Detectado proyecto perdido, restaurando...")
        console.log("   - Proyecto correcto:", correctProjectId, saleToEdit.lot.project.name)
        setSelectedProject(correctProjectId)
        console.log("✅ [GUARDIAN PROJECT] Proyecto restaurado")
      }
    }
  }, [isEditing, saleToEdit, selectedProject, formData.id_Lots])

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

  // Función mejorada para cancelar edición
  const handleCancelEdit = () => {
    console.log("❌ [CANCEL] Cancelando edición")
    
    // Resetear el flag de carga de datos de edición
    editDataLoadedRef.current = false
    isInitialLoadRef.current = false
    
    // Limpiar todos los estados del formulario
    setFormData({
      sale_date: "",
      total_value: "",
      initial_payment: "",
      initial_payment_method: "Efectivo",
      id_Clients: "",
      id_Lots: "",
      id_Users: "",
      id_Plans: "",
      paymentPlanType: "automatic",
      houseInitialPercentage: "30",
      customQuotas: [],
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
    
    // Llamar a la función de cancelación del padre
    if (onCancelEdit) onCancelEdit()
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const { sale_date, total_value, initial_payment, id_Clients, id_Lots, id_Users, id_Plans, paymentPlanType } =
      formData

    if (!sale_date || !total_value || !initial_payment || !id_Clients || !id_Lots || !id_Users || !id_Plans) {
      showAlert("error", "Todos los campos obligatorios deben ser completados.")
      return
    }

    if (!selectedProject) {
      showAlert("error", "Debe seleccionar un proyecto.")
      return
    }

    if (paymentPlanType === "custom" && formData.customQuotas.length === 0) {
      showAlert("error", "Debe agregar al menos una cuota personalizada.")
      return
    }

    // Validar que todas las cuotas personalizadas tengan fecha de vencimiento
    if (paymentPlanType === "custom") {
      const quotasWithoutDate = formData.customQuotas.filter(q => !q.dueDate || q.dueDate === "")
      if (quotasWithoutDate.length > 0) {
        showAlert("error", `Las siguientes cuotas no tienen fecha de vencimiento: ${quotasWithoutDate.map(q => q.quotaNumber).join(', ')}. Por favor, asigne fechas a todas las cuotas.`)
        return
      }
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
      sale_date: sale_date, // Enviar la fecha tal cual está en el input (YYYY-MM-DD)
      total_value: parsedTotalValue,
      initial_payment: parsedInitialPayment,
      initial_payment_method: formData.initial_payment_method,
      id_Clients: Number.parseInt(id_Clients, 10),
      id_Lots: Number.parseInt(id_Lots, 10),
      id_Users: Number.parseInt(id_Users, 10),
      id_Plans: Number.parseInt(id_Plans, 10),
      paymentPlanType: paymentPlanType,
      customQuotasJson:
        paymentPlanType === "custom"
          ? JSON.stringify(
            formData.customQuotas.map((q) => ({
              QuotaNumber: q.quotaNumber,
              Amount: q.amount,
              DueDate: q.dueDate, // ← NUEVO: Incluir fecha de vencimiento
            })),
          )
          : null,
      houseInitialPercentage: paymentPlanType === "house" ? Number.parseFloat(formData.houseInitialPercentage) : null,
      houseInitialAmount:
        paymentPlanType === "house"
          ? parsedTotalValue * (Number.parseFloat(formData.houseInitialPercentage) / 100)
          : null,
    }

    console.log("📅 Fecha que se envía al backend:", sale_date)
    console.log("📦 Body completo que se envía:", body)

    if (!isEditing) {
      body.status = "Active" // Valor por defecto para ventas nuevas
    } else {
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

      console.log("[v0] Datos que se envían al backend:", body)
      console.log("[v0] Respuesta del servidor:", response.data)

      const successMessage =
        response.data?.message || (isEditing ? "Venta actualizada con éxito." : "Venta registrada con éxito.")

      showAlert("success", successMessage)

      // Resetear el flag de edición después de guardar
      editDataLoadedRef.current = false
      isInitialLoadRef.current = false

      if (!isEditing || closeModal) {
        setFormData({
          sale_date: "", // Dejar vacío para que el usuario seleccione la fecha
          total_value: "",
          initial_payment: "",
          initial_payment_method: "Efectivo",
          id_Clients: "",
          id_Lots: "",
          id_Users: "",
          id_Plans: "",
          paymentPlanType: "automatic",
          houseInitialPercentage: "30",
          customQuotas: [],
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

  const totals = calculateTotals()

  const [batchQuotaInput, setBatchQuotaInput] = useState({
    startQuota: "",
    endQuota: "",
    amount: "",
    startDate: "",
    intervalMonths: "1",
  })
  const [quotaInputMode, setQuotaInputMode] = useState("individual") // "individual" or "batch"

  const addBatchQuotas = () => {
    const startQuota = Number.parseInt(batchQuotaInput.startQuota)
    const endQuota = Number.parseInt(batchQuotaInput.endQuota)
    const amount = Number.parseFloat(batchQuotaInput.amount)
    const startDate = batchQuotaInput.startDate
    const intervalMonths = Number.parseInt(batchQuotaInput.intervalMonths) || 1

    if (!startQuota || !endQuota || !amount || startQuota <= 0 || endQuota <= 0 || amount <= 0) {
      showAlert("error", "Por favor ingrese valores válidos para el rango de cuotas y monto.")
      return
    }

    if (!startDate) {
      showAlert("error", "Por favor ingrese la fecha de vencimiento de la primera cuota.")
      return
    }

    if (startQuota > endQuota) {
      showAlert("error", "El número de cuota inicial debe ser menor o igual al final.")
      return
    }

    // Check for existing quotas in the range
    const existingQuotas = formData.customQuotas.filter((q) => q.quotaNumber >= startQuota && q.quotaNumber <= endQuota)

    if (existingQuotas.length > 0) {
      showAlert("error", `Ya existen cuotas en el rango ${startQuota}-${endQuota}.`)
      return
    }

    // Create batch quotas with calculated dates
    const newQuotas = []
    // ✅ Parsear la fecha correctamente sin problemas de zona horaria
    const [yearBase, monthBase, dayBase] = startDate.split('-').map(Number)
    const baseDate = new Date(yearBase, monthBase - 1, dayBase) // Crear fecha local
    const dayOfMonth = dayBase // ✅ Usar directamente el día del string
    
    for (let i = startQuota; i <= endQuota; i++) {
      // Calcular el mes de destino (meses desde la fecha base)
      const monthsToAdd = (i - startQuota) * intervalMonths
      const targetMonth = baseDate.getMonth() + monthsToAdd
      const targetYear = baseDate.getFullYear() + Math.floor(targetMonth / 12)
      const adjustedMonth = ((targetMonth % 12) + 12) % 12 // Asegurar que esté entre 0-11
      
      // ✅ Obtener el último día del mes de destino ANTES de crear la fecha
      const maxDayInMonth = new Date(targetYear, adjustedMonth + 1, 0).getDate()
      
      // Crear la fecha directamente con el día correcto
      const finalDay = Math.min(dayOfMonth, maxDayInMonth)
      const quotaDate = new Date(targetYear, adjustedMonth, finalDay)
      
      newQuotas.push({ 
        quotaNumber: i, 
        amount,
        dueDate: quotaDate.toISOString().split('T')[0]
      })
    }

    const allQuotas = [...formData.customQuotas, ...newQuotas].sort((a, b) => a.quotaNumber - b.quotaNumber)

    setFormData((prev) => ({ ...prev, customQuotas: allQuotas }))
    setBatchQuotaInput({ startQuota: "", endQuota: "", amount: "", startDate: "", intervalMonths: "1" })

    showAlert("success", `Se agregaron ${newQuotas.length} cuotas del ${startQuota} al ${endQuota}.`)
  }

  // Debug: Log cuando se renderiza
  console.log("🎨 [RENDER] Estado actual del formulario:", {
    isEditing,
    formData,
    usersLoaded: users.length,
    plansLoaded: plans.length,
    selectedProject,
    selectedLot
  })

  return (
    <div className="max-w-full mx-auto p-6 bg-white rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{isEditing ? "Editar Venta" : "Registrar Nueva Venta"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Detalles de la Venta */}
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
              Valor Cuota Inicial *
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

          {/* Método de Pago de Cuota Inicial */}
          <div>
            <Label htmlFor="initial_payment_method" className="block text-sm font-medium text-gray-700 mb-1">
              Método de Pago de Cuota Inicial *
            </Label>
            <Select
              name="initial_payment_method"
              value={formData.initial_payment_method}
              onValueChange={(value) => handleSelectChange("initial_payment_method", value)}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona el método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Banco Ahorros">Banco Ahorros</SelectItem>
                <SelectItem value="Banco Corriente">Banco Corriente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Plan de Pago *</Label>
            <RadioGroup
              value={formData.paymentPlanType}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentPlanType: value }))}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="automatic" id="automatic" />
                <Label htmlFor="automatic" className="text-sm">
                  Automático (fórmula estándar)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="text-sm">
                  Personalizado (cuotas definidas)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="house" id="house" />
                <Label htmlFor="house" className="text-sm">
                  Para casas (30% inicial)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {formData.paymentPlanType === "house" && (
            <div>
              <Label htmlFor="houseInitialPercentage" className="block text-sm font-medium text-gray-700 mb-1">
                Porcentaje Inicial para Casas (%)
              </Label>
              <Input
                type="number"
                id="houseInitialPercentage"
                name="houseInitialPercentage"
                value={formData.houseInitialPercentage}
                onChange={handleChange}
                min="1"
                max="100"
                step="0.1"
                className="w-full"
              />
            </div>
          )}

        </div>

        {/* Asociaciones */}
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
              <Select 
                key={`project-${isEditing ? saleToEdit?.id_Sales : 'new'}-${selectedProject}`}
                name="project" 
                value={selectedProject || undefined}
                onValueChange={handleProjectChange} 
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue 
                    placeholder={
                      isEditing && saleToEdit?.lot?.project?.name
                        ? saleToEdit.lot.project.name
                        : "Selecciona un proyecto"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {projects.length > 0 ? (
                    projects.map((project) => (
                      <SelectItem key={project.id_Projects} value={project.id_Projects.toString()}>
                        {project.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">Cargando proyectos...</div>
                  )}
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
                placeholder={
                  isEditing && saleToEdit?.lot 
                    ? `${saleToEdit.lot.block}-${saleToEdit.lot.lot_number}` 
                    : selectedProject 
                      ? "Ej: A-28, A28, B-5..." 
                      : "Primero seleccione un proyecto"
                }
                value={lotSearchTerm}
                onChange={(e) => {
                  console.log("🔍 [LOT SEARCH] Valor cambiado a:", e.target.value)
                  setLotSearchTerm(e.target.value)
                  if (!e.target.value.trim()) {
                    handleClearLotSelection()
                  }
                }}
                onFocus={() => {
                  console.log("👁️ [LOT SEARCH] Input enfocado. lotSearchTerm:", lotSearchTerm, "selectedLot:", selectedLot?.id_Lots)
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
                <p className="text-xs mt-1 text-green-600">
                  ✓ ID del Lote: {selectedLot.id_Lots}
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
                <SelectValue 
                  placeholder={
                    isEditing && saleToEdit?.user?.nom_Users 
                      ? saleToEdit.user.nom_Users 
                      : "Selecciona un usuario"
                  } 
                />
              </SelectTrigger>
              <SelectContent>
                {users.length > 0 ? (
                  users.map((user) => (
                    <SelectItem key={user.id_Users} value={user.id_Users.toString()}>
                      {user.nom_Users}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-500">Cargando usuarios...</div>
                )}
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
                <SelectValue 
                  placeholder={
                    isEditing && saleToEdit?.plan?.name 
                      ? saleToEdit.plan.name 
                      : "Selecciona un plan"
                  } 
                />
              </SelectTrigger>
              <SelectContent>
                {plans.length > 0 ? (
                  plans.map((plan) => (
                    <SelectItem key={plan.id_Plans} value={plan.id_Plans.toString()}>
                      {plan.name} ({plan.number_quotas} cuotas)
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-500">Cargando planes...</div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resumen de Pago */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Resumen de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Tipo de Plan</span>
                    <div className="font-semibold text-blue-700">
                      {formData.paymentPlanType === "automatic"
                        ? "Automático"
                        : formData.paymentPlanType === "custom"
                          ? "Personalizado"
                          : "Para Casas"}
                    </div>
                  </div>
                  {formData.paymentPlanType === "custom" && (
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Cuotas</span>
                      <div className="font-semibold text-blue-700">{formData.customQuotas.length}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-600 text-xs block">Base</span>
                  <span className="font-medium">{totals.description}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-600 text-xs block">Monto Base</span>
                  <span className="font-medium">${totals.baseAmount.toLocaleString('es-CO')}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-600 text-xs block">Deuda Total</span>
                  <span className="font-medium">${totals.totalDebt.toLocaleString('es-CO')}</span>
                </div>
                <div className="bg-green-50 p-2 rounded border border-green-200">
                  <span className="text-green-600 text-xs block">Cuota Inicial</span>
                  <span className="font-semibold text-green-700">${(Number.parseFloat(formData.initial_payment) || 0).toLocaleString('es-CO')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Plan */}
        {formData.paymentPlanType === "custom" ? (
          <Card className="h-fit border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Cuotas Personalizadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
                <Button
                  type="button"
                  variant={quotaInputMode === "individual" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setQuotaInputMode("individual")}
                  className={`flex-1 ${quotaInputMode === "individual" ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
                >
                  📝 Individual
                </Button>
                <Button
                  type="button"
                  variant={quotaInputMode === "batch" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setQuotaInputMode("batch")}
                  className={`flex-1 ${quotaInputMode === "batch" ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
                >
                  📦 En Lote
                </Button>
              </div>

              {quotaInputMode === "individual" && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Agregar Cuota Individual</h4>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-2">
                      <label className="text-xs text-gray-600 mb-1 block"># Cuota</label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={customQuotaInput.quotaNumber}
                        onChange={(e) => setCustomQuotaInput((prev) => ({ ...prev, quotaNumber: e.target.value }))}
                        className="text-center"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs text-gray-600 mb-1 block">Valor</label>
                      <Input
                        type="number"
                        placeholder="1000000"
                        value={customQuotaInput.amount}
                        onChange={(e) => setCustomQuotaInput((prev) => ({ ...prev, amount: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-5">
                      <label className="text-xs text-gray-600 mb-1 block">📅 Fecha Vencimiento</label>
                      <Input
                        type="date"
                        value={customQuotaInput.dueDate}
                        onChange={(e) => setCustomQuotaInput((prev) => ({ ...prev, dueDate: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button type="button" onClick={addCustomQuota} size="sm" className="bg-blue-600 hover:bg-blue-700 w-full">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {quotaInputMode === "batch" && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 space-y-3">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Agregar Cuotas en Lote</h4>
                  <div className="grid grid-cols-5 gap-2">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Desde cuota #</label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={batchQuotaInput.startQuota}
                        onChange={(e) => setBatchQuotaInput((prev) => ({ ...prev, startQuota: e.target.value }))}
                        className="text-center"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Hasta cuota #</label>
                      <Input
                        type="number"
                        placeholder="35"
                        value={batchQuotaInput.endQuota}
                        onChange={(e) => setBatchQuotaInput((prev) => ({ ...prev, endQuota: e.target.value }))}
                        className="text-center"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Valor por cuota</label>
                      <Input
                        type="number"
                        placeholder="1000000"
                        value={batchQuotaInput.amount}
                        onChange={(e) => setBatchQuotaInput((prev) => ({ ...prev, amount: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">📅 1ra Fecha</label>
                      <Input
                        type="date"
                        value={batchQuotaInput.startDate}
                        onChange={(e) => setBatchQuotaInput((prev) => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Cada X meses</label>
                      <Input
                        type="number"
                        placeholder="1"
                        min="1"
                        value={batchQuotaInput.intervalMonths}
                        onChange={(e) => setBatchQuotaInput((prev) => ({ ...prev, intervalMonths: e.target.value }))}
                        className="text-center"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-green-700">
                      💡 Ejemplo: Cuotas 1-7 cada 4 meses, luego 8-9 cada 2 meses
                    </p>
                    <Button type="button" onClick={addBatchQuotas} size="sm" className="bg-green-600 hover:bg-green-700">
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar Lote
                    </Button>
                  </div>
                </div>
              )}

              <div className="max-h-80 overflow-y-auto border rounded-lg bg-gray-50">
                {formData.customQuotas.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-gray-400 mb-2">
                      <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">No hay cuotas agregadas</p>
                  </div>
                ) : (
                  <div className="p-2">
                    <div className="bg-white rounded border mb-2 p-2">
                      <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium">
                        <span className="col-span-2">CUOTA</span>
                        <span className="col-span-4">VALOR</span>
                        <span className="col-span-5">FECHA VENC.</span>
                        <span className="col-span-1"></span>
                      </div>
                    </div>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {formData.customQuotas.map((quota) => (
                        <div
                          key={quota.quotaNumber}
                          className="grid grid-cols-12 gap-2 items-center p-2 bg-white border border-gray-100 rounded hover:border-green-300 hover:shadow-sm transition-all"
                        >
                          <div className="col-span-2 flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                              {quota.quotaNumber}
                            </div>
                          </div>
                          <span className="col-span-4 text-sm font-medium text-gray-700">
                            ${quota.amount.toLocaleString('es-CO')}
                          </span>
                          <span className="col-span-5 text-sm">
                            {quota.dueDate ? (() => {
                              const [year, month, day] = quota.dueDate.split('-').map(Number)
                              const localDate = new Date(year, month - 1, day)
                              return (
                                <span className="text-gray-700">
                                  {localDate.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                              )
                            })() : (
                              <span className="text-red-600 font-medium flex items-center gap-1">
                                ⚠️ Sin fecha
                              </span>
                            )}
                          </span>
                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCustomQuota(quota.quotaNumber)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 w-6 h-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {formData.customQuotas.length > 0 && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-center">
                        <span className="text-green-700 font-medium">
                          {formData.customQuotas.length} cuotas configuradas
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-fit border-l-4 border-l-gray-400">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                Configuración de Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">
                  {formData.paymentPlanType === "automatic"
                    ? "Plan automático configurado"
                    : "Plan de casa (30% inicial) configurado"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Las cuotas se calculan automáticamente
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campos de solo lectura para edición */}
        {
          isEditing && saleToEdit && (
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
                      calculateDisplayQuotaValue(saleToEdit)?.toLocaleString("es-CO", { style: "currency", currency: "COP" }) || "N/A"
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
          )
        }

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button type="button" onClick={handleCancelEdit} variant="outline" disabled={loading}>
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
