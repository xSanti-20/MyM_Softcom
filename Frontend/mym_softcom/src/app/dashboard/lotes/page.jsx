"use client"

import { useState, useEffect, useCallback } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import axiosInstance from "@/lib/axiosInstance"
import Image from "next/image"
import RegisterLot from "./formlotes"
import AlertModal from "@/components/AlertModal"
import DataTable from "@/components/utils/DataTable"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Filter, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

function LotPage() {
  const TitlePage = "Lotes"
  const [lotData, setLotData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingLot, setEditingLot] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [lotStats, setLotStats] = useState([])
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesLot = ["ID", "Manzana", "Número de Lote", "Área", "Estado", "Proyecto"]

  const showAlert = useCallback((type, message, onSuccessCallback = null) => {
    setAlertInfo({
      isOpen: true,
      message,
      type,
      onSuccessCallback,
    })
  }, [])

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

  const createLotStatusBadge = (status) => {
    if (!status) return "N/A"
    const statusLower = status.toLowerCase()
    let badgeClass = ""
    let displayText = status

    switch (statusLower) {
      case "libre":
      case "disponible":
        badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200"
        displayText = "Libre"
        break
      case "vendido":
      case "ocupado":
        badgeClass = "bg-red-100 text-red-800 border-red-200 hover:bg-red-200"
        displayText = "Vendido"
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

  const fetchLots = useCallback(
    async (projectId = null) => {
      try {
        setIsLoading(true)
        let response
        if (projectId && projectId !== "all") {
          response = await axiosInstance.get(`/api/Lot/GetLotsByProject/${projectId}`)
        } else {
          response = await axiosInstance.get("/api/Lot/GetAllLot")
        }

        if (response.status === 200) {
          const data = response.data.map((lot) => ({
            id: lot.id_Lots,
            block: lot.block,
            lot_number: lot.lot_number,
            lot_area: `${lot.lot_area || 0} m²`,
            status: createLotStatusBadge(lot.status || "Libre"),
            project: lot.project?.name || "N/A",
            original: lot,
            searchableIdentifier: `${lot.block}-${lot.lot_number} ${lot.block}${lot.lot_number} ${lot.project?.name || ""}`,
          }))
          setLotData(data)
        }
      } catch (error) {
        setError("No se pudieron cargar los datos de los lotes.")
        showAlert("error", "No se pudieron cargar los datos de los lotes.")
      } finally {
        setIsLoading(false)
      }
    },
    [showAlert],
  )

  const fetchLotStats = useCallback(
    async (projectId = null) => {
      try {
        let response
        if (projectId && projectId !== "all") {
          response = await axiosInstance.get(`/api/Lot/GetLotStatsByProject/${projectId}`)
          if (response.status === 200) {
            setLotStats([response.data]) // 👈 convertir en array para mapear
          }
        } else {
          response = await axiosInstance.get("/api/Lot/GetAllLotStats")
          if (response.status === 200) {
            setLotStats(response.data)
          }
        }
      } catch (error) {
        console.error("Error al cargar estadísticas de lotes:", error)
        showAlert("error", "No se pudieron cargar las estadísticas de lotes.")
      }
    },
    [showAlert],
  )

  const fetchProjectsForFilter = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/api/Project/GetAllProjects")
      if (response.status === 200) {
        setProjects(response.data)
      }
    } catch (error) {
      console.error("Error al cargar proyectos para el filtro:", error)
      showAlert("error", "No se pudieron cargar los proyectos para el filtro.")
    }
  }, [showAlert])

  useEffect(() => {
    fetchProjectsForFilter()
    fetchLots()
    fetchLotStats("all")
  }, [fetchProjectsForFilter, fetchLots, fetchLotStats])

  const handleProjectFilterChange = (value) => {
    setSelectedProjectId(value)
    fetchLots(value === "all" ? null : Number.parseInt(value, 10))
    fetchLotStats(value)
  }

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      await axiosInstance.delete(`/api/Lot/DeleteLot/${numericId}`)
      fetchLots(selectedProjectId === "all" ? null : Number.parseInt(selectedProjectId, 10))
      fetchLotStats(selectedProjectId)
      showAlert("success", "Lote eliminado correctamente")
    } catch (error) {
      console.error("Error detallado al eliminar:", error)
      showAlert("error", "Error al eliminar el lote")
    }
  }

  const handleUpdate = (row) => {
    setEditingLot(row.original)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingLot(null)
    }, 300)
  }

  const headerActions = {
    title: TitlePage,
    button: (
      <div className="flex flex-wrap gap-3 items-center justify-between w-full">
        <div className="w-full sm:w-auto">
          <Label htmlFor="project-filter" className="sr-only">
            Filtrar por Proyecto
          </Label>
          <Select name="project-filter" value={selectedProjectId} onValueChange={handleProjectFilterChange}>
            <SelectTrigger className="w-full sm:w-64">
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
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Lote</span>
        </Button>
      </div>
    ),
  }

  return (
    <PrivateNav>
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
          <div className="flex flex-col items-center">
            <Image src="/assets/img/mymsoftcom.png" alt="Cargando..." width={80} height={80} className="animate-spin" />
            <p className="text-lg text-gray-700 font-semibold mt-2">Cargando...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="container mx-auto p-4 sm:p-6">

          {/* Panel de estadísticas dinámico */}
          {lotStats.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {lotStats.map((stat) => {
                const project = projects.find((p) => p.id_Projects === stat.projectId)
                return (
                  <div
                    key={stat.projectId}
                    className="p-4 bg-white rounded-xl shadow-md border border-gray-200"
                  >
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      {project ? project.name : `Proyecto ${stat.projectId}`}
                    </h3>
                    <p className="text-gray-600">
                      <span className="font-medium">Total:</span> {stat.total}
                    </p>
                    <p className="text-red-600">
                      <span className="font-medium">Vendidos:</span> {stat.vendidos}
                    </p>
                    <p className="text-green-600">
                      <span className="font-medium">Disponibles:</span> {stat.disponibles}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Tabla de lotes */}
          <DataTable
            Data={lotData}
            TitlesTable={titlesLot}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            showDeleteButton={true}
            showToggleButton={false}
            showPdfButton={false}
            headerActions={headerActions}
          />

          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <RegisterLot
                  refreshData={() => {
                    fetchLots(selectedProjectId === "all" ? null : Number.parseInt(selectedProjectId, 10))
                    fetchLotStats(selectedProjectId)
                  }}
                  lotToEdit={editingLot}
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

export default LotPage
