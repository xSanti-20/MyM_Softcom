"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import axiosInstance from "@/lib/axiosInstance"
import RegisterPayment from "./formpagos"
import AlertModal from "@/components/AlertModal"
import Image from 'next/image';
import DataTable from "@/components/utils/DataTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Filter, Plus, Trash2, CheckSquare, Square } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

function Payments() {
  const TitlePage = "Pagos"
  const [paymentData, setPaymentData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [paymentDateFrom, setPaymentDateFrom] = useState("")
  const [paymentDateTo, setPaymentDateTo] = useState("")
  const [paymentAmountFilter, setPaymentAmountFilter] = useState("")
  const [methodFilter, setMethodFilter] = useState("all")
  const [selectedPayments, setSelectedPayments] = useState([]) // ← NUEVO: IDs de pagos seleccionados
  const [isDeleting, setIsDeleting] = useState(false) // ← NUEVO: Estado de eliminación masiva
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesPayments = ["ID", "Monto", "Fecha de Pago", "Método de Pago", "Cliente", "Documento", "Lote", "Proyecto"]
  const [paymentStats, setPaymentStats] = useState([])

  const showAlert = (type, message, onSuccessCallback = null) => {
    setAlertInfo({
      isOpen: true,
      message,
      type,
      onSuccessCallback,
    })
  }

  const closeAlert = () => {
    const callback = alertInfo.onSuccessCallback
    setAlertInfo({
      isOpen: false,
      message: "",
      type: "success",
      onSuccessCallback: null,
    })
    if (callback) callback()
  }

  const getProjectName = (payment) => {
    if (payment.sale?.lot?.project?.name) return payment.sale.lot.project.name
    if (payment.sale?.lot?.Project?.name) return payment.sale.lot.Project.name
    if (payment.sale?.Lot?.project?.name) return payment.sale.Lot.project.name
    if (payment.sale?.Lot?.Project?.name) return payment.sale.Lot.Project.name
    if (payment.sale?.lot?.project_name) return payment.sale.lot.project_name
    const projectId = payment.sale?.lot?.id_Projects || payment.sale?.lot?.project?.id_Projects
    if (projectId) return `Proyecto #${projectId}`
    return "Sin proyecto"
  }

  const getPaymentAmount = (payment) => Number(payment?.amount) || 0

  const getPaymentDateValue = (payment) => {
    if (!payment?.payment_date) return null
    const paymentDate = new Date(payment.payment_date)
    return Number.isNaN(paymentDate.getTime()) ? null : paymentDate
  }

  const normalizePaymentMethod = (method) =>
    method
      ?.toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim() || ""

  const fetchProjectsForFilter = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/api/Project/GetAllProjects")
      if (response.data && Array.isArray(response.data)) {
        const allProjects = response.data.map((project) => ({
          id_Projects: project.id_Projects,
          name: project.name,
          status: project.status || "Sin estado",
        }))
        setProjects(allProjects)
        return allProjects
      }
      return []
    } catch (error) {
      console.error("Error al cargar proyectos para el filtro:", error)
      showAlert("error", "No se pudieron cargar los proyectos para el filtro.")
      return []
    }
  }, [])

  const calculatePaymentStats = (payments, allProjects) => {
    // Obtener fecha actual
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    console.log("Mes actual:", currentMonth + 1, "Año:", currentYear)

    // Filtrar pagos del mes actual
    const currentMonthPayments = payments.filter((payment) => {
      if (!payment.payment_date) return false
      const paymentDate = new Date(payment.payment_date)
      const isCurrentMonth = paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear
      if (isCurrentMonth) {
        console.log("Pago del mes actual:", payment.payment_method, payment.amount)
      }
      return isCurrentMonth
    })

    console.log("Pagos del mes actual:", currentMonthPayments.length)

    // Inicializar estadísticas para todos los proyectos
    const statsByProject = {}
    allProjects.forEach((project) => {
      statsByProject[project.id_Projects] = {
        projectId: project.id_Projects,
        projectName: project.name,
        efectivo: 0,
        banco: 0,
        totalEfectivo: 0,
        totalBanco: 0,
      }
    })

    // Agrupar pagos por proyecto
    currentMonthPayments.forEach((payment) => {
      const projectId = 
        payment.sale?.lot?.project?.id_Projects ||
        payment.sale?.lot?.Project?.id_Projects ||
        payment.sale?.Lot?.project?.id_Projects ||
        payment.sale?.Lot?.Project?.id_Projects

      if (!projectId || !statsByProject[projectId]) {
        console.log("Proyecto no encontrado para pago:", payment.id_Payments)
        return
      }

      const method = payment.payment_method?.toLowerCase() || ''
      const amount = payment.amount || 0

      console.log("Método de pago:", method, "Monto:", amount)

      // Clasificar como efectivo: efectivo, cuota inicial (por defecto)
      if (method.includes('efectivo') || method.includes('cuota inicial') || method.includes('inicial')) {
        statsByProject[projectId].efectivo += 1
        statsByProject[projectId].totalEfectivo += amount
        console.log("✅ Efectivo agregado")
      } 
      // Clasificar como banco: banco, corriente, ahorro, transferencia
      else if (method.includes('banco') || method.includes('corriente') || method.includes('ahorro') || method.includes('transferencia')) {
        statsByProject[projectId].banco += 1
        statsByProject[projectId].totalBanco += amount
        console.log("✅ Banco agregado")
      } 
      // Si no coincide con ninguno, por defecto a efectivo
      else {
        console.log("⚠️ Método no reconocido, clasificando como efectivo:", method)
        statsByProject[projectId].efectivo += 1
        statsByProject[projectId].totalEfectivo += amount
      }
    })

    return Object.values(statsByProject)
  }

  const fetchPayments = useCallback(async (projectId = null, projectsList = null) => {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Payment/GetAllPayments")

      if (response.status === 200) {
        let filteredPayments = response.data

        if (projectId && projectId !== "all") {
          const targetProjectId = Number.parseInt(projectId, 10)
          filteredPayments = response.data.filter((payment) => {
            const paymentProjectId =
              payment.sale?.lot?.project?.id_Projects ||
              payment.sale?.lot?.Project?.id_Projects ||
              payment.sale?.lot?.id_Projects ||
              payment.sale?.Lot?.project?.id_Projects ||
              payment.sale?.Lot?.Project?.id_Projects
            return paymentProjectId === targetProjectId
          })
        }

        // Usar la lista de proyectos proporcionada o la del estado
        const projectsToUse = projectsList || projects
        console.log("Proyectos disponibles para estadísticas:", projectsToUse)

        // Calcular estadísticas de pagos del mes actual
        const stats = calculatePaymentStats(response.data, projectsToUse)
        setPaymentStats(stats)
        console.log("Estadísticas de pagos:", stats)

        const data = filteredPayments.map((payment) => {
          // ← CORREGIDO: Determinar si el pago puede ser eliminado
          // Un pago NO puede ser eliminado si es el pago INICIAL de la venta
          // (no si está asociado a Cuota #1, que es un mes después)
          // El pago inicial es: sale.initial_payment (enganche, p.ej. 20%)
          const isInitialPayment = payment.amount === payment.sale?.initial_payment
          
          return {
            id: payment.id_Payments,
            monto:
              payment.amount != null
                ? payment.amount.toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })
                : "Sin monto",
            fechaPago: payment.payment_date ? new Date(payment.payment_date).toLocaleDateString("es-CO") : "Sin fecha",
            metodoPago: payment.payment_method || "Sin método",
            cliente: payment.sale?.client
              ? `${payment.sale.client.names} ${payment.sale.client.surnames}`
              : "Sin cliente",
            documento: payment.sale?.client?.document || "Sin documento",
            lote: payment.sale?.lot ? `${payment.sale.lot.block}-${payment.sale.lot.lot_number}` : "Sin lote",
            proyecto: getProjectName(payment),
            original: payment,
            canDelete: !isInitialPayment, // ← NUEVO: Propiedad para controlar eliminación
            searchableIdentifier: `${payment.id_Payments} ${payment.sale?.client?.names} ${payment.sale?.client?.surnames} ${payment.sale?.lot?.block}-${payment.sale.lot?.lot_number} ${getProjectName(payment)} ${payment.payment_method}`,
          }
        })
        setPaymentData(data)
      }
    } catch (error) {
      console.error("Error al cargar pagos:", error)
      setError("No se pudieron cargar los datos de pagos.")
      showAlert("error", "No se pudieron cargar los datos de pagos.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleProjectFilterChange = (value) => {
    setSelectedProjectId(value)
    fetchPayments(value === "all" ? null : value, projects)
  }

  const clearPaymentFilters = () => {
    setSelectedProjectId("")
    setPaymentDateFrom("")
    setPaymentDateTo("")
    setPaymentAmountFilter("")
    setMethodFilter("all")
    fetchPayments(null, projects)
  }

  const filteredPaymentData = useMemo(() => {
    const exactAmount = paymentAmountFilter === "" ? null : Number(paymentAmountFilter)
    const fromDate = paymentDateFrom ? new Date(`${paymentDateFrom}T00:00:00`) : null
    const toDate = paymentDateTo ? new Date(`${paymentDateTo}T23:59:59.999`) : null

    return paymentData.filter((payment) => {
      const original = payment.original || {}
      const paymentAmount = getPaymentAmount(original)
      const paymentDate = getPaymentDateValue(original)
      const normalizedMethod = normalizePaymentMethod(original.payment_method)

      if (exactAmount !== null && !Number.isNaN(exactAmount) && paymentAmount !== exactAmount) return false
      if (fromDate && !paymentDate) return false
      if (toDate && !paymentDate) return false
      if (fromDate && paymentDate && paymentDate < fromDate) return false
      if (toDate && paymentDate && paymentDate > toDate) return false

      if (methodFilter !== "all") {
        if (methodFilter === "efectivo") {
          if (!normalizedMethod.includes("efectivo") && !normalizedMethod.includes("cuota inicial") && !normalizedMethod.includes("inicial")) {
            return false
          }
        }
        if (methodFilter === "banco") {
          if (!normalizedMethod.includes("banco") && !normalizedMethod.includes("corriente") && !normalizedMethod.includes("ahorro") && !normalizedMethod.includes("transferencia")) {
            return false
          }
        }
      }

      return true
    })
  }, [paymentData, paymentAmountFilter, paymentDateFrom, paymentDateTo, methodFilter])

  useEffect(() => {
    const loadData = async () => {
      const projectsList = await fetchProjectsForFilter()
      await fetchPayments(null, projectsList)
    }
    loadData()
  }, [])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      const response = await axiosInstance.delete(`/api/Payment/DeletePayment/${numericId}`)
      fetchPayments(selectedProjectId === "all" ? null : selectedProjectId, projects)
      showAlert("success", response.data?.message || "Pago eliminado y recaudo actualizado correctamente.")
    } catch (error) {
      console.error("Error al eliminar:", error)
      const errorMessage = error.response?.data?.message || "Error al eliminar el pago"
      showAlert("error", errorMessage)
    }
  }

  // ← NUEVO: Eliminar múltiples pagos seleccionados
  const handleBulkDelete = async () => {
    if (selectedPayments.length === 0) {
      showAlert("error", "No has seleccionado ningún pago para eliminar.")
      return
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar ${selectedPayments.length} pago(s) seleccionado(s)? Esta acción no se puede deshacer.`
    )

    if (!confirmDelete) return

    setIsDeleting(true)
    let successCount = 0
    let errorCount = 0
    const errors = []

    try {
      // Eliminar pagos uno por uno
      for (const paymentId of selectedPayments) {
        try {
          await axiosInstance.delete(`/api/Payment/DeletePayment/${paymentId}`)
          successCount++
        } catch (error) {
          console.error(`Error al eliminar pago ${paymentId}:`, error)
          errorCount++
          errors.push(`Pago #${paymentId}: ${error.response?.data?.message || error.message}`)
        }
      }

      // Limpiar selección
      setSelectedPayments([])

      // Recargar datos
      await fetchPayments(selectedProjectId === "all" ? null : selectedProjectId, projects)

      // Mostrar resultado
      if (errorCount === 0) {
        showAlert("success", `✅ ${successCount} pago(s) eliminado(s) correctamente.`)
      } else if (successCount === 0) {
        showAlert("error", `❌ No se pudo eliminar ningún pago.\n${errors.join("\n")}`)
      } else {
        showAlert(
          "warning",
          `⚠️ ${successCount} pago(s) eliminado(s), pero ${errorCount} fallaron.\n${errors.join("\n")}`
        )
      }
    } catch (error) {
      console.error("Error en eliminación masiva:", error)
      showAlert("error", "Error al procesar la eliminación masiva.")
    } finally {
      setIsDeleting(false)
    }
  }

  // ← NUEVO: Toggle selección de un pago
  const togglePaymentSelection = (paymentId) => {
    setSelectedPayments((prev) =>
      prev.includes(paymentId) ? prev.filter((id) => id !== paymentId) : [...prev, paymentId]
    )
  }

  // ← NUEVO: Seleccionar/Deseleccionar todos
  const toggleSelectAll = () => {
    if (selectedPayments.length === paymentData.length) {
      setSelectedPayments([])
    } else {
      setSelectedPayments(paymentData.map((payment) => payment.id))
    }
  }

  const handleUpdate = async (row) => {
    try {
      const paymentId = row.original.id_Payments
      const response = await axiosInstance.get(`/api/Payment/GetPaymentID/${paymentId}`)

      if (response.status === 200) {
        setEditingPayment(response.data)
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error("Error al obtener datos del pago:", error)
      setEditingPayment(row.original)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingPayment(null)
    }, 300)
  }

  // Header responsive: filtro + botón
  const headerActions = {
    title: TitlePage,
    button: (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
        {/* Botón Eliminar Seleccionados */}
        {selectedPayments.length > 0 && (
          <Button
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white flex items-center justify-center gap-2 w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-70 font-semibold"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Eliminando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5" />
                <span>Eliminar {selectedPayments.length} pago(s)</span>
              </>
            )}
          </Button>
        )}

        <div className="w-full sm:w-[250px]">
          <Label htmlFor="project-filter" className="sr-only">
            Filtrar por Proyecto
          </Label>
          <Select name="project-filter" value={selectedProjectId} onValueChange={handleProjectFilterChange}>
            <SelectTrigger className="w-full">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrar por Proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Proyectos</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id_Projects} value={project.id_Projects.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-pink-600 to-rose-700 hover:from-pink-700 hover:to-rose-800 text-white flex items-center justify-center gap-2 w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
        >
          <Plus className="w-5 h-5" />
          <span>Agregar Pago</span>
        </Button>
      </div>
    ),
  }


  return (
    <PrivateNav>
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
          <div className="flex flex-col items-center">
            <Image
              src="/assets/img/mymsoftcom.png"
              alt="Cargando..."
              width={80}
              height={80}
              className="animate-spin"
            />
            <p className="text-lg text-gray-700 font-semibold mt-2">Cargando pagos...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="container mx-auto p-4 sm:p-6">
          {/* Banner informativo sobre eliminación múltiple */}
          {selectedPayments.length > 0 && (
            <div className="mb-6 p-4 md:p-5 bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/10 border-l-4 border-l-blue-500 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <CheckSquare className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-bold text-blue-900 dark:text-blue-200">
                    ✓ {selectedPayments.length} pago(s) seleccionado(s)
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Usa el botón "Eliminar Seleccionados" para eliminar múltiples pagos a la vez
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPayments([])}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  ✕ Limpiar
                </Button>
              </div>
            </div>
          )}

          {/* Panel de estadísticas de pagos del mes */}
          {paymentStats.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {paymentStats.map((stat, index) => (
                <div
                  key={index}
                  className="p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-6 bg-gradient-to-b from-pink-500 to-rose-600 rounded-full"></div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{stat.projectName}</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="p-3 bg-gradient-to-r from-pink-50 to-pink-50/50 dark:from-pink-900/20 dark:to-pink-900/10 rounded-lg border border-pink-100 dark:border-pink-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 bg-pink-500 rounded-full"></div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Efectivo</span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-pink-600 dark:text-pink-400">
                            {stat.totalEfectivo.toLocaleString("es-CO", {
                              style: "currency",
                              currency: "COP",
                              minimumFractionDigits: 0,
                            })}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{stat.efectivo} pago(s)</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Banco</span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {stat.totalBanco.toLocaleString("es-CO", {
                              style: "currency",
                              currency: "COP",
                              minimumFractionDigits: 0,
                            })}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{stat.banco} pago(s)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-8 p-5 bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-900/20 dark:to-amber-900/10 border border-l-4 border-l-amber-500 rounded-lg text-center shadow-sm">
              <p className="text-amber-900 dark:text-amber-200 font-medium">📊 No hay pagos registrados en el mes actual</p>
            </div>
          )}

          <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="filter-date-from" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    📅 Fecha desde
                  </Label>
                  <Input
                    id="filter-date-from"
                    type="date"
                    value={paymentDateFrom}
                    onChange={(event) => setPaymentDateFrom(event.target.value)}
                    className="mt-2 border-gray-300 dark:border-gray-600 focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:text-white transition-colors"
                  />
                </div>
                <div>
                  <Label htmlFor="filter-date-to" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    📅 Fecha hasta
                  </Label>
                  <Input
                    id="filter-date-to"
                    type="date"
                    value={paymentDateTo}
                    onChange={(event) => setPaymentDateTo(event.target.value)}
                    className="mt-2 border-gray-300 dark:border-gray-600 focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:text-white transition-colors"
                  />
                </div>
                <div>
                  <Label htmlFor="filter-amount" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    💰 Valor
                  </Label>
                  <Input
                    id="filter-amount"
                    type="number"
                    min="0"
                    step="1"
                    value={paymentAmountFilter}
                    onChange={(event) => setPaymentAmountFilter(event.target.value)}
                    placeholder="Ej: 500000"
                    className="mt-2 border-gray-300 dark:border-gray-600 focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:text-white transition-colors"
                  />
                </div>
                <div>
                  <Label htmlFor="filter-method" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    🔄 Método
                  </Label>
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="mt-2 w-full border-gray-300 dark:border-gray-600 focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:text-white">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-700">
                      <SelectItem value="all">✓ Todos</SelectItem>
                      <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                      <SelectItem value="banco">🏦 Banco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                <Button 
                  variant="outline" 
                  onClick={clearPaymentFilters} 
                  className="w-full sm:w-auto border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  ✕ Limpiar filtros
                </Button>
              </div>
            </div>
          </div>

          {/* Tabla de pagos */}
          <DataTable
            Data={filteredPaymentData}
            TitlesTable={titlesPayments}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            showDeleteButton={true}
            showToggleButton={false}
            showStatusColumn={false}
            showPdfButton={false}
            headerActions={headerActions}
            showCheckboxes={true}
            selectedItems={selectedPayments}
            onToggleSelection={togglePaymentSelection}
            onToggleSelectAll={toggleSelectAll}
          />

          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <RegisterPayment
                  refreshData={() => fetchPayments(selectedProjectId === "all" ? null : selectedProjectId, projects)}
                  paymentToEdit={editingPayment}
                  onCancelEdit={handleCloseModal}
                  closeModal={handleCloseModal}
                  showAlert={showAlert}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {error && <div className="text-red-600 text-center mt-4">{error}</div>}

      <AlertModal
        isOpen={alertInfo.isOpen}
        message={alertInfo.message}
        type={alertInfo.type}
        onClose={closeAlert}
        redirectUrl={alertInfo.redirectUrl}
      />
    </PrivateNav>
  )
}

export default Payments
