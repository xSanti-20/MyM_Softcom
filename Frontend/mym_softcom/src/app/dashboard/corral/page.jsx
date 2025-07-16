"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import ContentPage from "@/components/utils/ContentPage"
import axiosInstance from "@/lib/axiosInstance"
import RegisterCorral from "./formcorral"
import AlertModal from "@/components/AlertModal"

function Corral() {
  const TitlePage = "Corral"
  const [corralData, setCorralData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingCorral, setEditingCorral] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // ✅ Estados para AlertModal
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    message: "",
    type: "info",
    onSuccessCallback: null,
  })

  const titlesCorral = ["ID", "Descripción", "Total Animales", "Total Pesaje", "Estado"]

  // ✅ Función para mostrar AlertModal
  const showAlert = (type, message, onSuccessCallback = null) => {
    setAlertModal({
      isOpen: true,
      message,
      type,
      onSuccessCallback,
    })
  }

  // ✅ Función para cerrar AlertModal
  const closeAlert = () => {
    const callback = alertModal.onSuccessCallback
    setAlertModal({
      isOpen: false,
      message: "",
      type: "info",
      onSuccessCallback: null,
    })

    // Ejecutar callback si existe (para casos de éxito)
    if (callback) {
      callback()
    }
  }

  async function fetchCorral() {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Corral/ConsultAllCorrals")

      if (response.status === 200) {
        const data = response.data.map((corral) => ({
          id: corral.id_Corral,
          des_corral: corral.des_Corral,
          tot_animales: corral.tot_Animal,
          tot_pesaje: corral.tot_Pesaje,
          est_corral: corral.est_Corral,
          original: corral,
        }))

        console.log("Datos cargados del backend:", data)
        setCorralData(data)
      }
    } catch (error) {
      console.error("Error al obtener datos del Corral:", error)
      setError("No se pudieron cargar los datos del Corral.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCorral()
  }, [])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      await axiosInstance.delete(`/api/Corral/DeleteCorral?id_Corral=${numericId}`)
      showAlert("success", "Corral eliminado exitosamente.", () => {
        fetchCorral()
      })
    } catch (error) {
      console.error("Error detallado al eliminar:", error)
      showAlert("error", "Error al eliminar el corral.")
    }
  }

  const handleUpdate = (row) => {
    console.log("Corral a editar:", row.original)
    setEditingCorral(row.original)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingCorral(null)
    }, 300)
  }

  return (
    <PrivateNav>
      {/* Pantalla de carga */}
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
          <div className="flex flex-col items-center">
            <img src="/assets/img/pesopig.png" alt="Cargando..." className="w-20 h-20 animate-spin" />
            <p className="text-lg text-gray-700 font-semibold mt-2">Cargando...</p>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      {!isLoading && (
        <ContentPage
          TitlePage={TitlePage}
          Data={corralData}
          TitlesTable={titlesCorral}
          showDeleteButton={true} // ✅ Mostrar eliminar
          showToggleButton={false} // ✅ No mostrar toggle
          showStatusColumn={false} // ✅ IMPORTANTE: No mostrar columna
          showPdfButton={false} // ✅ Ocultar botón PDF solo en esta página

          FormPage={() => (
            <RegisterCorral
              refreshData={fetchCorral}
              corralToEdit={editingCorral}
              onCancelEdit={handleCloseModal}
              closeModal={handleCloseModal}
              showAlert={showAlert} // ✅ Pasar función showAlert al form
            />
          )}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          endpoint="/api/Corral/DeleteCorral"
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          refreshData={fetchCorral}
        />
      )}

      {error && <div className="text-red-600 text-center mt-4">{error}</div>}

      {/* ✅ AlertModal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        type={alertModal.type}
        onClose={closeAlert}
        onClick={closeAlert}
      />
    </PrivateNav>
  )
}

export default Corral
