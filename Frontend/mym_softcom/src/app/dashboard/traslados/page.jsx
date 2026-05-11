"use client"

import { useState, useEffect, useCallback } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import Image from 'next/image';
import axiosInstance from "@/lib/axiosInstance"
import CreateTransfer from "./formtraslados"
import EditTransfer from "./edittraslados"
import AlertModal from "@/components/AlertModal"
import DataTable from "@/components/utils/DataTable"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2 } from "lucide-react"

function TransfersPage() {
  const TitlePage = "Traslados de Cartera"
  const [transferData, setTransferData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingTransfer, setEditingTransfer] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
  })

  const titlesTransfer = [
    "ID",
    "Fecha Traslado",
    "Tipo",
    "Monto",
    "Cliente",
    "Documento",
    "Lote Origen",
    "Lote Destino",
    "Estado",
    "Acciones",
  ]

  const showAlert = (type, message) => {
    setAlertInfo({
      isOpen: true,
      message,
      type,
    })
  }

  const handleCloseAlert = () => {
    setAlertInfo({
      isOpen: false,
      message: "",
      type: "success",
    })
  }

  // Obtener traslados del servidor
  const fetchTransfers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get("api/Transfer/GetAllTransfers", { withCredentials: true })
      if (response.data && Array.isArray(response.data)) {
        const formattedData = response.data.map((transfer) => ({
          ID: transfer.id_Transfers,
          "Fecha Traslado": new Date(transfer.transfer_date).toLocaleDateString('es-CO'),
          Tipo: transfer.type,
          Monto: new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
          }).format(transfer.amount_transferred),
          Cliente: `${transfer.sale_origen?.client?.names} ${transfer.sale_origen?.client?.surnames}` || "N/A",
          Documento: transfer.sale_origen?.client?.document || "N/A",
          "Lote Origen": `${transfer.sale_origen?.lot?.block}-${transfer.sale_origen?.lot?.lot_number} (${transfer.sale_origen?.lot?.project?.name})` || "N/A",
          "Lote Destino": `${transfer.sale_destino?.lot?.block}-${transfer.sale_destino?.lot?.lot_number} (${transfer.sale_destino?.lot?.project?.name})` || "N/A",
          Estado: transfer.status,
          Acciones: (
            <div className="flex gap-2">
              <button
                onClick={() => handleEditTransfer(transfer)}
                className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                title="Editar"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => handleDeleteTransfer(transfer.id_Transfers)}
                className="p-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ),
          Data: transfer,
        }))
        setTransferData(formattedData)
      }
    } catch (err) {
      setError(err.message || "Error al cargar traslados")
      console.error("Error fetching transfers:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransfers()
  }, [fetchTransfers])

  const handleOpenModal = () => {
    setEditingTransfer(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setEditingTransfer(null)
    setIsModalOpen(false)
  }

  const handleCreateTransfer = async (formData) => {
    try {
      const response = await axiosInstance.post("api/Transfer/CreateTransfer", formData, {
        withCredentials: true,
      })

      if (response.data.success) {
        showAlert("success", "✅ Traslado creado exitosamente")
        handleCloseModal()
        fetchTransfers()
      } else {
        showAlert("error", `❌ Error: ${response.data.message}`)
      }
    } catch (error) {
      console.error("Error creating transfer:", error)
      showAlert("error", `❌ Error al crear traslado: ${error.response?.data?.message || error.message}`)
    }
  }

  const handleEditTransfer = (transfer) => {
    setEditingTransfer(transfer)
    setIsEditModalOpen(true)
  }

  const handleUpdateTransfer = async (updateData) => {
    try {
      const response = await axiosInstance.put(
        `api/Transfer/UpdateTransfer/${updateData.idTransfer}`,
        { accountingNote: updateData.accountingNote },
        { withCredentials: true }
      )

      if (response.data.success) {
        showAlert("success", "✅ Nota contable actualizada exitosamente")
        setIsEditModalOpen(false)
        setEditingTransfer(null)
        fetchTransfers()
      } else {
        showAlert("error", `❌ Error: ${response.data.message}`)
      }
    } catch (error) {
      console.error("Error updating transfer:", error)
      showAlert("error", `❌ Error al actualizar: ${error.response?.data?.message || error.message}`)
    }
  }

  const handleDeleteTransfer = async (id) => {
    // Mostrar confirmación
    const confirmed = window.confirm("¿Está seguro de que desea eliminar este traslado? Se revertirán todos los cambios.")
    
    if (!confirmed) return

    try {
      const response = await axiosInstance.delete(`api/Transfer/DeleteTransfer/${id}`, {
        withCredentials: true,
      })

      if (response.data.success) {
        showAlert("success", "✅ Traslado eliminado exitosamente. Los cambios fueron revertidos.")
        fetchTransfers()
      } else {
        showAlert("error", `❌ Error: ${response.data.message}`)
      }
    } catch (error) {
      console.error("Error deleting transfer:", error)
      showAlert("error", `❌ Error al eliminar traslado: ${error.response?.data?.message || error.message}`)
    }
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
            <p className="text-lg text-gray-700 font-semibold mt-2">Cargando traslados...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="container mx-auto px-4 sm:px-6 py-6">
          
          {/* Header y botón */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#947c4c]">{TitlePage}</h1>
              <p className="text-gray-600 text-sm mt-1">Gestión de traslados de cartera entre lotes</p>
            </div>

            <Button
              onClick={handleOpenModal}
              className="bg-[#947c4c] hover:bg-[#7a6338] text-white flex items-center space-x-2 w-full md:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Traslado</span>
            </Button>
          </div>

          {/* Tabla responsiva */}
          <div className="overflow-x-auto">
            {transferData.length > 0 ? (
              <DataTable
                Data={transferData}
                TitlesTable={titlesTransfer}
                showDeleteButton={false}
                showToggleButton={false}
                showPdfButton={false}
              />
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500 mb-4">No hay traslados registrados</p>
                <Button
                  onClick={handleOpenModal}
                  className="bg-[#947c4c] hover:bg-[#7a6338] text-white"
                >
                  Crear Primer Traslado
                </Button>
              </div>
            )}
          </div>

          {/* Modal */}
          {isModalOpen && (
            <CreateTransfer
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onSuccess={handleCreateTransfer}
              editingData={editingTransfer}
            />
          )}

          {/* Edit Modal */}
          {editingTransfer && (
            <EditTransfer
              isOpen={isEditModalOpen}
              transfer={editingTransfer}
              onClose={() => {
                setIsEditModalOpen(false)
                setEditingTransfer(null)
              }}
              onSuccess={handleUpdateTransfer}
            />
          )}
        </div>
      )}

      {/* Alert Modal */}
      {alertInfo.isOpen && (
        <AlertModal
          isOpen={alertInfo.isOpen}
          onClose={handleCloseAlert}
          message={alertInfo.message}
          type={alertInfo.type}
        />
      )}
    </PrivateNav>
  )
}

export default TransfersPage
