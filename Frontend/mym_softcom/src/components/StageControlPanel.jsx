"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import axiosInstance from "@/lib/axiosInstance"
import { FaClock, FaWeight, FaExchangeAlt, FaCheckCircle, FaExclamationTriangle, FaPlay, FaSync } from "react-icons/fa"

function StageControlPanel({ showAlert, pigletId = null }) {
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState(null)
    const [singleResult, setSingleResult] = useState(null)

    const checkAllStages = async () => {
        try {
            setLoading(true)
            const response = await axiosInstance.post("/api/Piglet/CheckAllStages")
            setResults(response.data)

            if (showAlert) {
                showAlert(`Verificación completada: ${response.data.stageChanges} cambios de etapa realizados`, "success")
            }
        } catch (error) {
            console.error("Error al verificar etapas:", error)
            if (showAlert) {
                showAlert("Error al verificar las etapas", "error")
            }
        } finally {
            setLoading(false)
        }
    }

    const checkSingleStage = async (id) => {
        try {
            setLoading(true)
            const response = await axiosInstance.post(`/api/Piglet/CheckStage/${id}`)
            setSingleResult(response.data)

            if (response.data.stageChanged) {
                if (showAlert) {
                    showAlert(`${response.data.pigletName} cambió a etapa ${response.data.newStage}`, "success")
                }
            } else {
                if (showAlert) {
                    showAlert(response.data.message, "info")
                }
            }
        } catch (error) {
            console.error("Error al verificar etapa:", error)
            if (showAlert) {
                showAlert("Error al verificar la etapa del lechón", "error")
            }
        } finally {
            setLoading(false)
        }
    }

    const getStatusIcon = (result) => {
        if (!result.success) return <FaExclamationTriangle className="text-red-500" />
        if (result.stageChanged) return <FaExchangeAlt className="text-green-500" />
        if (result.isWeightDeficient) return <FaExclamationTriangle className="text-orange-500" />
        return <FaCheckCircle className="text-blue-500" />
    }

    const getStatusColor = (result) => {
        if (!result.success) return "bg-red-50 border-red-200"
        if (result.stageChanged) return "bg-green-50 border-green-200"
        if (result.isWeightDeficient) return "bg-orange-50 border-orange-200"
        return "bg-blue-50 border-blue-200"
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Control Automático de Etapas</h2>
                <div className="flex space-x-2">
                    {pigletId && (
                        <Button
                            onClick={() => checkSingleStage(pigletId)}
                            disabled={loading}
                            variant="outline"
                            className="flex items-center space-x-2"
                        >
                            <FaPlay className="w-4 h-4" />
                            <span>Verificar Este Lechón</span>
                        </Button>
                    )}
                    <Button onClick={checkAllStages} disabled={loading} className="flex items-center space-x-2">
                        <FaSync className="w-4 h-4" />
                        <span>{loading ? "Verificando..." : "Verificar Todos"}</span>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-2">Pre-iniciación</h3>
                    <div className="text-sm text-blue-600">
                        <div className="flex items-center mb-1">
                            <FaWeight className="w-3 h-3 mr-1" />
                            <span>6.5 - 17.5 kg</span>
                        </div>
                        <div className="flex items-center">
                            <FaClock className="w-3 h-3 mr-1" />
                            <span>25 días máx.</span>
                        </div>
                    </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-2">Iniciación</h3>
                    <div className="text-sm text-green-600">
                        <div className="flex items-center mb-1">
                            <FaWeight className="w-3 h-3 mr-1" />
                            <span>17.5 - 30 kg</span>
                        </div>
                        <div className="flex items-center">
                            <FaClock className="w-3 h-3 mr-1" />

                        </div>
                    </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h3 className="font-semibold text-yellow-800 mb-2">Levante</h3>
                    <div className="text-sm text-yellow-600">
                        <div className="flex items-center mb-1">
                            <FaWeight className="w-3 h-3 mr-1" />
                            <span>30 - 60 kg</span>
                        </div>
                        <div className="flex items-center">
                            <FaClock className="w-3 h-3 mr-1" />

                        </div>
                    </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-800 mb-2">Engorde</h3>
                    <div className="text-sm text-purple-600">
                        <div className="flex items-center mb-1">
                            <FaWeight className="w-3 h-3 mr-1" />
                            <span>60 - 120 kg</span>
                        </div>
                        <div className="flex items-center">
                            <FaClock className="w-3 h-3 mr-1" />

                        </div>
                    </div>
                </div>
            </div>

            {singleResult && (
                <div className="mb-6">
                    <h3 className="font-semibold mb-2">Resultado Individual</h3>
                    <div className={`p-3 rounded-lg border ${getStatusColor(singleResult)}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                {getStatusIcon(singleResult)}
                                <div>
                                    <span className="font-medium">{singleResult.pigletName}</span>
                                    <span className="text-sm text-gray-500 ml-2">ID: {singleResult.pigletId}</span>
                                </div>
                            </div>
                            <div className="text-right text-sm">
                                <div className="flex items-center space-x-2">
                                    <FaWeight className="w-3 h-3" />
                                    <span>{singleResult.currentWeight} kg</span>
                                </div>
                                {singleResult.daysInStage && (
                                    <div className="flex items-center space-x-2 mt-1">
                                        <FaClock className="w-3 h-3" />
                                        <span>{singleResult.daysInStage} días</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-2">
                            <p className="text-sm">{singleResult.message}</p>
                            {singleResult.stageChanged && (
                                <p className="text-sm font-medium text-green-600 mt-1">
                                    Cambió de {singleResult.currentStage} a {singleResult.newStage}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {results && (
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Resumen de Verificación Masiva</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="font-medium">Total procesados:</span>
                                <span className="ml-2">{results.totalProcessed}</span>
                            </div>
                            <div>
                                <span className="font-medium">Cambios de etapa:</span>
                                <span className="ml-2 text-green-600">{results.stageChanges}</span>
                            </div>
                            <div>
                                <span className="font-medium">Peso deficiente:</span>
                                <span className="ml-2 text-orange-600">{results.weightDeficient}</span>
                            </div>
                            <div>
                                <span className="font-medium">Errores:</span>
                                <span className="ml-2 text-red-600">{results.errors}</span>
                            </div>
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-2">
                        {results.results.map((result) => (
                            <div key={result.pigletId} className={`p-3 rounded-lg border ${getStatusColor(result)}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        {getStatusIcon(result)}
                                        <div>
                                            <span className="font-medium">{result.pigletName}</span>
                                            <span className="text-sm text-gray-500 ml-2">ID: {result.pigletId}</span>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm">
                                        <div className="flex items-center space-x-2">
                                            <FaWeight className="w-3 h-3" />
                                            <span>{result.currentWeight} kg</span>
                                        </div>
                                        {result.daysInStage && (
                                            <div className="flex items-center space-x-2 mt-1">
                                                <FaClock className="w-3 h-3" />
                                                <span>{result.daysInStage} días</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-2">
                                    <p className="text-sm">{result.message}</p>
                                    {result.stageChanged && (
                                        <p className="text-sm font-medium text-green-600 mt-1">
                                            Cambió de {result.currentStage} a {result.newStage}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default StageControlPanel
