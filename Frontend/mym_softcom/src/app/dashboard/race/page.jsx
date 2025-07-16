"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import ContentPage from "@/components/utils/ContentPage"
import axiosInstance from "@/lib/axiosInstance"
import RegisterRace from "./formrace"
import AlertModal from "@/components/AlertModal"

function RacePage() {
  const TitlePage = "Raza"
  const [raceData, setRaceData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingRace, setEditingRace] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesRace = ["ID", "Nombre"]

  const closeAlert = () => {
    setAlertInfo({
      ...alertInfo,
      isOpen: false,
    })
  }

  async function fetchRaces() {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Race/ConsultAllRaces")

      if (response.status === 200) {
        const data = response.data.map((race) => ({
          id: race.id_Race,
          nombre: race.nam_Race,
          original: race,
        }))
        setRaceData(data)
      }
    } catch (error) {
      setError("No se pudieron cargar los datos de la raza.")
      setAlertInfo({
        isOpen: true,
        message: "No se pudieron cargar los datos de la raza.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRaces()
  }, [])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      await axiosInstance.delete(`/api/Race/DeleteRace?id_Race=${numericId}`)
      fetchRaces()
      setAlertInfo({
        isOpen: true,
        message: "Raza eliminada correctamente",
        type: "success",
      })
    } catch (error) {
      console.error("Error detallado al eliminar:", error)
      setAlertInfo({
        isOpen: true,
        message: "Error al eliminar la raza",
        type: "error",
      })
    }
  }

  const handleUpdate = (row) => {
    console.log("Raza a editar:", row.original)
    setEditingRace(row.original)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingRace(null)
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
          Data={raceData}
          TitlesTable={titlesRace}
          showDeleteButton={true} // ✅ Mostrar eliminar
          showToggleButton={false} // ✅ No mostrar toggle
          showStatusColumn={false} // ✅ IMPORTANTE: No mostrar columna
          showPdfButton={false} // ✅ Ocultar botón PDF solo en esta página

          FormPage={() => (
            <RegisterRace
              refreshData={fetchRaces}
              raceToEdit={editingRace}
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
          endpoint="/api/Race/DeleteRace"
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          refreshData={fetchRaces}
        />
      )}

      {error && <div className="text-red-600 text-center mt-4">{error}</div>}

      {/* Alerta personalizada */}
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

export default RacePage
