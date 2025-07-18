"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import axiosInstance from "@/lib/axiosInstance"
import RegisterClient from "./formclient"
import AlertModal from "@/components/AlertModal"
import DataTable from "@/components/utils/DataTable"
import { FaEye, FaEyeSlash } from "react-icons/fa"
import { Button } from "@/components/ui/button"

function ClientPage() {
  const TitlePage = "Clientes"
  const [clientData, setClientData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingClient, setEditingClient] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showInactiveRecords, setShowInactiveRecords] = useState(true)
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesClient = ["ID", "Nombres", "Apellidos", "Documento", "Teléfono", "Email"]

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

  async function fetchClients() {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Client/GetAll")

      if (response.status === 200) {
        const data = response.data.map((client) => {
          return {
            id: client.id_Clients, // ¡CORRECCIÓN: Usar id_Clients (minúscula) del JSON!
            names: client.names,
            surnames: client.surnames,
            document: client.document,
            phone: client.phone ?? "N/A",
            email: client.email ?? "N/A",
            isActive: client.status === "Activo",
            original: client,
          }
        })
        setClientData(data)
      }
    } catch (error) {
      setError("No se pudieron cargar los datos de los clientes.")
      showAlert("error", "No se pudieron cargar los datos de los clientes.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const numericId = Number.parseInt(id, 10)
      await axiosInstance.patch(`/api/Client/ToggleStatus/${numericId}`)

      fetchClients()
      showAlert("success", `Cliente ${currentStatus ? "desactivado" : "activado"} correctamente`)
    } catch (error) {
      console.error("Error al cambiar estado:", error)
      showAlert("error", "Error al cambiar el estado del cliente")
    }
  }

  const handleUpdate = async (row) => {
    try {
      // ¡CORRECCIÓN: Usar row.id que ya está mapeado a id_Clients!
      const clientId = row.id
      console.log("Intentando obtener cliente con ID:", clientId) // Para depuración

      const response = await axiosInstance.get(`/api/Client/GetAllByID${clientId}`)

      if (response.status === 200) {
        setEditingClient(response.data)
        setIsModalOpen(true)
      } else {
        setEditingClient(row.original)
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error("Error al obtener datos completos del cliente:", error)
      setEditingClient(row.original)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingClient(null)
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
          <div className="mb-4 flex gap-4 flex-wrap">
            <Button
              onClick={() => setShowInactiveRecords(!showInactiveRecords)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {showInactiveRecords ? <FaEyeSlash /> : <FaEye />}
              <span>{showInactiveRecords ? "Ocultar Inactivos" : "Mostrar Inactivos"}</span>
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-800">{TitlePage}</h1>
              <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                Agregar Cliente
              </Button>
            </div>

            <DataTable
              Data={clientData}
              TitlesTable={titlesClient}
              onUpdate={handleUpdate}
              onToggleStatus={handleToggleStatus}
              showDeleteButton={false}
              showToggleButton={true}
              showInactiveRecords={showInactiveRecords}
              showStatusColumn={true}
              extraActions={[]}
            />
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-black rounded-lg max-w-3xl w-full mx-4  overflow-y-auto">
                <RegisterClient
                  refreshData={fetchClients}
                  clientToEdit={editingClient}
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

export default ClientPage
