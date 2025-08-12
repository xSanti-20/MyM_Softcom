"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import axiosInstance from "@/lib/axiosInstance"
import CesionForm from "./formcesion"
import AlertModal from "@/components/AlertModal"
import DataTable from "@/components/utils/DataTable"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

function CesionsPage() {
  const TitlePage = "Cesiones"
  const [cesionsData, setCesionsData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesCesion = [
    "ID",
    "Fecha Cesión",
    "Cliente Cedente",
    "Cliente Cesionario",
    "Lote",
    "Proyecto",
    "Motivo",
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

  const createStatusBadge = (status) => {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200 font-medium">
        Completada
      </Badge>
    )
  }

  async function fetchCesions() {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Cesion/GetAll")

      if (response.status === 200) {
        const data = response.data.map((cesion) => ({
          id: cesion.id_Cesiones,
          cesion_date: cesion.fecha_Cesion ? new Date(cesion.fecha_Cesion).toLocaleDateString() : "N/A",
          client_cedente: cesion.cedente_Nombre || "N/A",
          client_cesionario: cesion.cesionario_Nombre || "N/A",
          lot: cesion.lote_Nombre || "N/A",
          project: cesion.proyecto_Nombre || "N/A",
          reason: cesion.motivo || "N/A",
          status: createStatusBadge("Completada"),
          original: cesion,
          searchableIdentifier: `${cesion.id_Cesiones} ${cesion.cedente_Nombre} ${cesion.cesionario_Nombre} ${cesion.lote_Nombre} ${cesion.motivo}`,
        }))
        setCesionsData(data)
      }
    } catch (error) {
      console.error("Error al cargar cesiones:", error)
      setError("No se pudieron cargar los datos de las cesiones.")
      showAlert("error", "No se pudieron cargar los datos de las cesiones.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCesions()
  }, [])

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const headerActions = {
    title: TitlePage,
    button: (
      <Button
        onClick={() => setIsModalOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
      >
        <Plus className="w-4 h-4 mr-2" />
        <span className="text-sm">Nueva Cesión</span>
      </Button>
    ),
  }

  return (
    <PrivateNav>
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
          <div className="flex flex-col items-center">
            <Image src="/assets/img/mymsoftcom.png" alt="Cargando..." width={80} height={80} className="animate-spin" />
            <p className="text-lg text-gray-700 font-semibold mt-2">Cargando cesiones...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="overflow-x-auto">
            <DataTable
              Data={cesionsData}
              TitlesTable={titlesCesion}
              showDeleteButton={false}
              showToggleButton={false}
              showPdfButton={false}
              showUpdateButton={false}
              headerActions={headerActions}
            />
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <CesionForm refreshData={fetchCesions} closeModal={handleCloseModal} showAlert={showAlert} />
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

export default CesionsPage
