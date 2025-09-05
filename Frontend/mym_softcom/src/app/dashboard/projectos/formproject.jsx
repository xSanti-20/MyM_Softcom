"use client"

import { useState, useEffect } from "react"
import axiosInstance from "@/lib/axiosInstance"
import { Button } from "@/components/ui/button"
import { Folder } from "lucide-react" // Usamos un icono de Lucide para proyectos

function RegisterProject({ refreshData, projectToEdit, onCancelEdit, closeModal, showAlert }) {
  const [formData, setFormData] = useState({
    name: "", // Cambiado de Nam_Race a name
  })

  const [loading, setLoading] = useState(false)
  const isEditing = !!projectToEdit

  useEffect(() => {
    if (isEditing) {
      setFormData({
        name: projectToEdit.name || "", // Usar projectToEdit.name
      })
    } else {
      setFormData({
        name: "",
      })
    }
  }, [projectToEdit, isEditing])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const projectName = formData.name.trim() // Usar projectName

    if (!projectName) {
      showAlert("El nombre del proyecto es obligatorio.", "error")
      return
    }

    const body = { name: projectName } // Usar name

    if (isEditing) {
      body.id_Projects = projectToEdit.id_Projects // Usar id_Projects
    }

    try {
      setLoading(true)
      let response
      if (isEditing) {
        // Endpoint para actualizar proyecto: PUT /api/Project/UpdateProject/{id}
        response = await axiosInstance.put(`/api/Project/UpdateProject/${body.id_Projects}`, body)
      } else {
        // Endpoint para crear proyecto: POST /api/Project/CreateProject
        response = await axiosInstance.post("/api/Project/CreateProject", body)
      }

      const successMessage =
        response.data?.message || (isEditing ? "Proyecto actualizado con éxito." : "Proyecto registrado con éxito.")

      showAlert("success", successMessage)

      setFormData({ name: "" }) // Limpiar formulario

      if (closeModal) closeModal()
      if (typeof refreshData === "function") refreshData()
    } catch (error) {
      console.error("Error completo:", error)
      const errorMessage = error.response?.data?.message || error.response?.data || "Error desconocido"

      showAlert(
        "error",
        `Ocurrió un error al ${isEditing ? "actualizar" : "registrar"} el proyecto: ` + JSON.stringify(errorMessage),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {isEditing ? "Editar Proyecto" : "Registrar Nuevo Proyecto"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Proyecto *
          </label>
          <div className="relative">
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Nombre del proyecto"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <Folder className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
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

export default RegisterProject
