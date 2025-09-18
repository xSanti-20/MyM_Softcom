"use client"

import { useState, useEffect, useCallback } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import axiosInstance from "@/lib/axiosInstance"
import RegisterPlan from "./formplanes"
import Image from 'next/image';
import AlertModal from "@/components/AlertModal"
import DataTable from "@/components/utils/DataTable"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

function PlanPage() {
  const TitlePage = "Planes"
  const [planData, setPlanData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingPlan, setEditingPlan] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
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

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Plan/GetAllPlans")

      if (response.status === 200) {
        const data = response.data.map((plan) => ({
          id: plan.id_Plans,
          name: plan.name,
          number_quotas: plan.number_quotas ?? "N/A",
          original: plan,
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
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      await axiosInstance.delete(`/api/Plan/DeletePlan/${numericId}`)
      fetchPlans()
      showAlert("success", "Plan eliminado correctamente")
    } catch (error) {
      console.error("Error detallado al eliminar:", error)
      showAlert("error", "Error al eliminar el plan")
    }
  }

  const handleUpdate = async (row) => {
    try {
      const planId = row.id
      const response = await axiosInstance.get(`/api/Plan/GetPlanID/${planId}`)

      if (response.status === 200) {
        setEditingPlan(response.data)
        setIsModalOpen(true)
      } else {
        setEditingPlan(row.original)
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error("Error al obtener datos completos del plan:", error)
      setEditingPlan(row.original)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingPlan(null)
    }, 300)
  }

  // Configuración del header del DataTable
  const headerActions = {
    title: TitlePage,
    button: (
      <Button
        onClick={() => setIsModalOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
      >
        <Plus className="w-4 h-4" />
        <span>Agregar Plan</span>
      </Button>
    ),
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
            <p className="text-lg text-gray-700 font-semibold mt-2">Cargando...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="container mx-auto p-6">
          <DataTable
            Data={planData}
            TitlesTable={titlesPlan}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            showDeleteButton={true}
            showToggleButton={false}
            showStatusColumn={false}
            showPdfButton={false}
            headerActions={headerActions}
          />

          {isModalOpen && (
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

export default PlanPage
