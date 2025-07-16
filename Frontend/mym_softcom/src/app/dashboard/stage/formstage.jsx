"use client"
import { useState, useEffect } from "react"
import axiosInstance from "@/lib/axiosInstance"
import { FaFileAlt, FaRegClock } from "react-icons/fa"
import { LiaMicroscopeSolid } from "react-icons/lia"
import { Button } from "@/components/ui/button"
import "./Stage.Module.css"

async function sendData(body, isEditing = false) {
  const response = isEditing
    ? await axiosInstance.put("api/Stage/UpdateStage", body)
    : await axiosInstance.post("api/Stage/CreateStage", body)
  return response
}

function StageForm({ refreshData, stageToEdit, onCancelEdit, closeModal, showAlert }) {
  const [formData, setFormData] = useState({
    Name_Stage: "",
    Weight_From: "",
    Weight_Upto: "",
    Dur_Stage: "",
  })

  const [loading, setLoading] = useState(false)
  const isEditing = !!stageToEdit

  useEffect(() => {
    if (isEditing) {
      setFormData({
        Name_Stage: stageToEdit.name_Stage || "",
        Weight_From: stageToEdit.weight_From || "",
        Weight_Upto: stageToEdit.weight_Upto || "",
        Dur_Stage: stageToEdit.dur_Stage || "",
      })
    } else {
      setFormData({
        Name_Stage: "",
        Weight_From: "",
        Weight_Upto: "",
        Dur_Stage: "",
      })
    }
  }, [stageToEdit])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const validateWeightRange = () => {
    const weightFrom = parseFloat(formData.Weight_From)
    const weightUpto = parseFloat(formData.Weight_Upto)
    if (weightFrom >= weightUpto) return "El peso inicial debe ser menor que el peso final"
    if (weightFrom < 0 || weightUpto < 0) return "Los pesos no pueden ser negativos"
    return null
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const { Name_Stage, Weight_From, Weight_Upto, Dur_Stage } = formData

    if (!Name_Stage || !Weight_From || !Weight_Upto || !Dur_Stage) {
      showAlert?.("Todos los campos son requeridos.", "error")
      return
    }

    const errorPeso = validateWeightRange()
    if (errorPeso) {
      showAlert?.(errorPeso, "error")
      return
    }

    const body = {
      Name_Stage,
      Weight_From: parseFloat(Weight_From),
      Weight_Upto: parseFloat(Weight_Upto),
      Dur_Stage: parseInt(Dur_Stage),
    }

    if (isEditing) body.Id_Stage = stageToEdit.id_Stage

    try {
      setLoading(true)
      const response = await sendData(body, isEditing)
      showAlert?.(response.data.message || (isEditing ? "Etapa actualizada." : "Etapa registrada."), "success")
      setFormData({ Name_Stage: "", Weight_From: "", Weight_Upto: "", Dur_Stage: "" })
      closeModal?.()
      refreshData?.()
    } catch (error) {
      console.error(error)
      showAlert?.(
        `Ocurrió un error al ${isEditing ? "actualizar" : "registrar"} la etapa: ${JSON.stringify(
          error.response?.data || "Error desconocido"
        )}`,
        "error"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stage-wrapper">
      <div className="stage-form-container">
        <form onSubmit={handleSubmit} className="stage-form">
          <h2 className="stage-title">{isEditing ? "Actualizar Etapa" : "Registrar Etapa"}</h2>

          <div className="input-group">
            <input
              type="text"
              name="Name_Stage"
              placeholder="Nombre Etapa"
              value={formData.Name_Stage}
              onChange={handleChange}
              required
            />
            <FaFileAlt className="icon" />
          </div>

          <div className="input-group">
            <input
              type="number"
              step="0.1"
              min="0"
              name="Weight_From"
              placeholder="Peso Desde (kg)"
              value={formData.Weight_From}
              onChange={handleChange}
              required
            />
            <LiaMicroscopeSolid className="icon" />
          </div>

          <div className="input-group">
            <input
              type="number"
              step="0.1"
              min="0"
              name="Weight_Upto"
              placeholder="Peso Hasta (kg)"
              value={formData.Weight_Upto}
              onChange={handleChange}
              required
            />
            <LiaMicroscopeSolid className="icon" />
          </div>

          <div className="input-group">
            <input
              type="number"
              min="1"
              name="Dur_Stage"
              placeholder="Duración (días)"
              value={formData.Dur_Stage}
              onChange={handleChange}
              required
            />
            <FaRegClock className="icon" />
          </div>

          <div className="recommendation-box">
            <h4>📋 Rangos de Peso Recomendados:</h4>
            <ul>
              <li><strong>Pre-inicio:</strong> 6.5 - 17.5 kg</li>
              <li><strong>Iniciación:</strong> 17.5 - 30 kg</li>
              <li><strong>Levante:</strong> 30 - 60 kg</li>
              <li><strong>Engorde:</strong> 60 - 120 kg</li>
            </ul>
          </div>

          <div className="form-buttons">
            {onCancelEdit && (
              <Button type="button" onClick={onCancelEdit} variant="outline" disabled={loading}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={loading} className="submit-btn">
              {loading ? (isEditing ? "Actualizando..." : "Registrando...") : isEditing ? "Actualizar" : "Registrar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default StageForm
