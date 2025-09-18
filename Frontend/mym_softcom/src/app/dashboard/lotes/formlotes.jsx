"use client"

import { useState, useEffect, useCallback } from "react"
import axiosInstance from "@/lib/axiosInstance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building, MapPin, Square, Navigation } from "lucide-react"

function RegisterLot({ refreshData, lotToEdit, onCancelEdit, closeModal, showAlert }) {
  const [formData, setFormData] = useState({
    block: "",
    lot_number: "",
    lot_area: "",
    location: "",
    id_Projects: "", // ID del proyecto seleccionado
  })
  const [projects, setProjects] = useState([]) // Para la lista de proyectos
  const [loading, setLoading] = useState(false)
  const isEditing = !!lotToEdit

  const stableShowAlert = useCallback(
    (type, message) => {
      if (showAlert) {
        showAlert(type, message)
      }
    },
    [showAlert],
  )

  // Cargar proyectos al iniciar el componente
  useEffect(() => {
    async function fetchProjectsForSelect() {
      try {
        // El endpoint para obtener todos los proyectos es /api/Project
        const response = await axiosInstance.get("/api/Project/GetAllProjects")
        if (response.status === 200) {
          setProjects(response.data)
        }
      } catch (error) {
        console.error("Error al cargar proyectos para el select:", error)
        stableShowAlert("error", "No se pudieron cargar los proyectos para el formulario.")
      }
    }
    fetchProjectsForSelect()
  }, [stableShowAlert]) // Added stableShowAlert to dependencies

  // Rellenar formulario si estamos editando un lote
  useEffect(() => {
    if (isEditing && lotToEdit) {
      setFormData({
        block: lotToEdit.block || "",
        lot_number: lotToEdit.lot_number?.toString() || "",
        lot_area: lotToEdit.lot_area?.toString() || "",
        location: lotToEdit.location || "",
        id_Projects: lotToEdit.id_Projects?.toString() || "", // Asegurarse de que sea string para el select
      })
    } else {
      setFormData({
        block: "",
        lot_number: "",
        lot_area: "",
        location: "",
        id_Projects: "",
      })
    }
  }, [lotToEdit, isEditing])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const { block, lot_number, lot_area, location, id_Projects } = formData

    if (!block || !lot_number || !lot_area || !location || !id_Projects) {
      stableShowAlert(
        "error",
        "Todos los campos obligatorios (Manzana, Número de Lote, Área, Ubicación, Proyecto) deben ser completados.",
      )
      return
    }

    const parsedLotNumber = Number.parseInt(lot_number, 10)
    if (isNaN(parsedLotNumber)) {
      stableShowAlert("error", "El número de lote debe ser un número válido.")
      return
    }

    const parsedLotArea = Number.parseInt(lot_area, 10)
    if (isNaN(parsedLotArea) || parsedLotArea <= 0) {
      stableShowAlert("error", "El área del lote debe ser un número válido mayor a 0.")
      return
    }

    const parsedProjectId = Number.parseInt(id_Projects, 10)
    if (isNaN(parsedProjectId)) {
      stableShowAlert("error", "El proyecto seleccionado no es válido.")
      return
    }

    const body = {
      block,
      lot_number: parsedLotNumber,
      lot_area: parsedLotArea,
      location,
      id_Projects: parsedProjectId,
    }

    if (isEditing) {
      // Para edición, incluimos el ID del lote y el estado actual del lote
      body.id_Lots = lotToEdit.id_Lots
      body.status = lotToEdit.status // Mantenemos el estado existente
      body.id_Projects = lotToEdit.id_Projects
    } else {
      // Para creación, el estado es "Libre" por defecto
      body.status = "Libre"
    }

    try {
      setLoading(true)
      let response
      if (isEditing) {
        response = await axiosInstance.put(`/api/Lot/UpdateLot/${body.id_Lots}`, body)
      } else {
        response = await axiosInstance.post("/api/Lot/CreateLot", body)
      }

      const successMessage =
        response.data?.message || (isEditing ? "Lote actualizado con éxito." : "Lote registrado con éxito.")

      stableShowAlert("success", successMessage)

      // Limpiar formulario solo si es un registro nuevo o si se cierra el modal
      if (!isEditing || closeModal) {
        setFormData({ block: "", lot_number: "", lot_area: "", location: "", id_Projects: "" })
      }

      if (closeModal) closeModal()
      if (typeof refreshData === "function") refreshData()
    } catch (error) {
      console.error("Error completo:", error)
      const errorMessage = error.response?.data?.message || error.response?.data || "Error desconocido"

      stableShowAlert(
        "error",
        `Ocurrió un error al ${isEditing ? "actualizar" : "registrar"} el lote: ` + JSON.stringify(errorMessage),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{isEditing ? "Editar Lote" : "Registrar Nuevo Lote"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="block" className="block text-sm font-medium text-gray-700 mb-1">
            Manzana *
          </Label>
          <div className="relative">
            <Input
              type="text"
              id="block"
              name="block"
              placeholder="Ej: A, B, C"
              value={formData.block}
              onChange={handleChange}
              required
              className="w-full pr-10"
            />
            <Building className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
        </div>

        <div>
          <Label htmlFor="lot_number" className="block text-sm font-medium text-gray-700 mb-1">
            Número de Lote *
          </Label>
          <div className="relative">
            <Input
              type="number"
              id="lot_number"
              name="lot_number"
              placeholder="Ej: 1, 2, 3"
              value={formData.lot_number}
              onChange={handleChange}
              required
              className="w-full pr-10"
            />
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
        </div>

        <div>
          <Label htmlFor="lot_area" className="block text-sm font-medium text-gray-700 mb-1">
            Área (m²) *
          </Label>
          <div className="relative">
            <Input
              type="number"
              id="lot_area"
              name="lot_area"
              placeholder="Ej: 120, 150, 200"
              value={formData.lot_area}
              onChange={handleChange}
              required
              min="1"
              className="w-full pr-10"
            />
            <Square className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
        </div>

        <div>
          <Label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Ubicación *
          </Label>
          <div className="relative">
            <Input
              type="text"
              id="location"
              name="location"
              placeholder="Ej: Esquina, Central, Frente al parque"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full pr-10"
            />
            <Navigation className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
        </div>

        <div>
          <Label htmlFor="id_Projects" className="block text-sm font-medium text-gray-700 mb-1">
            Proyecto *
          </Label>
          <Select
            name="id_Projects"
            value={formData.id_Projects}
            onValueChange={(value) => handleSelectChange("id_Projects", value)}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un proyecto" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id_Projects} value={project.id_Projects.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

export default RegisterLot
