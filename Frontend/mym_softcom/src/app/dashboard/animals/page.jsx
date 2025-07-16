"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import axiosInstance from "@/lib/axiosInstance"
import RegisterPiglet from "./formpiglet"
import StageControlPanel from "@/components/StageControlPanel"
import AlertModal from "@/components/AlertModal"
import ExportAllPigletsButton from "@/components/ExportAllPigletsButton"
import DataTable from "@/components/utils/DataTable"
import { FaExchangeAlt, FaCheckCircle, FaEye, FaEyeSlash } from "react-icons/fa"
import { Button } from "@/components/ui/button"

function Piglet() {
  const TitlePage = "Animales"
  const [pigletData, setPigletData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingPiglet, setEditingPiglet] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showStagePanel, setShowStagePanel] = useState(false)
  const [showInactiveRecords, setShowInactiveRecords] = useState(true)
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesPiglet = [
    "ID",
    "Nombre",
    "Peso Acumulado",
    "Nacimiento",
    "Peso Inicial",
    "Sexo",
    "Corral",
    "Raza",
    "Etapa",
    "Días en Etapa",
    "Placa Sena",
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

  async function fetchPiglets() {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Piglet/ConsultAllPiglets")

      if (response.status === 200) {
        const data = response.data.map((piglet) => {
          const daysInStage = piglet.sta_Date
            ? Math.floor((new Date() - new Date(piglet.sta_Date)) / (1000 * 60 * 60 * 24))
            : 0

          const formattedWeightInitial =
            typeof piglet.weight_Initial === "number" ? piglet.weight_Initial.toFixed(1) : "Sin dato"

          const formattedAcumWeight =
            typeof piglet.acum_Weight === "number" ? piglet.acum_Weight.toFixed(1) : "Sin dato"

          return {
            id: piglet.id_Piglet,
            nombre: piglet.name_Piglet,
            pesoAcumulado: formattedAcumWeight,
            nacimiento: piglet.fec_Birth ? new Date(piglet.fec_Birth).toLocaleDateString() : "Sin fecha",
            pesoInicial: formattedWeightInitial,
            sexo: piglet.sex_Piglet ?? "Sin dato",
            corral: piglet.des_Corral || "Sin corral",
            raza: piglet.nam_Race || "Sin raza",
            etapa: piglet.name_Stage || "Sin etapa",
            diasEnEtapa: daysInStage > 0 ? `${daysInStage} días` : "Sin fecha",
            placasena: piglet.placa_Sena ?? "Sin dato",
            isActive: piglet.is_Active ?? true,
            original: piglet,
          }
        })
        setPigletData(data)
      }
    } catch (error) {
      setError("No se pudieron cargar los datos de los lechones.")
      showAlert("error", "No se pudieron cargar los datos de los lechones.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPiglets()
  }, [])

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const numericId = Number.parseInt(id, 10)
      const newStatus = !currentStatus

      await axiosInstance.put(`/api/Piglet/ToggleStatus?id_Piglet=${numericId}&isActive=${newStatus}`)

      fetchPiglets()
      showAlert("success", `Lechón ${newStatus ? "activado" : "desactivado"} correctamente`)
    } catch (error) {
      console.error("Error al cambiar estado:", error)
      showAlert("error", "Error al cambiar el estado del lechón")
    }
  }

  const handleUpdate = async (row) => {
    try {
      const pigletId = row.original.id_Piglet
      const response = await axiosInstance.get(`/api/Piglet/GetPigletId?id_Piglet=${pigletId}`)

      if (response.status === 200) {
        setEditingPiglet(response.data)
        setIsModalOpen(true)
      } else {
        setEditingPiglet(row.original)
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error("Error al obtener datos completos del lechón:", error)
      setEditingPiglet(row.original)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingPiglet(null)
    }, 300)
  }

  const checkAllStages = async () => {
    try {
      setIsLoading(true)
      const response = await axiosInstance.post("/api/Piglet/CheckAllStages")

      if (response.data) {
        const { totalProcessed, stageChanges, weightDeficient, errors } = response.data

        let message = `Verificación completada: ${totalProcessed} lechones procesados.`
        if (stageChanges > 0) {
          message += ` ${stageChanges} cambios de etapa realizados.`
        }
        if (weightDeficient > 0) {
          message += ` ${weightDeficient} lechones con peso deficiente.`
        }
        if (errors > 0) {
          message += ` ${errors} errores encontrados.`
        }

        showAlert(stageChanges > 0 ? "success" : "info", message)

        if (stageChanges > 0) {
          fetchPiglets()
        }
      }
    } catch (error) {
      console.error("Error al verificar todas las etapas:", error)
      showAlert("error", "Error al verificar las etapas de todos los lechones.")
    } finally {
      setIsLoading(false)
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
          <div className="mb-4 flex gap-4 flex-wrap">
            <button
              onClick={() => setShowStagePanel(!showStagePanel)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <FaExchangeAlt />
              <span>{showStagePanel ? "Ocultar" : "Mostrar"} Control de Etapas</span>
            </button>

            <button
              onClick={checkAllStages}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <FaCheckCircle />
              <span>Verificar Todas las Etapas</span>
            </button>

            <Button
              onClick={() => setShowInactiveRecords(!showInactiveRecords)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {showInactiveRecords ? <FaEyeSlash /> : <FaEye />}
              <span>{showInactiveRecords ? "Ocultar Inactivos" : "Mostrar Inactivos"}</span>
            </Button>

            <ExportAllPigletsButton pigletsData={pigletData.map((p) => p.original)} showAlert={showAlert} />
          </div>

          {showStagePanel && (
            <div className="mb-6">
              <StageControlPanel showAlert={showAlert} onStageChange={fetchPiglets} />
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-800">{TitlePage}</h1>
              <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                Agregar Lechón
              </Button>
            </div>

            {/* ✅ DataTable SIN los botones de Recalcular y Verificar Etapa */}
            <DataTable
              Data={pigletData}
              TitlesTable={titlesPiglet}
              onUpdate={handleUpdate}
              onToggleStatus={handleToggleStatus}
              showDeleteButton={false}
              showToggleButton={true}
              statusField="isActive"
              showInactiveRecords={showInactiveRecords}
              showStatusColumn={true}
              extraActions={[]} // ✅ ARRAY VACÍO - Sin botones extra
            />
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <RegisterPiglet
                  refreshData={fetchPiglets}
                  pigletToEdit={editingPiglet}
                  onCancelEdit={handleCloseModal}
                  closeModal={handleCloseModal}
                  showAlert={showAlert}
                />
              </div>
            </div>
          )}
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

export default Piglet
