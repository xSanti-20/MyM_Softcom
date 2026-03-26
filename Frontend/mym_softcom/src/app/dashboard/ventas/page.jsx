"use client"

import { useState, useEffect, useCallback } from "react"
import ExportPDFButton from '@/components/ExportPDFButton'
import PrivateNav from "@/components/nav/PrivateNav"
import axiosInstance from "@/lib/axiosInstance"
import RegisterSale from "./formventas"
import AlertModal from "@/components/AlertModal"
import DataTable from "@/components/utils/DataTable"
import Image from 'next/image';
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Filter, Plus, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"

function SalesPage() {
  const TitlePage = "Ventas"
  const [salesData, setSalesData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingSale, setEditingSale] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesSale = [
    "ID",
    "Fecha Venta",
    "Valor Total",
    "Cuota Inicial",
    "Recaudo Total",
    "Deuda Total",
    "Valor Cuota",
    "Estado",
    "Cliente",
    "Documento",
    "Lote",
    "Proyecto",
    "Vendedor",
    "Plan",
  ]

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

  const createSaleStatusBadge = (status) => {
    if (!status) return "N/A"

    const statusLower = status.toLowerCase()
    let badgeClass = ""
    let displayText = status

    switch (statusLower) {
      case "active":
      case "activa":
        badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200"
        displayText = "Activa"
        break
      case "desistida":
        badgeClass = "bg-red-100 text-red-800 border-red-200 hover:bg-red-200"
        displayText = "Desistida"
        break
      case "escriturar":
        badgeClass = "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
        displayText = "Escriturar"
        break
      default:
        badgeClass = "bg-gray-100 text-gray-800 border-gray-200"
    }

    return (
      <Badge variant="outline" className={`${badgeClass} font-medium`}>
        {displayText}
      </Badge>
    )
  }

  const getProjectName = (sale) => {
    if (sale.lot?.project?.name) return sale.lot.project.name
    if (sale.lot?.Project?.name) return sale.lot.Project.name
    if (sale.Lot?.project?.name) return sale.Lot.project.name
    if (sale.Lot?.Project?.name) return sale.Lot.Project.name
    if (sale.lot?.project_name) return sale.lot.project_name
    const projectId = sale.lot?.id_Projects || sale.lot?.project?.id_Projects
    if (projectId) return `Proyecto #${projectId}`
    return "Sin proyecto"
  }

  // Función para calcular el valor de cuota correcto basado en el tipo de plan
  function calculateDisplayQuotaValue(sale) {
    if (!sale) return 0
    
    console.log('Ventas - calculateDisplayQuotaValue:', {
      saleId: sale.id_Sales,
      paymentPlanType: sale.paymentPlanType,
      hasCustomQuotas: !!sale.customQuotasJson,
      quota_value: sale.quota_value,
      customQuotasJsonRaw: sale.customQuotasJson
    })
    
    // Si es plan personalizado y tiene cuotas personalizadas
    if (sale.paymentPlanType === 'custom' && sale.customQuotasJson) {
      try {
        console.log('Ventas - customQuotasJson string:', sale.customQuotasJson)
        const customQuotas = JSON.parse(sale.customQuotasJson)
        console.log('Ventas - parsed customQuotas:', customQuotas)
        if (Array.isArray(customQuotas) && customQuotas.length > 0) {
          const amounts = customQuotas.map(q => q.Amount || 0)
          console.log('Ventas - individual amounts:', amounts)
          
          // Opción 1: Mostrar el valor más común (mediana)
          const sortedAmounts = [...amounts].sort((a, b) => a - b)
          const median = sortedAmounts[Math.floor(sortedAmounts.length / 2)]
          
          // Opción 2: Promedio (valor actual)
          const total = customQuotas.reduce((sum, quota) => sum + (parseFloat(quota.Amount) || 0), 0)
          const average = total / customQuotas.length
          
          console.log('Ventas - median:', median, 'average:', average)
          
          // Cambiar esta línea para usar mediana en lugar de promedio
          return median  // Mostrará $1,000,000 en lugar de $1,194,444
          // return average  // Mostrará $1,194,444 (promedio real)
        }
      } catch (error) {
        console.error('Error parsing customQuotasJson:', error)
      }
    }
    
    // Para planes automáticos o sin datos personalizados, usar quota_value
    console.log('Ventas - Using standard quota_value:', sale.quota_value)
    return sale.quota_value || 0
  }

  const getEffectiveSaleStatus = (sale) => {
    const quotaValue = Number.parseFloat(calculateDisplayQuotaValue(sale)) || 0
    const totalDebt = Number.parseFloat(sale?.total_debt) || 0

    if (quotaValue <= 0 || totalDebt <= 0) {
      return "Escriturar"
    }

    return sale?.status || "Active"
  }

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
      }
    } catch (error) {
      console.error("Error al cargar proyectos para el filtro:", error)
      showAlert("error", "No se pudieron cargar los proyectos para el filtro.")
    }
  }, [])

  const fetchSales = useCallback(async (projectId = null) => {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Sale/GetAllSales")

      if (response.status === 200) {
        let filteredSales = response.data

        if (projectId && projectId !== "all") {
          const targetProjectId = Number.parseInt(projectId, 10)
          filteredSales = response.data.filter((sale) => {
            const saleProjectId =
              sale.lot?.project?.id_Projects ||
              sale.lot?.Project?.id_Projects ||
              sale.lot?.id_Projects ||
              sale.Lot?.project?.id_Projects ||
              sale.Lot?.Project?.id_Projects
            return saleProjectId === targetProjectId
          })
        }

        const data = filteredSales.map((sale) => {
          const effectiveStatus = getEffectiveSaleStatus(sale)
          const lotBlock = sale.lot?.block || sale.Lot?.block || ""
          const lotNumber = sale.lot?.lot_number || sale.Lot?.lot_number || ""
          const lotLabel = lotBlock && lotNumber ? `${lotBlock}-${lotNumber}` : "N/A"

          return ({
          id: sale.id_Sales,
          sale_date: sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : "N/A",
          total_value: sale.total_value?.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "N/A",
          initial_payment: sale.initial_payment?.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "N/A",
          total_raised: sale.total_raised?.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "N/A",
          total_debt: sale.total_debt?.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "N/A",
          quota_value: calculateDisplayQuotaValue(sale)?.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "N/A",
          status: createSaleStatusBadge(effectiveStatus),
          statusText: effectiveStatus,
          client: sale.client ? `${sale.client.names} ${sale.client.surnames}` : "N/A",
          clientDocument: sale.client?.document || "N/A",
          lot: lotLabel,
          project: getProjectName(sale),
          user: sale.user?.nom_Users || "N/A",
          plan: sale.plan?.name || "N/A",
          original: sale,
          searchableIdentifier: `${sale.id_Sales} ${sale.client?.names} ${sale.client?.surnames} ${sale.client?.document || ""} MZ:${lotBlock} MZ: ${lotBlock} LOTE:${lotNumber} LOTE: ${lotNumber} ${lotLabel} ${lotBlock}${lotNumber} PROYECTO:${getProjectName(sale)} ${getProjectName(sale)} ${effectiveStatus} ${sale.plan?.name}`,
        })
      }).sort((a, b) => {
          // ✅ Ordenar por manzana y luego por número de lote ascendentemente
          const lotA = a.original.lot
          const lotB = b.original.lot
          
          if (!lotA && !lotB) return 0
          if (!lotA) return 1
          if (!lotB) return -1
          
          // Comparar primero por manzana (block)
          const blockComparison = (lotA.block || '').localeCompare(lotB.block || '')
          if (blockComparison !== 0) return blockComparison
          
          // Si la manzana es igual, comparar por número de lote
          const lotNumA = Number(lotA.lot_number) || 0
          const lotNumB = Number(lotB.lot_number) || 0
          return lotNumA - lotNumB
        })
        
        setSalesData(data)
      }
    } catch (error) {
      console.error("Error al cargar ventas:", error)
      setError("No se pudieron cargar los datos de las ventas.")
      showAlert("error", "No se pudieron cargar los datos de las ventas.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleProjectFilterChange = (value) => {
    setSelectedProjectId(value)
    fetchSales(value === "all" ? null : value)
  }

  const exportSalesToCSV = () => {
    if (!salesData.length) {
      showAlert("error", "No hay ventas para exportar con el filtro actual.")
      return
    }

    const headers = [
      "ID",
      "Fecha Venta",
      "Valor Total",
      "Cuota Inicial",
      "Recaudo Total",
      "Deuda Total",
      "Valor Cuota",
      "Estado",
      "Cliente",
      "Documento",
      "Lote",
      "Proyecto",
      "Vendedor",
      "Plan",
    ]

    const escapeValue = (value) => {
      const stringValue = value === null || value === undefined ? "" : String(value)
      const normalizedValue = stringValue
        .replace(/\u00A0/g, " ")
        .replace(/\u202F/g, " ")
      return `"${normalizedValue.replace(/"/g, '""')}"`
    }

    const rows = salesData.map((sale) => {
      const original = sale.original || {}
      return [
        sale.id,
        sale.sale_date,
        sale.total_value,
        sale.initial_payment,
        sale.total_raised,
        sale.total_debt,
        sale.quota_value,
        sale.statusText || original.status || "N/A",
        sale.client,
        sale.clientDocument,
        sale.lot,
        sale.project,
        sale.user,
        sale.plan,
      ].map(escapeValue)
    })

    const csvContent = [headers.map(escapeValue).join(","), ...rows.map((row) => row.join(","))].join("\n")
    const csvWithBom = `\uFEFF${csvContent}`
    const selectedProject = projects.find((project) => project.id_Projects.toString() === selectedProjectId)
    const projectLabel = selectedProject ? selectedProject.name : "todos_los_proyectos"
    const safeProjectLabel = projectLabel.toLowerCase().replace(/\s+/g, "_")

    const blob = new Blob([csvWithBom], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `ventas_${safeProjectLabel}_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showAlert("success", "Ventas exportadas correctamente.")
  }

  useEffect(() => {
    fetchProjectsForFilter()
    fetchSales()
  }, [fetchProjectsForFilter, fetchSales])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      console.log(`🗑️ Intentando eliminar venta ID: ${numericId}`)
      
      await axiosInstance.delete(`/api/Sale/DeleteSale/${numericId}`)
      fetchSales(selectedProjectId === "all" ? null : selectedProjectId)
      showAlert("success", "Venta eliminada correctamente. El lote asociado ha sido liberado.")
    } catch (error) {
      console.error("❌ Error detallado al eliminar:", error)
      console.error("Response data:", error.response?.data)
      console.error("Response status:", error.response?.status)
      
      let errorMessage = "Error al eliminar la venta."
      
      if (error.response?.status === 409) {
        errorMessage = "No se puede eliminar esta venta porque tiene pagos asociados. Elimine primero los pagos."
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || error.response?.data || "La venta no se puede eliminar."
      } else if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = `Error: ${error.response.data}`
        } else if (error.response.data.message) {
          errorMessage = `Error: ${error.response.data.message}`
        }
      }
      
      showAlert("error", errorMessage)
    }
  }

  const handleUpdate = async (row) => {
    try {
      const saleId = row.id
      console.log("🔄 [PAGE] Solicitando datos de venta ID:", saleId)
      const response = await axiosInstance.get(`/api/Sale/GetSaleID/${saleId}`)

      if (response.status === 200) {
        console.log("✅ [PAGE] Datos de venta recibidos:", response.data)
        console.log("✅ [PAGE] Lote incluido:", !!response.data.lot)
        console.log("✅ [PAGE] Proyecto incluido:", !!response.data.lot?.project)
        if (response.data.lot) {
          console.log("📦 [PAGE] Info de lote:", {
            id: response.data.lot.id_Lots,
            block: response.data.lot.block,
            lot_number: response.data.lot.lot_number,
            project: response.data.lot.project?.name
          })
        }
        setEditingSale(response.data)
        setIsModalOpen(true)
      } else {
        console.warn("⚠️ [PAGE] Respuesta no exitosa, usando row.original")
        setEditingSale(row.original)
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error("❌ [PAGE] Error al obtener datos completos de la venta:", error)
      console.error("❌ [PAGE] Status:", error.response?.status)
      console.error("❌ [PAGE] Message:", error.response?.data?.message || error.response?.data)
      console.warn("⚠️ [PAGE] Usando row.original como respaldo")
      console.log("📦 [PAGE] row.original:", row.original)
      setEditingSale(row.original)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingSale(null)
    }, 300)
  }

  const headerActions = {
    title: TitlePage,
    button: (
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <div className="w-full sm:w-64">
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
          onClick={exportSalesToCSV}
          variant="outline"
          className="flex items-center justify-center"
        >
          <Download className="w-4 h-4 mr-2" />
          <span className="text-sm">Exportar Ventas</span>
        </Button>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="text-sm">Agregar Venta</span>
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
            <p className="text-lg text-gray-700 font-semibold mt-2">Cargando ventas...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="overflow-x-auto">
            <DataTable
              Data={salesData}
              TitlesTable={titlesSale}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              showDeleteButton={true}
              showToggleButton={false}
              showPdfButton={true}
              headerActions={headerActions}
            />
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
                <RegisterSale
                  refreshData={() => fetchSales(selectedProjectId === "all" ? null : selectedProjectId)}
                  saleToEdit={editingSale}
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

export default SalesPage
