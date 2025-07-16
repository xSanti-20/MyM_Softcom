"use client"
import { useState, useEffect } from "react"
import "./page.Module.css"
import axiosInstance from "@/lib/axiosInstance"
import { FaDna } from "react-icons/fa"
import { Button } from "@/components/ui/button"

// Función para enviar datos al backend
async function SendData(body, isEditing = false) {
  if (isEditing) {
    const response = await axiosInstance.put("/api/Race/UpdateRace", body)
    return response
  } else {
    const response = await axiosInstance.post("/api/Race/CreateRace", body)
    return response
  }
}

function RegisterRacePage({ refreshData, raceToEdit, onCancelEdit, closeModal, showAlert }) {
  const [formData, setFormData] = useState({
    Nam_Race: "",
  })

  const [loading, setLoading] = useState(false)
  const isEditing = !!raceToEdit

  useEffect(() => {
    if (isEditing) {
      setFormData({
        Nam_Race: raceToEdit.nam_Race || "",
      })
    } else {
      setFormData({
        Nam_Race: "",
      })
    }
  }, [raceToEdit])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handlerSubmit(event) {
    event.preventDefault()
    const Nam_Race = formData.Nam_Race.trim()

    if (!Nam_Race) {
      if (showAlert) {
        showAlert("El nombre de la raza es requerido.", "error")
      } else {
        alert("El nombre de la raza es requerido.")
      }
      return
    }

    const body = { Nam_Race }

    if (isEditing) {
      body.Id_Race = raceToEdit.id_Race
    }

    try {
      setLoading(true)
      const response = await SendData(body, isEditing)

      const successMessage =
        response.data.message || (isEditing ? "Raza actualizada con éxito." : "Raza registrada con éxito.")

      if (showAlert) {
        showAlert(successMessage, "success")
      } else {
        alert(successMessage)
      }

      setFormData({ Nam_Race: "" })

      if (closeModal) closeModal()
      if (typeof refreshData === "function") refreshData()
    } catch (error) {
      console.error("Error completo:", error)
      const errorMessage = error.response?.data || "Error desconocido"

      if (showAlert) {
        showAlert(
          `Ocurrió un error al ${isEditing ? "actualizar" : "registrar"} la raza: ` + JSON.stringify(errorMessage),
          "error",
        )
      } else {
        alert(`Ocurrió un error al ${isEditing ? "actualizar" : "registrar"} la raza: ` + JSON.stringify(errorMessage))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-form-wrapper">
        <form className="register-form" onSubmit={handlerSubmit}>
          <h1 className="register-title">{isEditing ? "Actualizar Raza" : "Registrar Raza"}</h1>

          <div className="register-input-box">
            <input
              type="text"
              id="Nam_Race"
              name="Nam_Race"
              placeholder="Nombre de la raza"
              value={formData.Nam_Race}
              onChange={handleChange}
            />
            <FaDna className="register-icon" />
          </div>

          <Button type="submit" disabled={loading} className="register-button">
            {loading ? (isEditing ? "Actualizando..." : "Registrando...") : isEditing ? "Actualizar" : "Registrar"}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default RegisterRacePage
