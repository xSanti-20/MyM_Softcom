"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import ContentPage from "@/components/utils/ContentPage"
import axiosInstance from "@/lib/axiosInstance"
import RegisterStage from "./formstage"
import AlertModal from "@/components/AlertModal"

function Stage() {
  const TitlePage = "Etapa"
  const [stageData, setStageData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingStage, setEditingStage] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesStage = ["ID", "Nombre", "Peso Desde (kg)", "Peso Hasta (kg)", "Duración (días)"]

  const closeAlert = () => {
    setAlertInfo({
      ...alertInfo,
      isOpen: false,
    })
  }

  async function fetchStage() {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Stage/ConsultAllStages")

      if (response.status === 200) {
        const data = response.data.map((stage) => ({
          id: stage.id_Stage,
          name_Stage: stage.name_Stage,
          // ✅ Formatear pesos con decimales
          weight_From: typeof stage.weight_From === "number" ? stage.weight_From.toFixed(1) : stage.weight_From,
          weight_Upto: typeof stage.weight_Upto === "number" ? stage.weight_Upto.toFixed(1) : stage.weight_Upto,
          dur_Stage: stage.dur_Stage,
          original: stage,
        }))
        setStageData(data)
      }
    } catch (error) {
      setError("No se pudieron cargar los datos de la Etapa.")
      setAlertInfo({
        isOpen: true,
        message: "No se pudieron cargar los datos de la Etapa.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStage()
  }, [])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      await axiosInstance.delete(`/api/Stage/DeleteStage?id_Stage=${numericId}`)
      fetchStage()
      setAlertInfo({
        isOpen: true,
        message: "Etapa eliminada correctamente",
        type: "success",
      })
    } catch (error) {
      console.error("Error detallado al eliminar:", error)
      setAlertInfo({
        isOpen: true,
        message: "Error al eliminar la etapa",
        type: "error",
      })
    }
  }

  const handleUpdate = (row) => {
    console.log("Etapa a editar:", row.original)
    setEditingStage(row.original)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingStage(null)
    }, 300)
  }

  return (
    <PrivateNav>
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
          <div className="flex flex-col items-center">
            <img src="/assets/img/pesopig.png" alt="Cargando..." className="w-20 h-20 animate-spin" />
            <p className="text-lg text-gray-700 font-semibold mt-2">Cargando...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <ContentPage
          TitlePage={TitlePage}
          Data={stageData}
          TitlesTable={titlesStage}
          showDeleteButton={true}
          showToggleButton={false}
          showStatusColumn={false}
          showPdfButton={false} // ✅ Ocultar botón PDF solo en esta página

          FormPage={() => (
            <RegisterStage
              refreshData={fetchStage}
              stageToEdit={editingStage}
              onCancelEdit={handleCloseModal}
              closeModal={handleCloseModal}
              showAlert={(message, type, redirectUrl = null) => {
                setAlertInfo({
                  isOpen: true,
                  message,
                  type,
                  redirectUrl,
                })
              }}
            />
          )}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          endpoint="/api/Stage/DeleteStage"
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          refreshData={fetchStage}
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

export default Stage
