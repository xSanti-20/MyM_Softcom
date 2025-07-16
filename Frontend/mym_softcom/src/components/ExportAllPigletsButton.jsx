"use client"
import { useState } from "react"
import { FaFilePdf, FaSpinner } from "react-icons/fa"
import PDFExportService from "@/services/pdfExportService"

function ExportAllPigletsButton({ pigletsData, showAlert }) {
    const [isExporting, setIsExporting] = useState(false)

    const handleExportAll = async () => {
        try {
            setIsExporting(true)
            console.log(`Iniciando exportación de ${pigletsData.length} lechones`)

            // ✅ Validar que hay datos
            if (!pigletsData || pigletsData.length === 0) {
                const message = "No hay lechones para exportar"
                if (showAlert) {
                    showAlert("warning", message)
                } else {
                    alert(message)
                }
                return
            }

            // ✅ Usar el servicio final sin ID y con paginación
            await PDFExportService.exportMultiplePiglets(pigletsData)

            // ✅ Mensaje de éxito simple
            const successMessage = `PDF generado exitosamente con ${pigletsData.length} lechones`
            if (showAlert) {
                showAlert("success", successMessage)
            } else {
                alert(successMessage)
            }

            console.log("Exportación completada exitosamente")
        } catch (error) {
            console.error("Error al exportar PDF:", error)

            let errorMessage = "Error al generar el PDF"
            if (error.message.includes("404")) {
                errorMessage = "Error: No se pudieron obtener los datos de algunos lechones"
            } else if (error.message.includes("Network")) {
                errorMessage = "Error de conexión. Verifica tu conexión a internet"
            } else if (error.message.includes("timeout")) {
                errorMessage = "La exportación tardó demasiado. Intenta con menos lechones"
            } else {
                errorMessage = `Error al generar el PDF: ${error.message}`
            }

            if (showAlert) {
                showAlert("error", errorMessage)
            } else {
                alert(errorMessage)
            }
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <button
            onClick={handleExportAll}
            disabled={isExporting || !pigletsData || pigletsData.length === 0}
            className={`
        flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
        ${isExporting
                    ? "bg-gray-400 cursor-not-allowed"
                    : pigletsData && pigletsData.length > 0
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg"
                        : "bg-gray-300 cursor-not-allowed text-gray-500"
                }
      `}
            title={
                !pigletsData || pigletsData.length === 0
                    ? "No hay lechones para exportar"
                    : `Exportar ${pigletsData.length} lechones a PDF`
            }
        >
            {isExporting ? (
                <FaSpinner className="animate-spin" />
            ) : pigletsData && pigletsData.length > 0 ? (
                <FaFilePdf />
            ) : (
                <FaFilePdf className="opacity-50" />
            )}
            <span>
                {isExporting
                    ? "Exportando..."
                    : pigletsData && pigletsData.length > 0
                        ? `Exportar ${pigletsData.length} Lechones a PDF`
                        : "Sin datos para exportar"}
            </span>
        </button>
    )
}

export default ExportAllPigletsButton
