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
  const [errors, setErrors] = useState({})
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
    const newErrors = {}

    const { name, number_quotas } = formData

    if (!name || name.trim() === "") {
      newErrors.name = "El nombre del plan es obligatorio."
    }

    const parsedNumberQuotas = number_quotas ? Number.parseInt(number_quotas, 10) : null
    if (number_quotas && isNaN(parsedNumberQuotas)) {
      newErrors.number_quotas = "El número de cuotas debe ser un número válido."
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      showAlert("error", "Por favor, completa los campos requeridos correctamente.")
      return
    }

    setErrors({})
    const body = {
      name: name.trim(),
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
    <div className="max-w-2xl mx-auto p-6 md:p-8 bg-gradient-to-br from-white to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg border border-pink-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-pink-500 to-rose-600 rounded-full"></div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEditing ? "✏️ Editar Plan" : "➕ Nuevo Plan"}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campo: Nombre del Plan */}
        <div>
          <Label 
            htmlFor="name" 
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
          >
            Nombre del Plan <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              type="text"
              id="name"
              name="name"
              placeholder="Ej: Plan Básico, Plan Premium"
              value={formData.name}
              onChange={(e) => {
                handleChange(e)
                if (errors.name) setErrors({ ...errors, name: undefined })
              }}
              required
              className={`w-full pr-10 ${
                errors.name 
                  ? "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500" 
                  : "focus-visible:ring-pink-500"
              }`}
            />
            <FileText className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" size={18} />
          </div>
          {errors.name && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
              ⚠️ {errors.name}
            </p>
          )}
        </div>

        {/* Campo: Número de Cuotas */}
        <div>
          <Label 
            htmlFor="number_quotas" 
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
          >
            Número de Cuotas
          </Label>
          <div className="relative">
            <Input
              type="number"
              id="number_quotas"
              name="number_quotas"
              placeholder="Ej: 12, 24, 36"
              value={formData.number_quotas}
              onChange={(e) => {
                handleChange(e)
                if (errors.number_quotas) setErrors({ ...errors, number_quotas: undefined })
              }}
              min="0"
              className={`w-full pr-10 ${
                errors.number_quotas 
                  ? "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500" 
                  : "focus-visible:ring-pink-500"
              }`}
            />
            <Hash className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" size={18} />
          </div>
          {errors.number_quotas && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
              ⚠️ {errors.number_quotas}
            </p>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-8 border-t border-gray-200 dark:border-gray-700">
          <Button 
            type="button" 
            onClick={onCancelEdit} 
            variant="outline" 
            disabled={loading}
            className="px-6 py-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            ✕ Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={loading} 
            className="px-6 py-2 bg-gradient-to-r from-pink-600 to-rose-700 hover:from-pink-700 hover:to-rose-800 text-white shadow-md hover:shadow-lg transition-all duration-300 font-semibold disabled:opacity-70"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isEditing ? "Actualizando..." : "Registrando..."}
              </span>
            ) : (
              <span>{isEditing ? "✓ Actualizar" : "✓ Registrar"}</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default RegisterPlan
