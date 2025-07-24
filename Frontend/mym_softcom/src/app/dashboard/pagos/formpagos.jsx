"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import axiosInstance from "@/lib/axiosInstance"
import { FaInfoCircle, FaWeight, FaExclamationTriangle } from "react-icons/fa"

function RegisterWeighing({ refreshData, weighingToEdit, onCancelEdit, closeModal, showAlert }) {
    const [formData, setFormData] = useState({
        weight_Current: "",
        fec_Weight: new Date().toISOString().split("T")[0],
        id_Piglet: "",
        id_Users: "",
    })

    const [piglets, setPiglets] = useState([])
    const [users, setUsers] = useState([])
    const [selectedPigletInfo, setSelectedPigletInfo] = useState(null)
    const [weighings, setWeighings] = useState([])
    const [loading, setLoading] = useState(false)
    const [calculatedGain, setCalculatedGain] = useState(0)

    useEffect(() => {
        fetchPiglets()
        fetchUsers()

        // Establecer fecha actual por defecto
        const today = new Date().toISOString().split("T")[0]
        setFormData((prev) => ({ ...prev, fec_Weight: today }))
    }, [])

    useEffect(() => {
        if (weighingToEdit) {
            setFormData({
                id_Weighings: weighingToEdit.id_Weighings,
                weight_Current: weighingToEdit.weight_Current || "",
                fec_Weight: weighingToEdit.fec_Weight ? new Date(weighingToEdit.fec_Weight).toISOString().split("T")[0] : "",
                id_Piglet: weighingToEdit.id_Piglet || "",
                id_Users: weighingToEdit.id_Users || "",
            })

            if (weighingToEdit.id_Piglet) {
                fetchPigletInfo(weighingToEdit.id_Piglet)
            }
        }
    }, [weighingToEdit])

    // ✅ CALCULAR GANANCIA CUANDO CAMBIE EL PESO ACTUAL
    useEffect(() => {
        if (formData.weight_Current && selectedPigletInfo) {
            calculateWeightGain()
        }
    }, [formData.weight_Current, selectedPigletInfo, weighings])

    const fetchPiglets = async () => {
        try {
            const response = await axiosInstance.get("/api/Piglet/GetActivePigletsForSelect")
            setPiglets(response.data)
        } catch (error) {
            console.error("Error al cargar lechones:", error)
        }
    }

    const fetchUsers = async () => {
        try {
            const response = await axiosInstance.get("/api/User/ConsultAllUser")
            setUsers(response.data)
        } catch (error) {
            console.error("Error al cargar usuarios:", error)
        }
    }

    // ✅ FUNCIÓN MEJORADA PARA OBTENER INFORMACIÓN DEL LECHÓN
    const fetchPigletInfo = async (pigletId) => {
        try {
            console.log(`Obteniendo información del lechón ${pigletId}`)

            // Obtener información completa del lechón
            const pigletResponse = await axiosInstance.get(`/api/Piglet/GetPigletForWeighing?id_Piglet=${pigletId}`)
            const pigletInfo = pigletResponse.data

            console.log("Información del lechón:", pigletInfo)

            // ✅ CORREGIDO: Obtener pesajes del lechón sin mostrar error si no hay
            const weighingsResponse = await axiosInstance.get(`/api/Weighing/GetWeighingsByPiglet?id_Piglet=${pigletId}`)
            const pigletWeighings = weighingsResponse.data || []

            console.log("Pesajes del lechón:", pigletWeighings)

            setSelectedPigletInfo(pigletInfo)
            setWeighings(pigletWeighings)
        } catch (error) {
            console.error("Error al obtener información del lechón:", error)
            // ✅ CORREGIDO: No mostrar error si es por falta de pesajes
            if (error.response && error.response.status === 404) {
                console.log("No se encontraron pesajes previos para este lechón")
                setWeighings([])
            } else {
                setSelectedPigletInfo(null)
                setWeighings([])
            }
        }
    }

    // ✅ FUNCIÓN CORREGIDA PARA CALCULAR GANANCIA DE PESO
    const calculateWeightGain = () => {
        if (!formData.weight_Current || !selectedPigletInfo) {
            setCalculatedGain(0)
            return
        }

        const currentWeight = Number.parseFloat(formData.weight_Current)
        let previousWeight = 0

        // ✅ CORREGIDO: Acceso correcto al peso inicial
        if (!weighings || weighings.length === 0) {
            // Si no hay pesajes previos, usar el peso inicial
            previousWeight =
                selectedPigletInfo.Weight_Initial || selectedPigletInfo.weight_Initial || selectedPigletInfo.acum_Weight || 0
            console.log(`Primer pesaje - Peso inicial: ${previousWeight}kg`)
        } else {
            // Si hay pesajes previos, usar el último peso registrado
            const sortedWeighings = weighings.sort((a, b) => new Date(b.fec_Weight) - new Date(a.fec_Weight))
            previousWeight =
                sortedWeighings[0]?.weight_Current ||
                selectedPigletInfo.Weight_Initial ||
                selectedPigletInfo.weight_Initial ||
                0
            console.log(`Pesajes previos - Último peso: ${previousWeight}kg`)
        }

        const gain = currentWeight - previousWeight
        setCalculatedGain(gain)

        console.log(`Cálculo de ganancia: ${currentWeight}kg - ${previousWeight}kg = ${gain}kg`)
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handlePigletChange = async (e) => {
        const pigletId = e.target.value
        setFormData((prev) => ({ ...prev, id_Piglet: pigletId }))

        if (pigletId) {
            await fetchPigletInfo(pigletId)
        } else {
            setSelectedPigletInfo(null)
            setWeighings([])
            setCalculatedGain(0)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        // Validaciones
        if (!formData.id_Piglet || !formData.weight_Current || !formData.fec_Weight || !formData.id_Users) {
            showAlert("Todos los campos son requeridos.", "error")
            setLoading(false)
            return
        }

        const currentWeight = Number.parseFloat(formData.weight_Current)

        // ✅ VALIDAR QUE EL PESO SEA POSITIVO
        if (currentWeight <= 0) {
            showAlert("El peso debe ser mayor a 0.", "error")
            setLoading(false)
            return
        }

        // ✅ VALIDAR QUE NO SEA UNA PÉRDIDA DE PESO EXCESIVA
        if (calculatedGain < -5) {
            const confirmProceed = window.confirm(
                `El lechón perdió ${Math.abs(calculatedGain).toFixed(1)} kg. ¿Estás seguro de que el peso es correcto?`,
            )
            if (!confirmProceed) {
                setLoading(false)
                return
            }
        }

        const body = {
            Weight_Current: currentWeight,
            Weight_Gain: calculatedGain, // ✅ Enviar la ganancia calculada
            Fec_Weight: formData.fec_Weight,
            Id_Piglet: Number.parseInt(formData.id_Piglet),
            id_Users: Number.parseInt(formData.id_Users),
        }

        if (weighingToEdit) {
            body.id_Weighings = formData.id_Weighings
        }

        try {
            if (weighingToEdit) {
                await axiosInstance.put("/api/Weighing/UpdateWeighing", body)
                showAlert(
                    "Pesaje actualizado correctamente. El sistema ha verificado automáticamente la etapa del lechón.",
                    "success",
                )
            } else {
                await axiosInstance.post("/api/Weighing/CreateWeighing", body)
                showAlert(
                    "Pesaje registrado correctamente. El sistema ha verificado automáticamente la etapa del lechón.",
                    "success",
                )
            }

            // Limpiar formulario
            setFormData({
                weight_Current: "",
                fec_Weight: new Date().toISOString().split("T")[0],
                id_Piglet: "",
                id_Users: "",
            })

            setSelectedPigletInfo(null)
            setWeighings([])
            setCalculatedGain(0)

            refreshData()
            closeModal()
        } catch (error) {
            console.error("Error al procesar pesaje:", error)
            const errorMessage = error.response?.data?.message || "Error al procesar el pesaje"
            showAlert(errorMessage, "error")
        } finally {
            setLoading(false)
        }
    }

    // ✅ FUNCIÓN CORREGIDA PARA OBTENER EL PESO ANTERIOR
    const getPreviousWeight = () => {
        if (!selectedPigletInfo) return 0

        if (!weighings || weighings.length === 0) {
            return (
                selectedPigletInfo.Weight_Initial || selectedPigletInfo.weight_Initial || selectedPigletInfo.acum_Weight || 0
            )
        }

        const sortedWeighings = weighings.sort((a, b) => new Date(b.fec_Weight) - new Date(a.fec_Weight))
        return (
            sortedWeighings[0]?.weight_Current || selectedPigletInfo.Weight_Initial || selectedPigletInfo.weight_Initial || 0
        )
    }

    const previousWeight = getPreviousWeight()

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                    {weighingToEdit ? "Editar Pesaje" : "Registrar Nuevo Pesaje"}
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Columna izquierda */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700">Información del Pesaje</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lechón *</label>
                            <select
                                name="id_Piglet"
                                value={formData.id_Piglet}
                                onChange={handlePigletChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar lechón</option>
                                {piglets
                                    .filter(
                                        (piglet) =>
                                            piglet &&
                                            (piglet.Id_Piglet || piglet.id_Piglet) &&
                                            (piglet.Name_Piglet || piglet.name_Piglet)
                                    )
                                    .map((piglet) => {
                                        const id = piglet.Id_Piglet ?? piglet.id_Piglet
                                        const name = piglet.Name_Piglet ?? piglet.name_Piglet
                                        const acum = piglet.Acum_Weight ?? piglet.acum_Weight ?? 0
                                        return (
                                            <option key={id} value={id}>
                                                {name}
                                            </option>
                                        )
                                    })}
                            </select>

                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Peso Actual (kg) *</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                name="weight_Current"
                                value={formData.weight_Current}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ingrese el peso actual"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del Pesaje *</label>
                            <input
                                type="date"
                                name="fec_Weight"
                                value={formData.fec_Weight}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
                            <select
                                name="id_Users"
                                value={formData.id_Users}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar usuario</option>
                                {users.map((user) => (
                                    <option key={user.id_Users} value={user.id_Users}>
                                        {user.nom_Users}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Columna derecha - Información del lechón */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                            <FaInfoCircle className="mr-2" />
                            Información del Lechón
                        </h3>

                        {selectedPigletInfo ? (
                            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm font-medium text-gray-600">Peso inicial:</span>
                                        <p className="text-lg font-semibold text-gray-800">
                                            {/* ✅ CORREGIDO: Acceso correcto al peso inicial */}
                                            {(
                                                selectedPigletInfo.Weight_Initial ||
                                                selectedPigletInfo.weight_Initial ||
                                                selectedPigletInfo.acum_Weight ||
                                                0
                                            ).toFixed(1)}{" "}
                                            kg
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-600">Peso acumulado:</span>
                                        <p className="text-lg font-semibold text-gray-800">
                                            {(selectedPigletInfo.Acum_Weight || selectedPigletInfo.acum_Weight || 0).toFixed(1)} kg
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-600">Etapa actual:</span>
                                        <p className="text-lg font-semibold text-gray-800">
                                            {selectedPigletInfo.Stage?.name_Stage || selectedPigletInfo.stage?.name_Stage || "Sin etapa"}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-600">Total pesajes:</span>
                                        <p className="text-lg font-semibold text-gray-800">{weighings.length}</p>
                                    </div>
                                </div>

                                {/* ✅ MOSTRAR PESO ANTERIOR Y GANANCIA CALCULADA */}
                                <div className="border-t pt-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-sm font-medium text-gray-600">Peso anterior:</span>
                                            <p className="text-lg font-semibold text-blue-600">{previousWeight.toFixed(1)} kg</p>
                                            <p className="text-xs text-gray-500">
                                                {weighings.length === 0 ? "(peso inicial)" : "(último pesaje)"}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-600">Ganancia calculada:</span>
                                            <p className={`text-lg font-semibold ${calculatedGain >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                {calculatedGain >= 0 ? "+" : ""}
                                                {calculatedGain.toFixed(1)} kg
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* ✅ INFORMACIÓN ADICIONAL */}
                                <div className="bg-blue-50 p-3 rounded-md">
                                    <p className="text-sm text-blue-700 flex items-center">
                                        <FaInfoCircle className="mr-2" />
                                        {weighings.length === 0
                                            ? "Este será el primer pesaje del lechón. La ganancia se calcula basándose en el peso inicial."
                                            : `La ganancia se calcula basándose en el último pesaje (${previousWeight.toFixed(1)} kg).`}
                                    </p>
                                </div>

                                {/* ✅ ADVERTENCIA SI HAY PÉRDIDA DE PESO */}
                                {calculatedGain < 0 && formData.weight_Current && (
                                    <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                                        <p className="text-sm text-yellow-700 flex items-center">
                                            <FaExclamationTriangle className="mr-2" />
                                            Advertencia: El lechón perdió {Math.abs(calculatedGain).toFixed(1)} kg. Verifica que el peso sea
                                            correcto.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
                                <FaWeight className="mx-auto text-3xl mb-2" />
                                <p>Selecciona un lechón para ver su información</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                    <Button type="button" onClick={onCancelEdit} variant="outline" disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading || !selectedPigletInfo} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? "Procesando..." : weighingToEdit ? "Actualizar" : "Registrar"}
                    </Button>
                </div>
            </form>
        </div>
    )
}

export default RegisterWeighing
