"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import ContentPage from "@/components/utils/ContentPage" // Asumo que tienes este componente
import axiosInstance from "@/lib/axiosInstance"
import RegisterProject from "./formproject" // Importar el nuevo componente
import AlertModal from "@/components/AlertModal"

function ProjectPage() {
  const TitlePage = "Proyectos"
  const [projectData, setProjectData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingProject, setEditingProject] = useState(null) // Cambiado de editingRace
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesProject = ["ID", "Nombre"] // Cambiado de titlesRace

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

  async function fetchProjects() {
    // Cambiado de fetchRaces
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Project/GetAllProjects") // Endpoint correcto

      if (response.status === 200) {
        const data = response.data.map((project) => ({
          // Mapear project
          id: project.id_Projects, // Usar id_Projects
          name: project.name, // Usar name
          original: project,
        }))
        setProjectData(data) // Cambiado de setRaceData
      }
    } catch (error) {
      setError("No se pudieron cargar los datos de los proyectos.")
      showAlert("error", "No se pudieron cargar los datos de los proyectos.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects() // Llamar a fetchProjects
  }, [])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      await axiosInstance.delete(`/api/Project/DeleteProject/${numericId}`) // Endpoint correcto
      fetchProjects() // Refrescar proyectos
      showAlert("success", "Proyecto eliminado correctamente")
    } catch (error) {
      console.error("Error detallado al eliminar:", error)
      showAlert("error", "Error al eliminar el proyecto")
    }
  }

  const handleUpdate = (row) => {
    console.log("Proyecto a editar:", row.original)
    setEditingProject(row.original) // Cambiado de setEditingRace
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingProject(null) // Cambiado de setEditingRace
    }, 300)
  }

  return (
    <PrivateNav>
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
          <div className="flex flex-col items-center">
            <img src="/placeholder.svg?height=80&width=80" alt="Cargando..." className="w-20 h-20 animate-spin" />
            <p className="text-lg text-gray-700 font-semibold mt-2">Cargando...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <ContentPage
          TitlePage={TitlePage}
          Data={projectData} // Cambiado de raceData
          TitlesTable={titlesProject} // Cambiado de titlesRace
          showDeleteButton={true}
          showToggleButton={false}
          showStatusColumn={false}
          showPdfButton={false}
          FormPage={() => (
            <RegisterProject // Usar RegisterProject
              refreshData={fetchProjects} // Refrescar proyectos
              projectToEdit={editingProject} // Pasar projectToEdit
              onCancelEdit={handleCloseModal}
              closeModal={handleCloseModal}
              showAlert={showAlert}
            />
          )}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          endpoint="/api/Project/DeleteProject" // Endpoint correcto
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          refreshData={fetchProjects} // Refrescar proyectos
        />
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

export default ProjectPage
