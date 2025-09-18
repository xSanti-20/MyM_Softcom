"use client"

import { useState, useEffect, useCallback } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import axiosInstance from "@/lib/axiosInstance"
import Image from 'next/image';
import RegisterProject from "./formproject"
import AlertModal from "@/components/AlertModal"
import DataTable from "@/components/utils/DataTable"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

function ProjectPage() {
  const TitlePage = "Proyectos"
  const [projectData, setProjectData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesProject = ["ID", "Nombre"]

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

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Project/GetAllProjects")

      if (response.status === 200) {
        const data = response.data.map((project) => ({
          id: project.id_Projects,
          name: project.name,
          original: project,
          searchableIdentifier: `${project.name || ""}`,
        }))
        setProjectData(data)
      }
    } catch (error) {
      setError("No se pudieron cargar los datos de los proyectos.")
      showAlert("error", "No se pudieron cargar los datos de los proyectos.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      await axiosInstance.delete(`/api/Project/DeleteProject/${numericId}`)
      fetchProjects()
      showAlert("success", "Proyecto eliminado correctamente")
    } catch (error) {
      console.error("Error detallado al eliminar:", error)
      showAlert("error", "Error al eliminar el proyecto")
    }
  }

  const handleUpdate = (row) => {
    setEditingProject(row.original)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingProject(null)
    }, 300)
  }

  // Configuración del header del DataTable
  const headerActions = {
    title: TitlePage,
    button: (
      <Button
        onClick={() => setIsModalOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
      >
        <Plus className="w-4 h-4" />
        <span>Agregar Proyecto</span>
      </Button>
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
            <p className="text-lg text-gray-700 font-semibold mt-2">Cargando...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="container mx-auto p-6">
          <DataTable
            Data={projectData}
            TitlesTable={titlesProject}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            showDeleteButton={true}
            showToggleButton={false}
            showStatusColumn={false}
            showPdfButton={false}
            headerActions={headerActions}
          />

          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <RegisterProject
                  refreshData={fetchProjects}
                  projectToEdit={editingProject}
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

export default ProjectPage
