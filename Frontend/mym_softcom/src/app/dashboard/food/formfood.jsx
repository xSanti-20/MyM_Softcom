"use client"

import { useState, useEffect } from "react"
import styles from "./page.module.css"
import axiosInstance from "@/lib/axiosInstance"
import { FaUtensils, FaWarehouse, FaWeightHanging, FaPiggyBank, FaCalculator, FaInfoCircle } from "react-icons/fa"
import { Button } from "@/components/ui/button"

// Función para enviar datos al backend
async function SendData(body, isEditing = false) {
  if (isEditing) {
    const response = await axiosInstance.put("/api/Food/UpdateFood", body)
    return response
  } else {
    const response = await axiosInstance.post("/api/Food/CreateFood", body)
    return response
  }
}

function RegisterFoodPage({ refreshData, foodToEdit, onCancelEdit, closeModal, showAlert }) {
  const [loading, setLoading] = useState(false)
  const [stages, setStages] = useState([])
  const [formData, setFormData] = useState({
    nam_Food: "",
    und_Extent: "KG", // Fijo como KG según el sistema de inventario
    vlr_Unit: "",
    id_Stage: "",
    rat_Food: "",
    existence: "0", // Valor inicial, se actualiza automáticamente con las entradas
  })

  const isEditing = !!foodToEdit

  useEffect(() => {
    async function fetchData() {
      try {
        const stagesResponse = await axiosInstance.get("/api/Stage/ConsultAllStages")
        setStages(stagesResponse.data)
      } catch (error) {
        console.error("Error al obtener etapas:", error)
        if (showAlert) {
          showAlert("No se pudieron cargar las etapas.", "error")
        } else {
          alert("No se pudieron cargar las etapas.")
        }
      }
    }

    fetchData()
  }, [showAlert])

  useEffect(() => {
    console.log("foodToEdit recibido:", foodToEdit)

    if (isEditing && foodToEdit) {
      const stageId = foodToEdit.id_Stage?.toString() || ""
      console.log("ID de etapa cargado:", stageId, "Tipo:", typeof stageId)

      setFormData({
        nam_Food: foodToEdit.nam_Food || "",
        und_Extent: "KG",
        vlr_Unit: foodToEdit.vlr_Unit?.toString() || "",
        id_Stage: stageId,
        rat_Food: foodToEdit.rat_Food?.toString() || "",
        existence: foodToEdit.existence?.toString() || "0",
      })
    } else {
      setFormData({
        nam_Food: "",
        und_Extent: "KG",
        vlr_Unit: "",
        id_Stage: "",
        rat_Food: "",
        existence: "0",
      })
    }
  }, [foodToEdit, isEditing])


  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handlerSubmit(event) {
    event.preventDefault()

    const { nam_Food, und_Extent, vlr_Unit, id_Stage, rat_Food, existence } = formData

    if (!nam_Food || !vlr_Unit || !id_Stage || !rat_Food) {
      if (showAlert) {
        showAlert("Todos los campos son requeridos.", "error")
      } else {
        alert("Todos los campos son requeridos.")
      }
      return
    }

    const body = {
      nam_Food,
      und_Extent: "KG", // Siempre KG
      vlr_Unit: Number.parseInt(vlr_Unit),
      id_Stage: Number.parseInt(id_Stage),
      rat_Food: Number.parseInt(rat_Food),
      existence: isEditing ? Number.parseInt(existence) : 0, // Solo permitir editar existencia si está editando
    }

    if (isEditing && foodToEdit?.id_Food) {
      body.id_Food = foodToEdit.id_Food
    }

    try {
      setLoading(true)
      const response = await SendData(body, isEditing)

      const successMessage =
        response.data.message || (isEditing ? "Alimento actualizado con éxito." : "Alimento registrado con éxito.")

      if (showAlert) {
        showAlert(successMessage, "success")
      } else {
        alert(successMessage)
      }

      setFormData({
        nam_Food: "",
        und_Extent: "KG",
        vlr_Unit: "",
        id_Stage: "",
        rat_Food: "",
        existence: "0",
      })

      if (closeModal) closeModal()
      if (typeof refreshData === "function") refreshData()
    } catch (error) {
      console.error("Error completo:", error)
      const errorMessage = error.response?.data || "Error desconocido"

      if (showAlert) {
        showAlert(
          `Error al ${isEditing ? "actualizar" : "registrar"} el alimento: ${JSON.stringify(errorMessage)}`,
          "error",
        )
      } else {
        alert(`Error al ${isEditing ? "actualizar" : "registrar"} el alimento: ${JSON.stringify(errorMessage)}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={`col-md-6 ${styles.form_box} d-flex align-items-center justify-content-center`}>
        <form className={styles.form} onSubmit={handlerSubmit}>
          <h1 className={styles.title}>{isEditing ? "Actualizar Alimento" : "Registrar Alimento"}</h1>

          {/* Nombre */}
          <div className={styles.input_box}>
            <input
              type="text"
              name="nam_Food"
              placeholder="Nombre del Alimento"
              value={formData.nam_Food}
              onChange={handleChange}
            />
            <FaUtensils className={styles.icon} />
          </div>

          {/* Unidad Existente - Fijo como KG */}
          <div className={styles.input_box}>
            <input
              type="text"
              name="und_Extent"
              placeholder="Unidad de Medida"
              value="KG"
              disabled
              style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
            />
            <FaWeightHanging className={styles.icon} />
          </div>

          {/* Valor Unitario */}
          <div className={styles.input_box}>
            <input
              type="number"
              name="vlr_Unit"
              placeholder="Valor Unitario por BULTO"
              value={formData.vlr_Unit}
              onChange={handleChange}
              step="1"
            />
            <FaCalculator className={styles.icon} />
          </div>

          {/* Etapa */}
          <div className={styles.input_box}>
            <select name="id_Stage" className={styles.select} value={formData.id_Stage} onChange={handleChange}>
              <option value="">Selecciona una etapa</option>
              {stages.map((stage) => (
                <option key={stage.id_Stage} value={stage.id_Stage}>
                  {stage.name_Stage}
                </option>
              ))}
            </select>
            <FaWarehouse className={styles.icon} />
          </div>

          {/* Ración del Alimento */}
          <div className={styles.input_box}>
            <input
              type="number"
              name="rat_Food"
              placeholder="Ración del Alimento (KG)"
              value={formData.rat_Food}
              onChange={handleChange}
              step="1"
            />
            <FaPiggyBank className={styles.icon} />
          </div>

          {/* Existencia */}
          <div className={styles.input_box}>
            <input
              type="number"
              name="existence"
              placeholder="Existencia Inicial (KG)"
              value={formData.existence}
              onChange={handleChange}
              step="1"
              disabled={!isEditing} // Solo editable cuando se está editando
              style={!isEditing ? { backgroundColor: "#f5f5f5", cursor: "not-allowed" } : {}}
            />
            <FaWarehouse className={styles.icon} />
            {!isEditing && (
              <div className="text-xs text-gray-500 mt-1 flex items-center">
                <FaInfoCircle className="mr-1" />
                La existencia se actualiza automáticamente con las entradas
              </div>
            )}
          </div>

          {/* Botón */}
          <Button type="submit" disabled={loading} className={styles.button}>
            {loading ? (isEditing ? "Actualizando..." : "Registrando...") : isEditing ? "Actualizar" : "Registrar"}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default RegisterFoodPage
