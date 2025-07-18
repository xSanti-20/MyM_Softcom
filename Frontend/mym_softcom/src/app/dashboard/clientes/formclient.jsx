"use client"

import { useState, useEffect } from "react"
import styles from "./page.module.css" // Asegúrate de que este sea el nombre correcto de tu archivo CSS
import axiosInstance from "@/lib/axiosInstance"

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
          console.error("Error al verificar documento duplicado:", err)
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
      console.error("Error al procesar cliente:", error)

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
    // Mantenemos la estructura original con .wrapper y .form_box
    <div className={styles.wrapper}>
      <div className={styles.form_box}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Agrega la imagen aquí, similar al formulario de inicio de sesión */}
          <img src="/assets/img/mymsoftcom.png" alt="M&M" width="65" height="60" />
          <h1 className={styles.title}>{clientToEdit ? "Editar Cliente" : "Registrar Nuevo Cliente"}</h1>
          <div className={styles.form_content_grid}>
            {/* Columna izquierda */}
            <div className={styles.column_section}>
              <h3 className={styles.section_title}>Información Personal</h3>

              <div className={styles.input_group}>
                <label htmlFor="names">Nombres *</label>
                <input
                  type="text"
                  id="names"
                  name="names"
                  value={formData.names}
                  onChange={handleInputChange}
                  required
                  placeholder="Nombres"
                />
              </div>

              <div className={styles.input_group}>
                <label htmlFor="surnames">Apellidos *</label>
                <input
                  type="text"
                  id="surnames"
                  name="surnames"
                  value={formData.surnames}
                  onChange={handleInputChange}
                  required
                  placeholder="Apellidos"
                />
              </div>

              <div className={styles.input_group}>
                <label htmlFor="document">Documento *</label>
                <input
                  type="number"
                  id="document"
                  name="document"
                  value={formData.document}
                  onChange={handleInputChange}
                  required
                  placeholder="Documento"
                />
              </div>
            </div>

            {/* Columna derecha */}
            <div className={styles.column_section}>
              <h3 className={styles.section_title}>Contacto</h3>

              <div className={styles.input_group}>
                <label htmlFor="phone">Teléfono</label>
                <input
                  type="number"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Teléfono"
                />
              </div>

              <div className={styles.input_group}>
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                />
              </div>
            </div>
          </div>
          <div className={styles.button_container}>
            <button
              type="button"
              onClick={() => {
                closeModal()
                onCancelEdit()
              }}
              className={`${styles.button} ${styles.outline}`}
              disabled={loading}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Procesando..." : clientToEdit ? "Actualizar" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterClient
