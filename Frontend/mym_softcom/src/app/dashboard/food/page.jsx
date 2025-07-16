"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import ContentPage from "@/components/utils/ContentPage"
import axiosInstance from "@/lib/axiosInstance"
import RegisterFood from "./formfood"
import AlertModal from "@/components/AlertModal"

function Food() {
  const TitlePage = "Alimento"
  const [foodData, setFoodData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingFood, setEditingFood] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesFood = [
    "ID",
    "Nombre",
    "Unidad de Medida",
    "Valor Unitario",
    "Etapa",
    "Racion del alimento",
    "Existencia",
  ]

  const closeAlert = () => {
    setAlertInfo({
      ...alertInfo,
      isOpen: false,
    })
  }

  const getStockAlertStyle = (Existence) => {
    const STOCK_MIN_THRESHOLD = 100

    if (Existence <= STOCK_MIN_THRESHOLD * 0.25) {
      return "text-red-600 font-bold bg-red-100 px-2 py-1 rounded"
    } else if (Existence <= STOCK_MIN_THRESHOLD * 0.5) {
      return "text-orange-600 font-bold bg-orange-100 px-2 py-1 rounded"
    } else if (Existence < STOCK_MIN_THRESHOLD) {
      return "text-yellow-600 font-bold bg-yellow-100 px-2 py-1 rounded"
    } else {
      return "text-green-600 font-bold bg-green-100 px-2 py-1 rounded"
    }
  }

  async function fetchFoods() {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/Api/Food/ConsultAllFoods")

      if (response.status === 200) {
        const STOCK_MIN_THRESHOLD = 100
        let lowStockCounter = 0

        const data = response.data.map((food) => {
          const isLowStock = food.Existence < STOCK_MIN_THRESHOLD
          if (isLowStock) lowStockCounter++

          return {
            id: food.id_Food,
            nombre: food.nam_Food,
            unidadExistente: food.und_Extent ?? "KG",
            valorUnitario: `$${food.vlr_Unit ?? 0}`,
            etapa: food.name_Stage || "Sin etapa",
            racion: `${food.rat_Food ?? 0} KG`,
            existencia: `${food.existence ?? 0} KG`,
            original: food,
          }
        })

        setFoodData(data)
        setLowStockCount(lowStockCounter)

        // Mostrar alerta si hay alimentos con stock bajo
        if (lowStockCounter > 0) {
          setAlertInfo({
            isOpen: true,
            message: `¡Atención! Hay ${lowStockCounter} alimento(s) con stock bajo.`,
            type: "warning",
          })
        }
      }
    } catch (error) {
      setError("No se pudieron cargar los datos del Alimento.")
      setAlertInfo({
        isOpen: true,
        message: "No se pudieron cargar los datos del Alimento.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFoods()
  }, [])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      await axiosInstance.delete(`/api/Food/DeleteFood?id_Food=${numericId}`)
      fetchFoods()
      setAlertInfo({
        isOpen: true,
        message: "Alimento eliminado correctamente",
        type: "success",
      })
    } catch (error) {
      console.error("Error detallado al eliminar:", error)
      setAlertInfo({
        isOpen: true,
        message: "Error al eliminar el alimento",
        type: "error",
      })
    }
  }

  const handleUpdate = (row) => {
    setEditingFood(row.original)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingFood(null)
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
          {/* Indicador de stock bajo en la parte superior */}
          {lowStockCount > 0 && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">
                    <strong>Alerta de Inventario:</strong> {lowStockCount} alimento(s) con stock bajo. Considera
                    realizar nuevas entradas.
                  </p>
                </div>
              </div>
            </div>
          )}

          <ContentPage
            TitlePage={TitlePage}
            Data={foodData}
            TitlesTable={titlesFood}
            showDeleteButton={true} // ✅ Mostrar eliminar
            showToggleButton={false} // ✅ No mostrar toggle
            showStatusColumn={false} // ✅ IMPORTANTE: No mostrar columna
            showPdfButton={false} // ✅ Ocultar botón PDF solo en esta página

            FormPage={() => (
              <RegisterFood
                refreshData={fetchFoods}
                foodToEdit={editingFood}
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
            endpoint="/Api/Food/DeleteFood"
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            refreshData={fetchFoods}
          />
        </>
      )}

      {error && <div className="text-red-600 text-center mt-4">{error}</div>}

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

export default Food
