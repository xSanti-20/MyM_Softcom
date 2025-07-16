"use client"

import { useState, useEffect } from "react"
import styles from "./page.module.css"
import axiosInstance from "@/lib/axiosInstance"
import {
  FaUtensils,
  FaClipboardList,
  FaWeightHanging,
  FaUser,
  FaPiggyBank,
  FaAppleAlt,
  FaCalendarAlt,
  FaCalculator,
  FaInfoCircle,
  FaExclamationTriangle,
} from "react-icons/fa"
import { Button } from "@/components/ui/button"
import { getStageByWeight, getRecommendedConsumption, FEEDING_PLAN } from "@/components/utils/FeedingPlan"

async function SendData(body, isEditing = false) {
  if (isEditing) {
    const response = await axiosInstance.put("/api/Feeding/UpdateFeeding", body)
    return response
  } else {
    const response = await axiosInstance.post("/api/Feeding/CreateFeeding", body)
    return response
  }
}

function RegisterFeedingPage({ refreshData, feedingToEdit, onCancelEdit, closeModal, showAlert }) {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [corrals, setCorrals] = useState([])
  const [foods, setFoods] = useState([])
  const [selectedCorral, setSelectedCorral] = useState(null)
  const [feedingCalculation, setFeedingCalculation] = useState(null)
  const [stockAlert, setStockAlert] = useState(null)

  const [formData, setFormData] = useState({
    Can_Food: "", // Ración por animal
    Obc_Feeding: "",
    Sum_Food: "", // Se calculará automáticamente
    id_Users: "",
    Dat_Feeding: "",
    id_Corral: "",
    id_Food: "",
  })

  const isEditing = !!feedingToEdit

  useEffect(() => {
    async function fetchData() {
      try {
        const [usersRes, corralsRes, foodsRes] = await Promise.all([
          axiosInstance.get("/api/User/ConsultAllUser"),
          axiosInstance.get("/api/Corral/ConsultAllCorrals"),
          axiosInstance.get("/api/Food/ConsultAllFoods"),
        ])
        const activeUsers = usersRes.data.filter(user => user.status !== "Inactivo")
        setUsers(activeUsers)
        setCorrals(corralsRes.data)
        setFoods(foodsRes.data)
      } catch (error) {
        console.error("Error al obtener datos:", error)
        if (showAlert) {
          showAlert("No se pudieron cargar las opciones necesarias.", "error")
        }
      }
    }

    fetchData()
  }, [showAlert])

  useEffect(() => {
    if (
      isEditing &&
      feedingToEdit &&
      foods.length > 0 &&
      corrals.length > 0 &&
      users.length > 0
    ) {
      console.log("feedingToEdit recibido:", feedingToEdit)

      setFormData({
        Can_Food: feedingToEdit.can_Food?.toString() || "",
        Obc_Feeding: feedingToEdit.obc_Feeding || "",
        Sum_Food: feedingToEdit.sum_Food?.toString() || "",
        id_Users: feedingToEdit.id_Users?.toString() || "",
        Dat_Feeding: feedingToEdit.dat_Feeding?.split("T")[0] || "",
        id_Corral: feedingToEdit.id_Corral?.toString() || "",
        id_Food: feedingToEdit.id_Food?.toString() || "",
      })
    }
  }, [isEditing, feedingToEdit, foods, corrals, users])


  // Calcular automáticamente cuando se selecciona corral y ración
  useEffect(() => {
    if (formData.id_Corral && formData.Can_Food) {
      const corral = corrals.find((c) => c.id_Corral === Number.parseInt(formData.id_Corral))
      if (corral && corral.numberOfAnimals) {
        const rationPerAnimal = Number.parseFloat(formData.Can_Food)
        const totalFood = rationPerAnimal * corral.numberOfAnimals

        setFormData((prev) => ({
          ...prev,
          Sum_Food: totalFood.toFixed(2),
        }))

        // Calcular información del plan de alimentación
        if (corral.averageWeight) {
          const stage = getStageByWeight(corral.averageWeight)
          const recommendedConsumption = stage ? getRecommendedConsumption(corral.averageWeight, stage) : null

          setFeedingCalculation({
            stage,
            averageWeight: corral.averageWeight,
            numberOfAnimals: corral.numberOfAnimals,
            rationPerAnimal,
            totalFood,
            recommendedConsumption,
            stageName: stage ? FEEDING_PLAN[stage].name : "No válida",
          })
        }
      }
    } else {
      setFormData((prev) => ({ ...prev, Sum_Food: "" }))
      setFeedingCalculation(null)
    }
  }, [formData.id_Corral, formData.Can_Food, corrals])

  // Verificar stock disponible
  useEffect(() => {
    if (formData.id_Food && formData.Sum_Food) {
      const selectedFood = foods.find((f) => f.id_Food === Number.parseInt(formData.id_Food))
      const requiredAmount = Number.parseFloat(formData.Sum_Food)

      if (selectedFood && requiredAmount) {
        const existence = selectedFood.Existence ?? selectedFood.existence ?? 0

        if (existence < requiredAmount) {
          setStockAlert({
            type: "error",
            message: `Stock insuficiente. Disponible: ${existence} kg, Necesario: ${requiredAmount.toFixed(2)} kg`,
          })
        } else if (existence - requiredAmount < 100) {
          setStockAlert({
            type: "warning",
            message: `Después de esta alimentación quedarán ${(existence - requiredAmount).toFixed(2)} kg. Stock bajo.`,
          })
        } else {
          setStockAlert(null)
        }
      }
    }
  }, [formData.id_Food, formData.Sum_Food, foods])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (name === "id_Corral" && value) {
      const corral = corrals.find((c) => c.id_Corral === Number.parseInt(value))
      setSelectedCorral(corral)
    }
  }

  async function handlerSubmit(event) {
    event.preventDefault()
    const { Can_Food, Obc_Feeding, id_Users, Dat_Feeding, id_Corral, id_Food } = formData

    if (!Can_Food || !Obc_Feeding || !id_Users || !Dat_Feeding || !id_Corral || !id_Food) {
      if (showAlert) {
        showAlert("Todos los campos son requeridos.", "error")
      }
      return
    }

    if (stockAlert && stockAlert.type === "error") {
      if (showAlert) {
        showAlert("No se puede proceder: " + stockAlert.message, "error")
      }
      return
    }

    const body = {
      Can_Food: Number.parseFloat(Can_Food), // Ración por animal
      Obc_Feeding: Obc_Feeding.trim(),
      Sum_Food: 0, // Inicializar en 0, se calculará automáticamente en el backend
      id_Users: Number.parseInt(id_Users),
      Dat_Feeding,
      id_Corral: Number.parseInt(id_Corral),
      id_Food: Number.parseInt(id_Food),
    }

    if (isEditing && feedingToEdit?.id_Feeding) {
      body.id_Feeding = feedingToEdit.id_Feeding
      // Si estamos editando, enviar el Sum_Food calculado
      body.Sum_Food = Number.parseFloat(formData.Sum_Food) || 0
    }

    try {
      setLoading(true)
      console.log("Datos a enviar:", body)
      const response = await SendData(body, isEditing)

      const message = response.data.message || "Alimentación registrada exitosamente."

      if (showAlert) {
        showAlert(message, "success")
      }

      setFormData({
        Can_Food: "",
        Obc_Feeding: "",
        Sum_Food: "",
        id_Users: "",
        Dat_Feeding: "",
        id_Corral: "",
        id_Food: "",
      })

      setFeedingCalculation(null)
      setStockAlert(null)
      setSelectedCorral(null)

      if (closeModal) closeModal()
      if (typeof refreshData === "function") refreshData()
    } catch (error) {
      console.error("Error completo:", error)
      console.error("Response data:", error.response?.data)
      const errorMessage = error.response?.data?.message || error.response?.data || "Error desconocido"

      if (showAlert) {
        showAlert(`Error al ${isEditing ? "actualizar" : "registrar"} la alimentación: ${errorMessage}`, "error")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={`col-md-8 ${styles.form_box} d-flex align-items-center justify-content-center`}>
        <form className={styles.form} onSubmit={handlerSubmit}>
          <h1 className={styles.title}>{isEditing ? "Actualizar Alimentación" : "Registrar Alimentación"}</h1>

          {/* Información sobre el nuevo sistema */}
          <div className="bg-blue-50 p-4 rounded-md mb-4">
            <div className="flex items-center text-blue-800 mb-2">
              <FaInfoCircle className="mr-2" />
              <span className="font-semibold">Sistema de Alimentación Automático</span>
            </div>
            <div className="text-sm text-blue-700">
              <div className="mb-1">
                • Ingresa la <strong>ración por animal</strong> según el plan de alimentación
              </div>
              <div className="mb-1">
                • El sistema calculará automáticamente el <strong>total de alimento</strong>
              </div>
              <div>• Se restará el total calculado del inventario</div>
            </div>
          </div>

          {/* Corral */}
          <div className={styles.input_box}>
            <select name="id_Corral" className={styles.select} value={formData.id_Corral} onChange={handleChange}>
              <option value="">Selecciona el corral</option>
              {corrals
                .filter((c) => c.id_Corral != null)
                .map((corral) => (
                  <option key={corral.id_Corral} value={corral.id_Corral}>
                    {corral.des_Corral} - {corral.numberOfAnimals || 0} animales - Peso prom:{" "}
                    {corral.averageWeight || 0} kg
                  </option>
                ))}
            </select>
            <FaPiggyBank className={styles.icon} />
          </div>

          {/* Información del corral seleccionado */}
          {selectedCorral && (
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <h3 className="font-semibold text-blue-800 mb-2">Información del Corral</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <strong>Corral:</strong> {selectedCorral.des_Corral}
                </div>
                <div>
                  <strong>Animales:</strong> {selectedCorral.numberOfAnimals || 0}
                </div>
                <div>
                  <strong>Peso Promedio:</strong> {selectedCorral.averageWeight || 0} kg
                </div>
              </div>
            </div>
          )}

          {/* Ración por animal */}
          <div className={styles.input_box}>
            <input
              type="number"
              name="Can_Food"
              placeholder="Ración por animal (kg/día)"
              value={formData.Can_Food}
              onChange={handleChange}
              step="0.01"
            />
            <FaWeightHanging className={styles.icon} />
          </div>

          {/* Total calculado (solo lectura) */}
          <div className={styles.input_box}>
            <input
              type="number"
              name="Sum_Food"
              placeholder="Total de alimento (kg) - Calculado automáticamente"
              value={formData.Sum_Food}
              readOnly
              disabled
              style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
            />
            <FaUtensils className={styles.icon} />
          </div>

          {/* Alimento */}
          <div className={styles.input_box}>
            <select name="id_Food" className={styles.select} value={formData.id_Food} onChange={handleChange}>
              <option value="">Selecciona un alimento</option>
              {foods.map((food) => {
                const existence = food.Existence ?? food.existence ?? 0
                return (
                  <option key={food.id_Food} value={food.id_Food}>
                    {food.nam_Food || food.Nam_Food} - Stock: {existence} kg
                  </option>
                )
              })}
            </select>
            <FaAppleAlt className={styles.icon} />
          </div>

          {/* Alerta de stock */}
          {stockAlert && (
            <div className={`p-3 rounded-md mb-4 ${stockAlert.type === "error" ? "bg-red-50" : "bg-yellow-50"}`}>
              <div className={`flex items-center ${stockAlert.type === "error" ? "text-red-800" : "text-yellow-800"}`}>
                <FaExclamationTriangle className="mr-2" />
                <span className="text-sm">{stockAlert.message}</span>
              </div>
            </div>
          )}

          {/* Observación */}
          <div className={styles.input_box}>
            <input
              type="text"
              name="Obc_Feeding"
              placeholder="Observación"
              value={formData.Obc_Feeding}
              onChange={handleChange}
            />
            <FaClipboardList className={styles.icon} />
          </div>

          {/* Usuario */}
          <div className={styles.input_box}>
            <select name="id_Users" className={styles.select} value={formData.id_Users} onChange={handleChange}>
              <option value="">Selecciona un usuario</option>
              {users.map((user) => (
                <option key={user.id_Users} value={user.id_Users}>
                  {user.nom_Users}
                </option>
              ))}
            </select>
            <FaUser className={styles.icon} />
          </div>

          {/* Fecha */}
          <div className={styles.input_box}>
            <input
              type={formData.Dat_Feeding ? "date" : "text"}
              name="Dat_Feeding"
              placeholder="Fecha de la Alimentación"
              value={formData.Dat_Feeding}
              onFocus={(e) => {
                e.target.type = "date"
                e.target.showPicker?.()
              }}
              onBlur={(e) => {
                if (!e.target.value) e.target.type = "text"
              }}
              onChange={handleChange}
            />
            <FaCalendarAlt className={styles.icon} />
          </div>

          {/* Botón */}
          <Button
            type="submit"
            disabled={loading || (stockAlert && stockAlert.type === "error")}
            className={styles.button}
          >
            {loading
              ? isEditing
                ? "Actualizando..."
                : "Registrando..."
              : isEditing
                ? "Actualizar"
                : "Registrar Alimentación"}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default RegisterFeedingPage
