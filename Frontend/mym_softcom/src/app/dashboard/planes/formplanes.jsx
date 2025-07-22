"use client"

import { useState, useEffect } from "react"
import axiosInstance from "@/lib/axiosInstance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Hash } from "lucide-react"

function RegisterPlan({ refreshData, planToEdit, onCancelEdit, closeModal, showAlert }) {
  const [formData, setFormData] = useState({
    name: "",
    number_quotas: "",
  })

  const [loading, setLoading] = useState(false)
  const isEditing = !!planToEdit

  useEffect(() => {
    if (isEditing && planToEdit) {
      setFormData({
        name: planToEdit.name || "",
        number_quotas: planToEdit.number_quotas?.toString() || "",
      })
    } else {
      setFormData({
        name: "",
        number_quotas: "",
      })
    }
  }, [planToEdit, isEditing])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const { name, number_quotas } = formData

    if (!name) {
      showAlert("error", "El nombre del plan es obligatorio.")
      return
    }

    const parsedNumberQuotas = number_quotas ? Number.parseInt(number_quotas, 10) : null
    if (number_quotas && isNaN(parsedNumberQuotas)) {
      showAlert("error", "El número de cuotas debe ser un número válido.")
      return
    }

    const body = {
      name,
      number_quotas: parsedNumberQuotas,
    }

    if (isEditing) {
      body.id_Plans = planToEdit.id_Plans
    }

    try {
      setLoading(true)
      let response
      if (isEditing) {
        response = await axiosInstance.put(`/api/Plan/UpdatePlan/${body.id_Plans}`, body)
      } else {
        response = await axiosInstance.post("/api/Plan/CreatePlan", body)
      }

      const successMessage =
        response.data?.message || (isEditing ? "Plan actualizado con éxito." : "Plan registrado con éxito.")

      showAlert("success", successMessage)

      if (!isEditing || closeModal) {
        setFormData({ name: "", number_quotas: "" })
      }

      if (closeModal) closeModal()
      if (typeof refreshData === "function") refreshData()
    } catch (error) {
      console.error("Error completo:", error)
      const errorMessage = error.response?.data?.message || error.response?.data || "Error desconocido"

      showAlert(
        "error",
        `Ocurrió un error al ${isEditing ? "actualizar" : "registrar"} el plan: ` + JSON.stringify(errorMessage),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{isEditing ? "Editar Plan" : "Registrar Nuevo Plan"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Plan *
          </Label>
          <div className="relative">
            <Input
              type="text"
              id="name"
              name="name"
              placeholder="Ej: Plan Básico, Plan Premium"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full pr-10"
            />
            <FileText className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
        </div>

        <div>
          <Label htmlFor="number_quotas" className="block text-sm font-medium text-gray-700 mb-1">
            Número de Cuotas
          </Label>
          <div className="relative">
            <Input
              type="number"
              id="number_quotas"
              name="number_quotas"
              placeholder="Ej: 12, 24, 36"
              value={formData.number_quotas}
              onChange={handleChange}
              className="w-full pr-10"
            />
            <Hash className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button type="button" onClick={onCancelEdit} variant="outline" disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? (isEditing ? "Actualizando..." : "Registrando...") : isEditing ? "Actualizar" : "Registrar"}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default RegisterPlan
