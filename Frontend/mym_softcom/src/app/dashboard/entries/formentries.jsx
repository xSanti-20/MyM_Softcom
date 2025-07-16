"use client"

import { useState, useEffect } from "react"
import styles from "./page.module.css"
import axiosInstance from "@/lib/axiosInstance"
import { FaUtensils, FaCalendarAlt, FaMoneyBillWave, FaCalculator, FaTag, FaInfoCircle, FaBoxes } from "react-icons/fa"
import { Button } from "@/components/ui/button"

async function SendData(body, isEditing = false) {
  if (isEditing) {
    const response = await axiosInstance.put("/api/Entries/UpdateEntries", body)
    return response
  } else {
    const response = await axiosInstance.post("/api/Entries/CreateEntries", body)
    return response
  }
}

function RegisterEntryPage({ refreshData, entryToEdit, onCancelEdit, closeModal, refreshFoods, showAlert }) {
  const [loading, setLoading] = useState(false)
  const [foods, setFoods] = useState([])
  const [previousPrice, setPreviousPrice] = useState("")
  const [conversionInfo, setConversionInfo] = useState(null)

  const BULTO_TO_KG = 40 // Constante de conversión

  const [formData, setFormData] = useState({
    id_Food: "",
    Fec_Entries: "",
    Fec_Expiration: "",
    Can_Food: "",
    vlr_Unitary: "",
    vlr_Total: 0,
    Nam_Food: "",
  })

  const isEditing = !!entryToEdit

  useEffect(() => {
    async function fetchFoods() {
      try {
        const response = await axiosInstance.get("/api/Food/ConsultAllFoods")
        setFoods(response.data)
      } catch (error) {
        console.error("Error al obtener alimentos:", error)
        if (showAlert) {
          showAlert("No se pudieron cargar los alimentos.", "error")
        } else {
          alert("No se pudieron cargar los alimentos.")
        }
      }
    }

    fetchFoods()
  }, [showAlert])

  useEffect(() => {
    const formatDate = (dateString) => {
      if (!dateString) return ""
      return new Date(dateString).toISOString().split("T")[0]
    }

    if (isEditing && entryToEdit && foods.length > 0) {
      console.log("Datos para editar entrada:", entryToEdit)

      const selectedFood = foods.find((food) => food.id_Food === entryToEdit.id_Food)

      setFormData({
        id_Food: entryToEdit.id_Food?.toString() || "",
        Fec_Entries: formatDate(entryToEdit.fec_Entries), // corregido
        Fec_Expiration: formatDate(entryToEdit.fec_Expiration), // corregido
        Can_Food: entryToEdit.can_Food?.toString() || "", // corregido
        vlr_Unitary: entryToEdit.vlr_Unitary?.toString() || "",
        vlr_Total: entryToEdit.vlr_Total || 0,
        Nam_Food: selectedFood?.nam_Food || entryToEdit.nam_Food || "",
      })

      if (selectedFood) {
        setPreviousPrice(selectedFood.vlr_Unit.toString())
      } else {
        setPreviousPrice("")
      }
    }
  }, [isEditing, entryToEdit, foods])





  // Calcular conversión y total cuando cambian cantidad o precio unitario
  useEffect(() => {
    const quantity = Number(formData.Can_Food)
    const unitary = Number(formData.vlr_Unitary)

    if (!isNaN(quantity) && quantity > 0) {
      const kgEquivalent = quantity * BULTO_TO_KG
      const selectedFood = foods.find((food) => food.id_Food === Number(formData.id_Food))
      const currentStock = selectedFood ? selectedFood.existence : 0
      const newStock = currentStock + kgEquivalent

      setConversionInfo({
        bultos: quantity,
        kilograms: kgEquivalent,
        currentStock,
        newStock,
      })
    } else {
      setConversionInfo(null)
    }

    if (!isNaN(quantity) && !isNaN(unitary)) {
      const total = quantity * unitary
      setFormData((prev) => ({ ...prev, vlr_Total: total }))
    }
  }, [formData.Can_Food, formData.vlr_Unitary, formData.id_Food, foods])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (name === "id_Food" && value) {
      const selectedFood = foods.find((food) => food.id_Food === Number(value))
      if (selectedFood) {
        setFormData((prev) => ({ ...prev, Nam_Food: selectedFood.nam_Food }))
        setPreviousPrice(selectedFood.vlr_Unit.toString())
      } else {
        setPreviousPrice("")
      }
    }
  }

  async function handlerSubmit(event) {
    event.preventDefault()

    const { id_Food, Fec_Entries, Fec_Expiration, Can_Food, vlr_Unitary, vlr_Total, Nam_Food } = formData

    if (!id_Food || !Fec_Entries || !Fec_Expiration || !Can_Food || !vlr_Unitary) {
      if (showAlert) {
        showAlert("Todos los campos son requeridos.", "error")
      } else {
        alert("Todos los campos son requeridos.")
      }
      return
    }

    const body = {
      id_Food: Number.parseInt(id_Food),
      Fec_Entries,
      Fec_Expiration,
      Can_Food: Number.parseInt(Can_Food),
      vlr_Unitary: Number.parseInt(vlr_Unitary),
      vlr_Total,
      Nam_Food,
    }

    if (isEditing && entryToEdit?.id_Entries) {
      body.id_Entries = entryToEdit.id_Entries
    }

    try {
      setLoading(true)
      const response = await SendData(body, isEditing)

      const kgAdded = Number.parseInt(Can_Food) * BULTO_TO_KG
      const successMessage =
        response.data.message ||
        (isEditing
          ? `Entrada actualizada. Inventario ajustado.`
          : `Entrada registrada. Se agregaron ${kgAdded} KG al inventario.`)

      if (showAlert) {
        showAlert(successMessage, "success")
      } else {
        alert(successMessage)
      }

      setFormData({
        id_Food: "",
        Fec_Entries: "",
        Fec_Expiration: "",
        Can_Food: "",
        vlr_Unitary: "",
        vlr_Total: 0,
        Nam_Food: "",
      })

      setPreviousPrice("")
      setConversionInfo(null)

      if (closeModal) closeModal()
      if (typeof refreshData === "function") refreshData()
      if (typeof refreshFoods === "function") refreshFoods()
    } catch (error) {
      console.error("Error completo:", error)
      const errorMessage = error.response?.data || "Error desconocido"

      if (showAlert) {
        showAlert(
          `Error al ${isEditing ? "actualizar" : "registrar"} la entrada: ${JSON.stringify(errorMessage)}`,
          "error",
        )
      } else {
        alert(`Error al ${isEditing ? "actualizar" : "registrar"} la entrada: ${JSON.stringify(errorMessage)}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.form_box}>
        <form className={styles.form} onSubmit={handlerSubmit}>
          <h1 className={styles.title}>{isEditing ? "Actualizar Entrada" : "Registrar Entrada"}</h1>

          {/* Información sobre conversión de bultos */}
          <div className="bg-blue-50 p-3 rounded-md mb-4">
            <div className="flex items-center text-blue-800 mb-2">
              <FaInfoCircle className="mr-2" />
              <span className="font-semibold">Sistema de Conversión Automática</span>
            </div>
            <div className="text-sm text-blue-700">
              <div className="flex items-center mb-1">
                <FaBoxes className="mr-2" />
                <span>
                  Las entradas se registran en <strong>BULTOS</strong>
                </span>
              </div>
              <div className="flex items-center">
                <FaCalculator className="mr-2" />
                <span>
                  Conversión automática: <strong>1 BULTO = {BULTO_TO_KG} KG</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Alimento */}
          <div className={styles.input_box}>
            <select id="id_Food" name="id_Food" value={formData.id_Food} onChange={handleInputChange}>
              <option value="">Selecciona un alimento</option>
              {foods.map((food) => (
                <option key={food.id_Food} value={food.id_Food}>
                  {food.nam_Food} - Stock actual: {food.existence} KG
                </option>
              ))}
            </select>
            <FaUtensils className={styles.icon} />
          </div>

          {/* Precio anterior */}
          <div className={styles.input_box}>
            <input
              type="text"
              name="previousPrice"
              placeholder="Precio Anterior del Alimento"
              value={previousPrice ? `$${previousPrice}` : ""}
              disabled
            />
            <FaTag className={styles.icon} />
          </div>

          {/* Fecha de Entrada */}
          <div className={styles.input_box}>
            <input
              type={formData.Fec_Entries ? "date" : "text"}
              name="Fec_Entries"
              placeholder="Fecha de Entrada"
              value={formData.Fec_Entries}
              onFocus={(e) => {
                e.target.type = "date"
                e.target.showPicker?.()
              }}
              onBlur={(e) => {
                if (!e.target.value) e.target.type = "text"
              }}
              onChange={handleInputChange}
            />
            <FaCalendarAlt className={styles.icon} />
          </div>

          {/* Fecha de Vencimiento */}
          <div className={styles.input_box}>
            <input
              type={formData.Fec_Expiration ? "date" : "text"}
              name="Fec_Expiration"
              placeholder="Fecha de Vencimiento"
              value={formData.Fec_Expiration}
              onFocus={(e) => {
                e.target.type = "date"
                e.target.showPicker?.()
              }}
              onBlur={(e) => {
                if (!e.target.value) e.target.type = "text"
              }}
              onChange={handleInputChange}
            />
            <FaCalendarAlt className={styles.icon} />
          </div>

          {/* Cantidad en Bultos */}
          <div className={styles.input_box}>
            <input
              type="number"
              name="Can_Food"
              placeholder="Cantidad de Alimento (en BULTOS)"
              step="1"
              min="1"
              value={formData.Can_Food}
              onChange={handleInputChange}
            />
            <FaBoxes className={styles.icon} />
          </div>

          {/* Información de conversión */}
          {conversionInfo && (
            <div className="bg-green-50 p-3 rounded-md mb-4">
              <h3 className="font-semibold text-green-800 mb-2 flex items-center">
                <FaCalculator className="mr-2" />
                Conversión e Impacto en Inventario
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
                <div>
                  <strong>Bultos ingresados:</strong> {conversionInfo.bultos}
                </div>
                <div>
                  <strong>Equivalente en KG:</strong> {conversionInfo.kilograms} KG
                </div>
                <div>
                  <strong>Stock actual:</strong> {conversionInfo.currentStock} KG
                </div>
                <div>
                  <strong>Nuevo stock:</strong> {conversionInfo.newStock} KG
                </div>
              </div>
            </div>
          )}

          {/* Valor Unitario por Bulto */}
          <div className={styles.input_box}>
            <input
              type="number"
              name="vlr_Unitary"
              placeholder="Valor Unitario por BULTO"
              value={formData.vlr_Unitary}
              onChange={handleInputChange}
            />
            <FaMoneyBillWave className={styles.icon} />
          </div>

          {/* Valor Total */}
          <div className={styles.input_box}>
            <input
              type="number"
              name="vlr_Total"
              placeholder="Valor Total"
              value={formData.vlr_Total}
              readOnly
              disabled
            />
            <FaCalculator className={styles.icon} />
          </div>

          <Button type="submit" className={styles.button} disabled={loading}>
            {loading
              ? isEditing
                ? "Actualizando..."
                : "Registrando..."
              : isEditing
                ? "Actualizar"
                : "Registrar Entrada"}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default RegisterEntryPage
