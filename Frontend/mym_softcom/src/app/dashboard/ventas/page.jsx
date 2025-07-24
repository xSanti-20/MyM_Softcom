"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import ContentPage from "@/components/utils/ContentPage"
import axiosInstance from "@/lib/axiosInstance"
import RegisterSale from "./formventas"
import AlertModal from "@/components/AlertModal"

function SalesPage() {
  const TitlePage = "Ventas"
  const [salesData, setSalesData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingSale, setEditingSale] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesSale = [
    "ID",
    "Fecha Venta",
    "Valor Total",
    "Cuota Inicial",
    "Recaudo Total",
    "Deuda Total",
    "Valor Cuota",
    "Estado",
    "Cliente",
    "Lote",
    "Vendedor",
    "Plan",
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

  async function fetchSales() {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Sale/GetAllSales")

      if (response.status === 200) {
        const data = response.data.map((sale) => ({
          id: sale.id_Sales,
          sale_date: sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : "N/A",

          total_value: sale.total_value?.toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }) || "N/A",

          initial_payment: sale.initial_payment?.toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }) || "N/A",

          total_raised: sale.total_raised?.toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }) || "N/A",

          total_debt: sale.total_debt?.toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }) || "N/A",

          quota_value: sale.quota_value?.toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }) || "N/A",

          status: sale.status || "N/A",
          client: sale.client ? `${sale.client.names} ${sale.client.surnames}` : "N/A",

          lot: sale.lot
            ? `${sale.lot.block}-${sale.lot.lot_number} ${sale.lot.project?.name || "N/A"}`
            : "N/A",

          user: sale.user?.nom_Users || "N/A",
          plan: sale.plan?.name || "N/A",
          original: sale,
          searchableIdentifier: `${sale.id_Sales} ${sale.client?.names} ${sale.client?.surnames} ${sale.lot?.block}-${sale.lot?.lot_number} ${sale.lot?.project?.name} ${sale.status} ${sale.plan?.name}`,
        }))
        setSalesData(data)
      }
    } catch (error) {
      setError("No se pudieron cargar los datos de las ventas.")
      showAlert("error", "No se pudieron cargar los datos de las ventas.")
    } finally {
      setIsLoading(false)
    }
  }


  useEffect(() => {
    fetchSales()
  }, [])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      await axiosInstance.delete(`/api/Sale/DeleteSale/${numericId}`)
      fetchSales()
      showAlert("success", "Venta eliminada correctamente. El lote asociado ha sido liberado.")
    } catch (error) {
      console.error("Error detallado al eliminar:", error)
      showAlert("error", "Error al eliminar la venta.")
    }
  }

  const handleUpdate = async (row) => {
    try {
      const saleId = row.id
      const response = await axiosInstance.get(`/api/Sale/GetSaleID/${saleId}`)

      if (response.status === 200) {
        setEditingSale(response.data)
        setIsModalOpen(true)
      } else {
        setEditingSale(row.original)
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error("Error al obtener datos completos de la venta:", error)
      setEditingSale(row.original)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingSale(null)
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
          <ContentPage
            TitlePage={TitlePage}
            Data={salesData}
            TitlesTable={titlesSale}
            showDeleteButton={true}
            showToggleButton={false}
            showStatusColumn={true}
            showPdfButton={false}
            FormPage={() => (
              <RegisterSale
                refreshData={fetchSales}
                saleToEdit={editingSale}
                onCancelEdit={handleCloseModal}
                closeModal={handleCloseModal}
                showAlert={showAlert}
              />
            )}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            endpoint="/api/Sale/DeleteSale"
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            refreshData={fetchSales}
          />
        </>
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

export default SalesPage
