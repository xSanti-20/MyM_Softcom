"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import axiosInstance from "@/lib/axiosInstance"
import { FaInfoCircle, FaClock, FaWeight, FaExclamationTriangle } from "react-icons/fa"

function RegisterPiglet({ refreshData, pigletToEdit, onCancelEdit, closeModal, showAlert }) {
    const [formData, setFormData] = useState({
        name_Piglet: "",
        weight_Initial: "",
        fec_Birth: "",
        sex_Piglet: "",
        placa_Sena: "",
        id_Race: "",
        id_Corral: "",
        id_Stage: "",
    })

    const [races, setRaces] = useState([])
    const [corrals, setCorrals] = useState([])
    const [stages, setStages] = useState([])
    const [loading, setLoading] = useState(false)
    const [stageValidation, setStageValidation] = useState(null)

    // ✅ NUEVAS DEFINICIONES DE ETAPAS ACTUALIZADAS
    const newStageRanges = {
        PRE_INICIO: { name: "Pre-inicio", min: 6.5, max: 17.5, maxDays: 25 },
        INICIACION: { name: "Iniciación", min: 17.5, max: 30, maxDays: 24 },
        LEVANTE: { name: "Levante", min: 30, max: 60, maxDays: 42 },
        ENGORDE: { name: "Engorde", min: 60, max: 120, maxDays: 47 },
    }

    useEffect(() => {
        fetchRaces()
        fetchCorrals()
        fetchStages()
    }, [])

    useEffect(() => {
        if (pigletToEdit) {
            setFormData({
                id_Piglet: pigletToEdit.id_Piglet || pigletToEdit.Id_Piglet,
                name_Piglet: pigletToEdit.name_Piglet || pigletToEdit.Name_Piglet || "",
                weight_Initial: pigletToEdit.weight_Initial || pigletToEdit.Weight_Initial || "",
                fec_Birth: pigletToEdit.fec_Birth
                    ? new Date(pigletToEdit.fec_Birth).toISOString().split("T")[0]
                    : pigletToEdit.Fec_Birth
                        ? new Date(pigletToEdit.Fec_Birth).toISOString().split("T")[0]
                        : "",
                sex_Piglet: pigletToEdit.sex_Piglet || pigletToEdit.Sex_Piglet || "",
                placa_Sena: pigletToEdit.placa_Sena || pigletToEdit.Placa_Sena || "",
                id_Race: pigletToEdit.id_Race || pigletToEdit.Id_Race || "",
                id_Corral: pigletToEdit.id_Corral || pigletToEdit.Id_Corral || "",
                id_Stage: pigletToEdit.id_Stage || pigletToEdit.Id_Stage || "",
            })
        }
    }, [pigletToEdit])

    // Validar etapa cuando cambie el peso o la etapa seleccionada
    useEffect(() => {
        if (formData.weight_Initial && formData.id_Stage) {
            validateStageSelection()
        }
    }, [formData.weight_Initial, formData.id_Stage, stages])

    const validateStageSelection = () => {
        const weight = Number.parseFloat(formData.weight_Initial)
        if (!weight || !formData.id_Stage || !stages.length) {
            setStageValidation(null)
            return
        }

        const selectedStage = stages.find((s) => s.id_Stage == formData.id_Stage)
        if (!selectedStage) {
            setStageValidation(null)
            return
        }

        const stageKey = getStageKeyFromName(selectedStage.name_Stage)
        if (!stageKey || !newStageRanges[stageKey]) {
            setStageValidation(null)
            return
        }

        const stageDef = newStageRanges[stageKey]
        const isWeightInRange = weight >= stageDef.min && weight <= stageDef.max
        const suggestedStage = getSuggestedStageByWeight(weight)

        setStageValidation({
            isValid: isWeightInRange,
            currentStage: selectedStage.name_Stage,
            suggestedStage: suggestedStage?.name_Stage,
            weightRange: `${stageDef.min} - ${stageDef.max} kg`,
            message: isWeightInRange
                ? "El peso está dentro del rango para esta etapa"
                : `El peso ${weight} kg no está en el rango de ${selectedStage.name_Stage} (${stageDef.min} - ${stageDef.max} kg)`,
        })
    }

    const fetchRaces = async () => {
        try {
            const response = await axiosInstance.get("/api/Race/ConsultAllRaces")
            setRaces(response.data)
        } catch (error) {
            console.error("Error al cargar razas:", error)
        }
    }

    const fetchCorrals = async () => {
        try {
            const response = await axiosInstance.get("/api/Corral/ConsultAllCorrals")
            setCorrals(response.data)
        } catch (error) {
            console.error("Error al cargar corrales:", error)
        }
    }

    const fetchStages = async () => {
        try {
            const response = await axiosInstance.get("/api/Stage/ConsultAllStages")
            setStages(response.data)
        } catch (error) {
            console.error("Error al cargar etapas:", error)
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        // Validación de etapa por peso
        if (stageValidation && !stageValidation.isValid && !pigletToEdit) {
            const confirmProceed = window.confirm(
                `${stageValidation.message}. ¿Deseas continuar de todos modos? Se recomienda seleccionar la etapa ${stageValidation.suggestedStage}.`,
            )
            if (!confirmProceed) {
                setLoading(false)
                return
            }
        }

        const body = {
            ...formData,
            weight_Initial: Number.parseFloat(formData.weight_Initial),
        }

        // 🔒 Validación de placa SENA duplicada (en registro y edición)
        if (formData.placa_Sena) {
            try {
                const response = await axiosInstance.get("/api/Piglet/ConsultAllPiglets")
                const duplicate = response.data.find((p) => {
                    return (
                        String(p.placa_Sena) === String(formData.placa_Sena) &&
                        String(p.id_Piglet) !== String(formData.id_Piglet)
                    )
                })

                if (duplicate) {
                    showAlert("Ya existe un lechón con esta placa SENA.", "error")
                    setLoading(false)
                    return
                }
            } catch (err) {
                console.error("Error al verificar placa duplicada:", err)
                // Puedes mostrar un mensaje genérico si falla la consulta
                showAlert("Error al validar la placa SENA.", "error")
                setLoading(false)
                return
            }
        }

        try {
            if (pigletToEdit) {
                await axiosInstance.put("/api/Piglet/UpdatePiglet", body)
                showAlert(
                    "Lechón actualizado correctamente. El sistema ha verificado automáticamente la etapa según el peso actual.",
                    "success"
                )
            } else {
                await axiosInstance.post("/api/Piglet/CreatePiglet", body)
                showAlert(
                    "Lechón registrado correctamente. El sistema verificará automáticamente las transiciones de etapa según los nuevos rangos de peso.",
                    "success"
                )
            }

            // Limpiar formulario
            setFormData({
                name_Piglet: "",
                weight_Initial: "",
                fec_Birth: "",
                sex_Piglet: "",
                placa_Sena: "",
                id_Race: "",
                id_Corral: "",
                id_Stage: "",
            })

            refreshData()
            closeModal()
        } catch (error) {
            console.error("Error al procesar lechón:", error)

            const errorMessage =
                error.response?.data?.message || "Error al procesar el lechón"
            showAlert(errorMessage, "error")
        } finally {
            setLoading(false)
        }
    }


    const getSelectedStageInfo = () => {
        if (!formData.id_Stage || !stages.length) return null
        const selectedStage = stages.find((stage) => stage.id_Stage == formData.id_Stage)
        if (!selectedStage) return null
        const stageKey = getStageKeyFromName(selectedStage.name_Stage)
        if (stageKey && newStageRanges[stageKey]) {
            return {
                ...selectedStage,
                definition: newStageRanges[stageKey],
            }
        }
        return selectedStage
    }

    // ✅ FUNCIÓN ACTUALIZADA PARA LAS NUEVAS ETAPAS
    const getStageKeyFromName = (stageName) => {
        if (!stageName) return null
        const upperName = stageName.toUpperCase()

        // Pre-inicio o Precebo
        if (upperName.includes("PRE") && (upperName.includes("INICIO") || upperName.includes("PRECEBO")))
            return "PRE_INICIO"

        // Iniciación (pero no pre-iniciación)
        if (upperName.includes("INICIACION") && !upperName.includes("PRE")) return "INICIACION"

        // Levante
        if (upperName.includes("LEVANTE")) return "LEVANTE"

        // Engorde
        if (upperName.includes("ENGORDE")) return "ENGORDE"

        return null
    }

    // ✅ FUNCIÓN ACTUALIZADA CON LOS NUEVOS RANGOS
    const getSuggestedStageByWeight = (weight) => {
        if (!weight || !stages.length) return null
        const weightNum = Number.parseFloat(weight)

        // Pre-inicio: 6.5kg a 17.5kg
        if (weightNum >= 6.5 && weightNum < 17.5) {
            return stages.find((s) => {
                const upperName = s.name_Stage.toUpperCase()
                return upperName.includes("PRE") && (upperName.includes("INICIO") || upperName.includes("PRECEBO"))
            })
        }

        // Iniciación: 17.5kg a 30kg
        if (weightNum >= 17.5 && weightNum < 30) {
            return stages.find((s) => {
                const upperName = s.name_Stage.toUpperCase()
                return upperName.includes("INICIACION") && !upperName.includes("PRE")
            })
        }

        // Levante: 30kg a 60kg
        if (weightNum >= 30 && weightNum < 60) {
            return stages.find((s) => s.name_Stage.toUpperCase().includes("LEVANTE"))
        }

        // Engorde: 60kg a 120kg
        if (weightNum >= 60) {
            return stages.find((s) => s.name_Stage.toUpperCase().includes("ENGORDE"))
        }

        return null
    }

    const selectedStageInfo = getSelectedStageInfo()
    const suggestedStage = getSuggestedStageByWeight(formData.weight_Initial)

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                    {pigletToEdit ? "Editar Lechón" : "Registrar Nuevo Lechón"}
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Columna izquierda */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700">Información Básica</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Lechón *</label>
                            <input
                                type="text"
                                name="name_Piglet"
                                value={formData.name_Piglet}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Peso Actual (kg) *</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                name="weight_Initial"
                                value={formData.weight_Initial}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {suggestedStage && (
                                <p className="text-xs text-blue-600 mt-1 flex items-center">
                                    <FaInfoCircle className="mr-1" />
                                    Etapa sugerida por peso: {suggestedStage.name_Stage}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento *</label>
                            <input
                                type="date"
                                name="fec_Birth"
                                value={formData.fec_Birth}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sexo *</label>
                            <select
                                name="sex_Piglet"
                                value={formData.sex_Piglet}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar sexo</option>
                                <option value="Macho">Macho</option>
                                <option value="Hembra">Hembra</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Placa SENA</label>
                            <input
                                type="number"
                                name="placa_Sena"
                                value={formData.placa_Sena}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Columna derecha */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700">Clasificación</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Raza *</label>
                            <select
                                name="id_Race"
                                value={formData.id_Race}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar raza</option>
                                {races.map((race) => (
                                    <option key={race.id_Race} value={race.id_Race}>
                                        {race.nam_Race}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Corral *</label>
                            <select
                                name="id_Corral"
                                value={formData.id_Corral}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar corral</option>
                                {corrals.map((corral) => (
                                    <option key={corral.id_Corral} value={corral.id_Corral}>
                                        {corral.des_Corral || `Corral ${corral.id_Corral}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Etapa Actual *
                                <span className="text-xs text-gray-500 ml-2">(El sistema verificará automáticamente)</span>
                            </label>
                            <select
                                name="id_Stage"
                                value={formData.id_Stage}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar etapa actual</option>
                                {stages.map((stage) => (
                                    <option key={stage.id_Stage} value={stage.id_Stage}>
                                        {stage.name_Stage}
                                    </option>
                                ))}
                            </select>

                            {/* Validación de etapa */}
                            {stageValidation && (
                                <div
                                    className={`mt-2 p-2 rounded-md text-sm ${stageValidation.isValid
                                        ? "bg-green-50 text-green-700 border border-green-200"
                                        : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                        }`}
                                >
                                    <div className="flex items-center">
                                        {stageValidation.isValid ? (
                                            <FaInfoCircle className="mr-2" />
                                        ) : (
                                            <FaExclamationTriangle className="mr-2" />
                                        )}
                                        <span>{stageValidation.message}</span>
                                    </div>
                                    {!stageValidation.isValid && stageValidation.suggestedStage && (
                                        <div className="mt-1 text-xs">Etapa recomendada: {stageValidation.suggestedStage}</div>
                                    )}
                                </div>
                            )}

                            {!pigletToEdit && formData.id_Stage && (
                                <p className="text-xs text-green-600 mt-1 flex items-center">
                                    <FaClock className="mr-1" />
                                    El sistema verificará automáticamente las transiciones de etapa
                                </p>
                            )}
                        </div>

                        {selectedStageInfo && selectedStageInfo.definition && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                                    <FaInfoCircle className="mr-2" />
                                    {selectedStageInfo.name_Stage}
                                </h4>
                                <div className="text-sm text-blue-600 space-y-1">
                                    <div className="flex items-center">
                                        <FaWeight className="mr-2" />
                                        <strong>Rango de peso:</strong> {selectedStageInfo.definition.min} -{" "}
                                        {selectedStageInfo.definition.max} kg
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ✅ INFORMACIÓN ACTUALIZADA CON LAS NUEVAS ETAPAS */}
                {!pigletToEdit && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-semibold text-yellow-800 mb-2">📋 Nuevas Etapas de Crecimiento</h4>
                        <div className="text-sm text-yellow-700 space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <strong>Pre-inicio:</strong> 6.5 - 17.5 kg
                                </div>
                                <div>
                                    <strong>Iniciación:</strong> 17.5 - 30 kg
                                </div>
                                <div>
                                    <strong>Levante:</strong> 30 - 60 kg
                                </div>
                                <div>
                                    <strong>Engorde:</strong> 60 - 120 kg
                                </div>
                            </div>
                            <ul className="mt-2 space-y-1">
                                <li>• El sistema verificará automáticamente las transiciones de etapa</li>
                                <li>• Se recomienda seleccionar la etapa apropiada según el peso actual</li>
                                <li>• Las transiciones se basan en peso y tiempo en etapa</li>
                            </ul>
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-4 pt-6 border-t">
                    <Button type="button" onClick={onCancelEdit} variant="outline" disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? "Procesando..." : pigletToEdit ? "Actualizar" : "Registrar"}
                    </Button>
                </div>
            </form>
        </div>
    )
}

export default RegisterPiglet
