"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import axiosInstance from "@/lib/axiosInstance"
import RegisterClient from "./formclient"
import AlertModal from "@/components/AlertModal"
import DataTable from "@/components/utils/DataTable"
import { FaEye, FaEyeSlash } from "react-icons/fa"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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

  // Función de formato de moneda
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "N/A"
    const num = Number.parseFloat(value)
    if (isNaN(num)) return "N/A"

    if (num % 1 === 0) {
      return num.toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    }
    return num.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // Función para crear badge de estado de clientes
  const createClientStatusBadge = (status) => {
    if (!status) status = "Activo" // Valor por defecto

    const statusLower = status.toLowerCase()
    let badgeClass = ""
    let displayText = status

    switch (statusLower) {
      case "activo":
        badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200"
        displayText = "Activo"
        break
      case "inactivo":
        badgeClass = "bg-slate-100 text-slate-600 border-slate-200"
        displayText = "Inactivo"
        break
      default:
        badgeClass = "bg-gray-100 text-gray-800 border-gray-200"
    }

    return (
      <Badge variant="outline" className={`${badgeClass} font-medium`}>
        {displayText}
      </Badge>
    )
  }

  // Títulos incluyendo el estado
  const clientTitles = [
    "ID",
    "Nombres",
    "Apellidos",
    "Documento",
    "Teléfono",
    "Email",
    "Estado",
    "Valor Total",
    "Recaudo Total",
    "Deuda Total",
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

  async function fetchClients() {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Client/GetClientsWithSalesSummary")

      if (response.status === 200) {
        const data = response.data.map((client) => {
          return {
            id: client.id_Clients,
            names: client.names,
            surnames: client.surnames,
            document: client.document,
            phone: client.phone ?? "N/A",
            email: client.email ?? "N/A",
            status: createClientStatusBadge(client.status || "Activo"),
            total_sales_value: formatCurrency(client.totalSalesValue),
            total_raised: formatCurrency(client.totalRaised),
            total_debt: formatCurrency(client.totalDebt),
            isActive: (client.status || "Activo").toLowerCase() === "activo",
            original: client,
            searchableIdentifier: `${client.names} ${client.surnames} ${client.document} ${client.status || "Activo"}`,
          }
        })

        // Filtrar por estado si es necesario
        const filteredData = showInactiveRecords ? data : data.filter((client) => client.isActive)
        setClientData(filteredData)
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
  }, [showInactiveRecords])

  const handleToggleStatus = async (id, currentRow) => {
    try {
      const numericId = Number.parseInt(id, 10)
      await axiosInstance.patch(`/api/Client/ToggleStatus/${numericId}`)

      fetchClients()
      const newStatus = currentRow.isActive ? "desactivado" : "activado"
      showAlert("success", `Cliente ${newStatus} correctamente`)
    } catch (error) {
      console.error("Error al cambiar estado:", error)
      showAlert("error", "Error al cambiar el estado del cliente")
    }
  }

  const handleUpdate = async (row) => {
    try {
      const clientId = row.id
      const response = await axiosInstance.get(`/api/Client/${clientId}`)

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

  // Configuración del header del DataTable
  const headerActions = {
    title: "Clientes",
    button: (
      <div className="flex items-center space-x-3">
        <Button
          onClick={() => setShowInactiveRecords(!showInactiveRecords)}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2 border-slate-200 hover:bg-slate-50"
        >
          {showInactiveRecords ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
          <span className="hidden sm:inline">{showInactiveRecords ? "Ocultar Inactivos" : "Mostrar Inactivos"}</span>
        </Button>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Cliente</span>
        </Button>
      </div>
    ),
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
        <div className="container mx-auto p-6">
          <DataTable
            Data={clientData}
            TitlesTable={clientTitles}
            onUpdate={handleUpdate}
            onToggleStatus={handleToggleStatus}
            showDeleteButton={false}
            showToggleButton={true}
            showPdfButton={false}
            extraActions={[]}
            headerActions={headerActions}
          />

          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
        </div>
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
