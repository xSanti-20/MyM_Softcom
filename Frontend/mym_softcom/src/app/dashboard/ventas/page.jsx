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
import { Filter, Plus } from "lucide-react"
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

        const data = filteredSales.map((sale) => ({
          id: sale.id_Sales,
          sale_date: sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : "N/A",
          total_value: sale.total_value?.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "N/A",
          initial_payment: sale.initial_payment?.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "N/A",
          total_raised: sale.total_raised?.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "N/A",
          total_debt: sale.total_debt?.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "N/A",
          quota_value: calculateDisplayQuotaValue(sale)?.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "N/A",
          status: createSaleStatusBadge(sale.status || "Active"),
          client: sale.client ? `${sale.client.names} ${sale.client.surnames}` : "N/A",
          lot: sale.lot ? `${sale.lot.block}-${sale.lot.lot_number}` : "N/A",
          project: getProjectName(sale),
          user: sale.user?.nom_Users || "N/A",
          plan: sale.plan?.name || "N/A",
          original: sale,
          searchableIdentifier: `${sale.id_Sales} ${sale.client?.names} ${sale.client?.surnames} ${sale.lot?.block}-${sale.lot?.lot_number} ${getProjectName(sale)} ${sale.status} ${sale.plan?.name}`,
        }))
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

  useEffect(() => {
    fetchProjectsForFilter()
    fetchSales()
  }, [fetchProjectsForFilter, fetchSales])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      await axiosInstance.delete(`/api/Sale/DeleteSale/${numericId}`)
      fetchSales(selectedProjectId === "all" ? null : selectedProjectId)
      showAlert("success", "Venta eliminada correctamente. El lote asociado ha sido liberado.")
    } catch (error) {
      console.error("Error detallado al eliminar:", error)
      showAlert("error", "Error al eliminar la venta.")
    }
  }

  const handleUpdate = async (row) => {
    try {
      const saleId = row.id
      const response = await axiosInstance.get(`/api/Sale/GetSaleID/${saleId}`)

      if (response.status === 200) {
        setEditingSale(response.data)
        setIsModalOpen(true)
      } else {
        setEditingSale(row.original)
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error("Error al obtener datos completos de la venta:", error)
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
