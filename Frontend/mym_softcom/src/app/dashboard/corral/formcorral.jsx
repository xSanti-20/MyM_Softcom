"use client"
import { useState, useEffect } from "react"
import styles from "./page.module.css"
import axiosInstance from "@/lib/axiosInstance"
import { FaWarehouse, FaIdCard } from "react-icons/fa"
import { Button } from "@/components/ui/button"

// Función para enviar datos al backend
async function SendData(body, isEditing = false) {
  if (isEditing) {
    const response = await axiosInstance.put("/api/Corral/UpdateCorral", body)
    return response
  } else {
    const response = await axiosInstance.post("/api/Corral/CreateCorral", body)
    return response
  }
}

function RegisterCorralPage({ refreshData, corralToEdit, onCancelEdit, closeModal, showAlert }) {
  const [formData, setFormData] = useState({
    Des_Corral: "",
    Tot_Animales: "0",
  })

  const [loading, setLoading] = useState(false)
  const isEditing = !!corralToEdit

  useEffect(() => {
    if (isEditing) {
      setFormData({
        Des_Corral: corralToEdit.des_Corral || "",
        Tot_Animales: corralToEdit.tot_Animal?.toString() || "0",
      })
    } else {
      setFormData({
        Des_Corral: "",
        Tot_Animales: "0",
      })
    }
  }, [corralToEdit])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handlerSubmit(event) {
    event.preventDefault()
    const Des_Corral = formData.Des_Corral.trim()
    const Tot_Animales = formData.Tot_Animales.trim()

    // ✅ SOLO usar showAlert, NUNCA alert()
    if (!Des_Corral) {
      if (showAlert) {
        showAlert("error", "La descripción del corral es requerida.")
      }
      return
    }

    const body = {
      Des_Corral,
      Tot_Animal: Number.parseInt(Tot_Animales, 10) || 0,
      Tot_Pesaje: 0,
      Est_Corral: "libre",
    }

    if (isEditing) {
      body.id_Corral = corralToEdit.id_Corral
    }

    try {
      setLoading(true)
      const response = await SendData(body, isEditing)

      // ✅ SOLO usar showAlert, NUNCA alert()
      const successMessage =
        response.data.message || (isEditing ? "Corral actualizado con éxito." : "Corral registrado con éxito.")

      if (showAlert) {
        showAlert("success", successMessage, () => {
          // Callback que se ejecuta al cerrar la alerta de éxito
          setFormData({ Des_Corral: "", Tot_Animales: "0" })
          if (closeModal) closeModal()
          if (typeof refreshData === "function") refreshData()
        })
      }
    } catch (error) {
      console.error("Error completo:", error)
      const errorMessage = error.response?.data?.message || error.response?.data || "Error desconocido"

      // ✅ SOLO usar showAlert, NUNCA alert()
      if (showAlert) {
        showAlert("error", `Error al ${isEditing ? "actualizar" : "registrar"} el corral: ${errorMessage}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={`col-md-6 ${styles.form_box} d-flex align-items-center justify-content-center`}>
        <form className={styles.form} onSubmit={handlerSubmit}>
          <h1 className={styles.title}>{isEditing ? "Actualizar Corral" : "Registrar Corral"}</h1>

          <div className={styles.input_box}>
            <input
              type="text"
              id="Des_Corral"
              name="Des_Corral"
              placeholder="Descripción del Corral"
              value={formData.Des_Corral}
              onChange={handleChange}
              required
            />
            <FaWarehouse className={styles.icon} />
          </div>

          <div className={styles.input_box}>
            <input
              type="number"
              id="Tot_Animales"
              name="Tot_Animales"
              placeholder="Total de Animales (opcional)"
              value={formData.Tot_Animales}
              onChange={handleChange}
              min="0"
            />
            <FaIdCard className={styles.icon} />
          </div>

          <div className={styles.button_box}>
            <Button type="submit" disabled={loading}>
              {loading ? (isEditing ? "Actualizando..." : "Registrando...") : isEditing ? "Actualizar" : "Registrar"}
            </Button>
            {isEditing && (
              <Button variant="secondary" type="button" onClick={onCancelEdit}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterCorralPage
