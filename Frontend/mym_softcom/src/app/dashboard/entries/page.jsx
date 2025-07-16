"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import ContentPage from "@/components/utils/ContentPage"
import axiosInstance from "@/lib/axiosInstance"
import RegisterEntryPage from "./formentries"
import AlertModal from "@/components/AlertModal"

function Entries() {
  const TitlePage = "Entradas de Alimento"
  const [entryData, setEntryData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingEntry, setEditingEntry] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const BULTO_TO_KG = 40 // Constante de conversión

  const titlesEntry = [
    "ID",
    "Valor Unitario",
    "Fecha Entrada",
    "Fecha Expiración",
    "Cantidad (Bultos)",
    "Equivalente (KG)",
    "Nombre Alimento",
    "Valor Total",
  ]

  const closeAlert = () => {
    setAlertInfo({
      ...alertInfo,
      isOpen: false,
    })
  }

  async function fetchEntries() {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Entries/ConsultAllEntries")

      if (response.status === 200) {
        const data = response.data.map((entry) => ({
          id: entry.id_Entries,
          valorUnitario: `$${entry.vlr_Unitary}`,
          fechaEntrada: entry.fec_Entries ? new Date(entry.fec_Entries).toLocaleDateString() : "Sin fecha",
          fechaVencimiento: entry.fec_Expiration ? new Date(entry.fec_Expiration).toLocaleDateString() : "Sin fecha",
          cantidadBultos: `${entry.can_Food ?? 0} bultos`,
          equivalenteKG: `${(entry.can_Food ?? 0) * BULTO_TO_KG} KG`,
          nombreAlimento: entry.nam_Food || "Sin alimento",
          valorTotal: `$${entry.vlr_Total || 0}`,
          original: entry,
        }))
        setEntryData(data)
      }
    } catch (error) {
      setError("No se pudieron cargar las entradas.")
      setAlertInfo({
        isOpen: true,
        message: "No se pudieron cargar las entradas.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)

      // Obtener información de la entrada antes de eliminarla
      const entryToDelete = entryData.find((entry) => entry.id === numericId)
      const kgToRemove = entryToDelete ? (entryToDelete.original.can_Food || 0) * BULTO_TO_KG : 0

      await axiosInstance.delete(`/api/Entries/DeleteEntries?id_Entries=${numericId}`)

      fetchEntries()
      setAlertInfo({
        isOpen: true,
        message: `Entrada eliminada correctamente. Se removieron ${kgToRemove} KG del inventario.`,
        type: "success",
      })
    } catch (error) {
      console.error("Error al eliminar entrada:", error)
      setAlertInfo({
        isOpen: true,
        message: "Error al eliminar la entrada",
        type: "error",
      })
    }
  }

  const handleUpdate = (row) => {
    setEditingEntry(row.original)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingEntry(null)
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
        <>
          {/* Información del sistema de conversión */}
          <div className="bg-blue-50 p-4 rounded-md mb-4">
            <h3 className="font-semibold text-blue-800 mb-2">Sistema de Conversión de Unidades</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white p-3 rounded">
                <strong>Entrada:</strong> Se registra en BULTOS
                <br />
                <span className="text-gray-600">Unidad de compra estándar</span>
              </div>
              <div className="bg-white p-3 rounded">
                <strong>Inventario:</strong> Se almacena en KG
                <br />
                <span className="text-gray-600">1 BULTO = {BULTO_TO_KG} KG</span>
              </div>
            </div>
          </div>

          <ContentPage
            TitlePage={TitlePage}
            Data={entryData}
            TitlesTable={titlesEntry}
            showDeleteButton={true} // ✅ Mostrar eliminar
            showToggleButton={false} // ✅ No mostrar toggle
            showStatusColumn={false} // ✅ IMPORTANTE: No mostrar columna
            showPdfButton={false} // ✅ Ocultar botón PDF solo en esta página

            FormPage={() => (
              <RegisterEntryPage
                refreshData={fetchEntries}
                entryToEdit={editingEntry}
                onCancelEdit={handleCloseModal}
                closeModal={handleCloseModal}
                refreshFoods={() => { }} // Si necesitas refrescar alimentos
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
            endpoint="/api/Entries/DeleteEntries"
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            refreshData={fetchEntries}
          />
        </>
      )}

      {error && <div className="text-red-600">{error}</div>}

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

export default Entries
