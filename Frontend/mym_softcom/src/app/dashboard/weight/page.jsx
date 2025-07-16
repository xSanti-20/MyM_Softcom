"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import ContentPage from "@/components/utils/ContentPage"
import axiosInstance from "@/lib/axiosInstance"
import RegisterWeighing from "./formweight"
import AlertModal from "@/components/AlertModal"
import { FaChartLine } from "react-icons/fa"

function Weighing() {
  const TitlePage = "Pesajes"
  const [weighingData, setWeighingData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWeighing, setEditingWeighing] = useState(null)
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesWeighing = [
    "ID",
    "Peso Actual",
    "Ganancia de Peso",
    "Fecha de Pesaje",
    "Nombre del Animal",
    "Registrado por",
  ]

  const closeAlert = () => {
    setAlertInfo({
      ...alertInfo,
      isOpen: false,
    })
  }

  async function fetchWeighings() {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Weighing/ConsultAllWeighings")

      if (response.status === 200) {
        const data = response.data.map((weighing) => ({
          id: weighing.id_Weighing,
          pesoActual: weighing.weight_Current != null ? weighing.weight_Current.toFixed(2) + " kg" : "Sin dato",
          gananciaPeso:
            weighing.weight_Gain != null
              ? (weighing.weight_Gain >= 0 ? "+" : "") + weighing.weight_Gain.toFixed(2) + " kg"
              : "Sin dato",
          fechaPesaje: weighing.fec_Weight ? new Date(weighing.fec_Weight).toLocaleDateString() : "Sin fecha",
          nombreAnimal: weighing.name_Piglet || "Sin nombre",
          registradoPor: weighing.nom_Users || "Desconocido",
          original: weighing,
        }))
        setWeighingData(data)
      }
    } catch (error) {
      setError("No se pudieron cargar los datos de pesaje.")
      setAlertInfo({
        isOpen: true,
        message: "No se pudieron cargar los datos de pesaje.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWeighings()
  }, [])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      const response = await axiosInstance.delete(`/api/Weighing/DeleteWeighing?id_Weighings=${numericId}`)

      fetchWeighings()
      setAlertInfo({
        isOpen: true,
        message:
          response.data.message ||
          "Pesaje eliminado correctamente. Se han recalculado los pesos y verificado las etapas.",
        type: "success",
      })
    } catch (error) {
      console.error("Error detallado al eliminar:", error)
      const errorMessage = error.response?.data?.message || "Error al eliminar el pesaje"
      setAlertInfo({
        isOpen: true,
        message: errorMessage,
        type: "error",
      })
    }
  }

  const handleUpdate = async (row) => {
    try {
      const weighingId = row.original.id_Weighing
      const response = await axiosInstance.get(`/api/Weighing/GetWeighingId?id_Weighings=${weighingId}`)

      if (response.status === 200) {
        const weighingData = response.data
        console.log("Pesaje a editar (datos completos):", weighingData)
        setEditingWeighing(weighingData)
        setIsModalOpen(true)
      } else {
        console.log("Usando datos parciales para editar:", row.original)
        setEditingWeighing(row.original)
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error("Error al obtener datos completos del pesaje:", error)
      setEditingWeighing(row.original)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingWeighing(null)
    }, 300)
  }

  const recalculatePigletWeight = async (row) => {
    try {
      if (!row || !row.original) {
        setAlertInfo({
          isOpen: true,
          message: "No se puede recalcular el peso para este registro.",
          type: "error",
        })
        return
      }

      // Obtener el ID del lechón desde el pesaje
      const weighingId = row.original.id_Weighing
      const weighingResponse = await axiosInstance.get(`/api/Weighing/GetWeighingId?id_Weighings=${weighingId}`)

      if (!weighingResponse.data || !weighingResponse.data.id_Piglet) {
        setAlertInfo({
          isOpen: true,
          message: "No se pudo obtener la información del lechón asociado.",
          type: "error",
        })
        return
      }

      const pigletId = weighingResponse.data.id_Piglet

      // Obtener los datos del lechón para conocer su peso inicial
      const pigletResponse = await axiosInstance.get(`/api/Piglet/GetPigletId?id_Piglet=${pigletId}`)
      const piglet = pigletResponse.data

      if (!piglet) {
        setAlertInfo({
          isOpen: true,
          message: "No se encontró el lechón asociado a este pesaje.",
          type: "error",
        })
        return
      }

      // Llamar al endpoint para recalcular el peso
      const response = await axiosInstance.post(
        `/api/Weighing/RecalculatePigletWeight?id_Piglet=${pigletId}&newInitialWeight=${piglet.weight_Initial}`,
      )

      setAlertInfo({
        isOpen: true,
        message:
          response.data.message ||
          "Peso del lechón recalculado correctamente. Se han actualizado todos los pesajes y verificado la etapa.",
        type: "success",
      })
      fetchWeighings()
    } catch (error) {
      console.error("Error al recalcular el peso:", error)
      const errorMessage = error.response?.data?.message || "Ocurrió un error al recalcular el peso del lechón."
      setAlertInfo({
        isOpen: true,
        message: errorMessage,
        type: "error",
      })
    }
  }

  const checkPigletStage = async (row) => {
    try {
      if (!row || !row.original) {
        setAlertInfo({
          isOpen: true,
          message: "No se puede verificar la etapa para este registro.",
          type: "error",
        })
        return
      }

      // Obtener el ID del lechón desde el pesaje
      const weighingId = row.original.id_Weighing
      const weighingResponse = await axiosInstance.get(`/api/Weighing/GetWeighingId?id_Weighings=${weighingId}`)

      if (!weighingResponse.data || !weighingResponse.data.id_Piglet) {
        setAlertInfo({
          isOpen: true,
          message: "No se pudo obtener la información del lechón asociado.",
          type: "error",
        })
        return
      }

      const pigletId = weighingResponse.data.id_Piglet
      const response = await axiosInstance.post(`/api/Piglet/CheckStage/${pigletId}`)

      if (response.data.success) {
        if (response.data.stageChanged) {
          setAlertInfo({
            isOpen: true,
            message: `${response.data.pigletName} cambió a etapa ${response.data.newStage}. Razón: ${response.data.transitionReason}`,
            type: "success",
          })
          fetchWeighings()
        } else {
          setAlertInfo({
            isOpen: true,
            message: `${response.data.pigletName}: ${response.data.message}`,
            type: "info",
          })
        }
      } else {
        setAlertInfo({
          isOpen: true,
          message: response.data.message || "Error al verificar la etapa",
          type: "error",
        })
      }
    } catch (error) {
      console.error("Error al verificar etapa:", error)
      setAlertInfo({
        isOpen: true,
        message: "Error al verificar la etapa del lechón.",
        type: "error",
      })
    }
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
        <>
          <div className="mb-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                <FaChartLine className="mr-2" />
                Sistema de Pesaje Inteligente
              </h3>
              <ul className="text-sm text-blue-600 space-y-1">
                <li>• La ganancia de peso se calcula automáticamente basada en el pesaje anterior</li>
                <li>• Las etapas se verifican automáticamente después de cada pesaje</li>
                <li>• Al eliminar un pesaje, se recalculan todos los pesos y se verifican las etapas</li>
                <li>• Los cambios de etapa se realizan por peso alcanzado o tiempo transcurrido</li>
              </ul>
            </div>
          </div>

          <ContentPage
            TitlePage={TitlePage}
            Data={weighingData}
            showDeleteButton={true} // ✅ Mostrar eliminar
            showToggleButton={false} // ✅ No mostrar toggle
            showStatusColumn={false} // ✅ IMPORTANTE: No mostrar columna
            showPdfButton={false} // ✅ Ocultar botón PDF solo en esta página

            TitlesTable={titlesWeighing}
            FormPage={() => (
              <RegisterWeighing
                refreshData={fetchWeighings}
                weighingToEdit={editingWeighing}
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
            endpoint="/api/Weighing/DeleteWeighing"
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            refreshData={fetchWeighings}
            extraActions={[
              {
                label: "Recalcular Peso",
                onClick: recalculatePigletWeight,
                icon: "calculator",
                tooltip: "Recalcula todos los pesajes del lechón y verifica la etapa",
              },
              {
                label: "Verificar Etapa",
                onClick: checkPigletStage,
                icon: "exchange-alt",
                tooltip: "Verifica si el lechón debe cambiar de etapa",
              },
            ]}
          />
        </>
      )}

      {error && <div className="text-red-600">{error}</div>}

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

export default Weighing