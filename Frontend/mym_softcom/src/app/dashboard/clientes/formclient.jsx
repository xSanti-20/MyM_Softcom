"use client"

import { useState, useEffect } from "react"
import axiosInstance from "@/lib/axiosInstance"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"

function RegisterClient({ refreshData, clientToEdit, onCancelEdit, closeModal, showAlert }) {
  const [formData, setFormData] = useState({
    names: "",
    surnames: "",
    document: "",
    phone: "",
    email: "",
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (clientToEdit) {
      setFormData({
        Id_Clients: clientToEdit.id_Clients || clientToEdit.id,
        names: clientToEdit.names || "",
        surnames: clientToEdit.surnames || "",
        document: clientToEdit.document || "",
        phone: clientToEdit.phone || "",
        email: clientToEdit.email || "",
      })
    } else {
      setFormData({
        names: "",
        surnames: "",
        document: "",
        phone: "",
        email: "",
      })
    }
  }, [clientToEdit])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const parsedDocument = Number.parseInt(formData.document, 10)
    if (isNaN(parsedDocument)) {
      showAlert("error", "El campo 'Documento' debe ser un número válido.")
      setLoading(false)
      return
    }

    let parsedPhone = null
    if (formData.phone) {
      parsedPhone = Number.parseInt(formData.phone, 10)
      if (isNaN(parsedPhone)) {
        showAlert("error", "El campo 'Teléfono' debe ser un número válido o estar vacío.")
        setLoading(false)
        return
      }
    }

    const body = {
      ...formData,
      document: parsedDocument,
      phone: parsedPhone,
    }

    if (formData.document) {
      try {
        const response = await axiosInstance.get(`/api/Client/GetByDocument/${formData.document}`)
        const duplicateClient = response.data

        if (duplicateClient && duplicateClient.id_Clients !== formData.Id_Clients) {
          showAlert("error", "Ya existe un cliente con este número de documento.")
          setLoading(false)
          return
        }
      } catch (err) {
        if (err.response && err.response.status !== 404) {
          showAlert("error", "Error al validar el documento del cliente.")
          setLoading(false)
          return
        }
      }
    }

    try {
      if (clientToEdit) {
        await axiosInstance.put(`/api/Client/UpdateClient/${body.Id_Clients}`, body)
        showAlert("success", "Cliente actualizado correctamente.")
      } else {
        await axiosInstance.post("/api/Client/CreateClient", body)
        showAlert("success", "Cliente registrado correctamente.")
      }

      setFormData({
        names: "",
        surnames: "",
        document: "",
        phone: "",
        email: "",
      })

      refreshData()
      closeModal()
      onCancelEdit()
    } catch (error) {
      const errorMessage =
        error.response?.data?.errors?.document?.[0] ||
        error.response?.data?.errors?.phone?.[0] ||
        error.response?.data?.message ||
        "Error al procesar el cliente."
      showAlert("error", errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {clientToEdit ? "Editar Cliente" : "Registrar Nuevo Cliente"}
        </h2>
        <img src="/assets/img/mymsoftcom.png" alt="M&M" width={50} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Información Personal</h3>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1" htmlFor="names">
                Nombres *
              </label>
              <input
                type="text"
                id="names"
                name="names"
                value={formData.names}
                onChange={handleInputChange}
                required
                placeholder="Nombres"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1" htmlFor="surnames">
                Apellidos *
              </label>
              <input
                type="text"
                id="surnames"
                name="surnames"
                value={formData.surnames}
                onChange={handleInputChange}
                required
                placeholder="Apellidos"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1" htmlFor="document">
                Documento *
              </label>
              <input
                type="number"
                id="document"
                name="document"
                value={formData.document}
                onChange={handleInputChange}
                required
                placeholder="Documento"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Contacto</h3>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1" htmlFor="phone">
                Teléfono
              </label>
              <input
                type="number"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Teléfono"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1" htmlFor="email">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button type="button" onClick={() => { closeModal(); onCancelEdit() }} variant="outline" disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? (clientToEdit ? "Actualizando..." : "Registrando...") : clientToEdit ? "Actualizar" : "Registrar"}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default RegisterClient
