"use client"

import { Label } from "@/components/ui/label"

import { useState, useEffect } from "react"

import axiosInstance from "@/lib/axiosInstance"
import PrivateNav from "@/components/nav/PrivateNav" // Asegúrate de que la ruta sea correcta
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Filter } from "lucide-react" // Icono para el filtro
import ContentPage from "@/components/utils/ContentPage" // Asegúrate de que la ruta sea correcta
import RegisterLot from "./formlotes"
import AlertModal from "@/components/AlertModal"

function LotPage() {
  const TitlePage = "Lotes"
  const [lotData, setLotData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingLot, setEditingLot] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [projects, setProjects] = useState([]) // Para el filtro de proyectos
  const [selectedProjectId, setSelectedProjectId] = useState("") // ID del proyecto seleccionado para filtrar

  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  // Columnas para la tabla de lotes - "Estado" se manejará automáticamente por DataTable
  const titlesLot = ["ID", "Manzana", "Número de Lote", "Estado", "Proyecto"]

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

  // Función para cargar lotes, con o sin filtro de proyecto
  async function fetchLots(projectId = null) {
    try {
      setIsLoading(true)
      let response
      if (projectId && projectId !== "all") {
        // Usar el endpoint para filtrar por proyecto
        response = await axiosInstance.get(`/api/Lot/GetLotsByProject/${projectId}`)
      } else {
        // Obtener todos los lotes
        response = await axiosInstance.get("/api/Lot/GetAllLot")
      }

      if (response.status === 200) {
        const data = response.data.map((lot) => ({
          id: lot.id_Lots,
          block: lot.block,
          lot_number: lot.lot_number,
          status: lot.status,
          project: lot.project?.name || "N/A", // Mostrar el nombre del proyecto
          original: lot,
          // ✅ NUEVO: Campo combinado para búsqueda rápida
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
  }

  // Función para cargar todos los proyectos para el filtro
  async function fetchProjectsForFilter() {
    try {
      const response = await axiosInstance.get("/api/Project/GetAllProjects")
      if (response.status === 200) {
        setProjects(response.data)
      }
    } catch (error) {
      console.error("Error al cargar proyectos para el filtro:", error)
      showAlert("error", "No se pudieron cargar los proyectos para el filtro.")
    }
  }

  // Cargar proyectos y lotes al montar el componente
  useEffect(() => {
    fetchProjectsForFilter()
    fetchLots() // Cargar todos los lotes inicialmente
  }, [])

  // Manejar cambio en el filtro de proyecto
  const handleProjectFilterChange = (value) => {
    setSelectedProjectId(value)
    fetchLots(value === "all" ? null : Number.parseInt(value, 10)) // Si es "all", no pasar projectId
  }

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      await axiosInstance.delete(`/api/Lot/DeleteLot/${numericId}`)
      fetchLots(selectedProjectId === "all" ? null : Number.parseInt(selectedProjectId, 10)) // Refrescar con el filtro actual
      showAlert("success", "Lote eliminado correctamente")
    } catch (error) {
      console.error("Error detallado al eliminar:", error)
      showAlert("error", "Error al eliminar el lote")
    }
  }

  const handleUpdate = (row) => {
    console.log("Lote a editar:", row.original)
    setEditingLot(row.original)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingLot(null)
    }, 300)
  }

  return (
    <PrivateNav>
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
          <div className="flex flex-col items-center">
            <img src="/assets/img/mymsoftcom.png" alt="Cargando..." className="w-20 h-20 animate-spin" />
            <p className="text-lg text-gray-700 font-semibold mt-2">Cargando...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          <div className="mb-4 flex items-center gap-4 flex-wrap">
            <div className="relative w-full max-w-xs">
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
          </div>

          <ContentPage
            TitlePage={TitlePage}
            Data={lotData}
            TitlesTable={titlesLot}
            showDeleteButton={true}
            showToggleButton={false}
            showStatusColumn={true}
            statusField="status"
            showPdfButton={false}
            FormPage={() => (
              <RegisterLot
                refreshData={() =>
                  fetchLots(selectedProjectId === "all" ? null : Number.parseInt(selectedProjectId, 10))
                }
                lotToEdit={editingLot}
                onCancelEdit={handleCloseModal}
                closeModal={handleCloseModal}
                showAlert={showAlert}
              />
            )}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            endpoint="/api/Lot/DeleteLot" // Endpoint base para eliminar
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            refreshData={() => fetchLots(selectedProjectId === "all" ? null : Number.parseInt(selectedProjectId, 10))}
          />
        </>
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
