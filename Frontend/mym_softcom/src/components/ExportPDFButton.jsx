"use client"
import { useState } from "react"
import { FaFilePdf, FaSpinner } from "react-icons/fa"
import axiosInstance from "@/lib/axiosInstance"
import PDFExportService from "@/services/pdfExportService"

function ExportPDFButton({ pigletData, className = "" }) {
    const [isExporting, setIsExporting] = useState(false)

    const handleExportSingle = async () => {
        try {
            setIsExporting(true)

            // Obtener pesajes del lechón
            const weighingsResponse = await axiosInstance.get(`/api/Weighing/GetWeighingsByPigletId/${pigletData.id_Piglet}`)
            const weighingsData = weighingsResponse.data || []

            // Exportar a PDF
            await PDFExportService.exportSinglePiglet(pigletData, weighingsData)
        } catch (error) {
            console.error("Error al exportar PDF:", error)
            alert("Error al generar el PDF. Por favor, intenta nuevamente.")
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <button
            onClick={handleExportSingle}
            disabled={isExporting}
            className={`flex items-center gap-1 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors ${className}`}
            title="Exportar a PDF"
        >
            {isExporting ? <FaSpinner className="animate-spin" /> : <FaFilePdf />}
            {isExporting ? "..." : "PDF"}
        </button>
    )
}

export default ExportPDFButton
