"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import ContentPage from "@/components/utils/ContentPage"
import axiosInstance from "@/lib/axiosInstance"
import RegisterPlan from "./formplanes"
import AlertModal from "@/components/AlertModal"

function PlanPage() {
  const TitlePage = "Planes"
  const [planData, setPlanData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingPlan, setEditingPlan] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false) // Mantener este estado, ContentPage lo usa
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesPlan = ["ID", "Nombre", "Número de Cuotas"]

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

  async function fetchPlans() {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Plan/GetAllPlans") // Endpoint correcto

      if (response.status === 200) {
        const data = response.data.map((plan) => ({
          id: plan.id_Plans,
          name: plan.name,
          number_quotas: plan.number_quotas ?? "N/A", // Mostrar N/A si es null
          original: plan,
          // Campo combinado para búsqueda rápida (si es necesario)
          searchableIdentifier: `${plan.name || ""} ${plan.number_quotas || ""}`,
        }))
        setPlanData(data)
      }
    } catch (error) {
      setError("No se pudieron cargar los datos de los planes.")
      showAlert("error", "No se pudieron cargar los datos de los planes.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      await axiosInstance.delete(`/api/Plan/DeletePlan/${numericId}`) // Endpoint correcto
      fetchPlans() // Refrescar planes
      showAlert("success", "Plan eliminado correctamente")
    } catch (error) {
      console.error("Error detallado al eliminar:", error)
      showAlert("error", "Error al eliminar el plan")
    }
  }

  const handleUpdate = async (row) => {
    try {
      const planId = row.id
      console.log("Intentando obtener plan con ID:", planId)

      const response = await axiosInstance.get(`/api/Plan/GetPlanID/${planId}`) // Endpoint correcto

      if (response.status === 200) {
        setEditingPlan(response.data)
        setIsModalOpen(true) // Abre el modal de ContentPage
      } else {
        setEditingPlan(row.original)
        setIsModalOpen(true) // Abre el modal de ContentPage
      }
    } catch (error) {
      console.error("Error al obtener datos completos del plan:", error)
      setEditingPlan(row.original)
      setIsModalOpen(true) // Abre el modal de ContentPage
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false) // Cierra el modal de ContentPage
    setTimeout(() => {
      setEditingPlan(null)
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
            Data={planData}
            TitlesTable={titlesPlan}
            showDeleteButton={true}
            showToggleButton={false}
            showStatusColumn={false}
            showPdfButton={false}
            FormPage={() => (
              <RegisterPlan
                refreshData={fetchPlans}
                planToEdit={editingPlan}
                onCancelEdit={handleCloseModal}
                closeModal={handleCloseModal}
                showAlert={showAlert}
              />
            )}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            endpoint="/api/Plan/DeletePlan"
            isModalOpen={isModalOpen} // Pasar el estado del modal a ContentPage
            setIsModalOpen={setIsModalOpen} // Pasar la función para controlar el modal
            refreshData={fetchPlans}
          />

          {/* ✅ ELIMINADO: El modal duplicado que causaba el problema */}
          {/* {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <RegisterPlan
                  refreshData={fetchPlans}
                  planToEdit={editingPlan}
                  onCancelEdit={handleCloseModal}
                  closeModal={handleCloseModal}
                  showAlert={showAlert}
                />
              </div>
            </div>
          )} */}
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

export default PlanPage
