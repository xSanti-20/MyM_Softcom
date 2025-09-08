import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import axiosInstance from "@/lib/axiosInstance"

class SalesPDFService {
    constructor() {
        this.doc = null
    }

    initializeDocument(orientation = "portrait") {
        this.doc = new jsPDF(orientation)
        this.doc.setFont("helvetica")
        return this.doc
    }

    async getSaleCompleteData(saleId) {
        try {
            console.log(`Obteniendo datos para venta ID: ${saleId}`)

            // Get sale data
            const saleResponse = await axiosInstance.get(`/api/Sale/GetSaleID/${saleId}`)
            const saleData = saleResponse.data

            // Get client data
            let clientData = null
            if (saleData.id_Clients) {
                const clientResponse = await axiosInstance.get(`/api/Client/${saleData.id_Clients}`)
                clientData = clientResponse.data
            }

            // Get payment details
            let paymentDetails = []
            try {
                const detailsResponse = await axiosInstance.get(`/api/Detail/GetDetailsBySaleId/${saleId}`)
                paymentDetails = detailsResponse.data || []
            } catch (error) {
                console.warn("No se pudieron obtener detalles de pago:", error.message)
            }

            return {
                saleData,
                clientData,
                paymentDetails,
            }
        } catch (error) {
            console.error("Error al obtener datos completos de la venta:", error)
            throw error
        }
    }

    async generateBusinessSheet(saleId, saleRowData, temporaryData = null) {
        try {
            console.log(`Exportando PDF para venta ${saleId}`)

            // If temporaryData is provided, use it directly
            if (temporaryData) {
                return await this.generateBusinessSheetPDF(saleId, temporaryData)
            }

            // If no temporaryData, show confirmation dialog
            const shouldContinue = confirm(
                "Se necesita información adicional para generar la hoja de negocio. ¿Desea continuar con datos por defecto?",
            )

            if (!shouldContinue) {
                throw new Error("Generación de PDF cancelada por el usuario")
            }

            // Use default temporary data
            const defaultData = {
                lugarExpedicion: "Por definir",
                direccion: "Por definir",
                ciudad: "Por definir",
                estadoCivil: "Por definir",
                profesion: "Por definir",
            }

            return await this.generateBusinessSheetPDF(saleId, defaultData)
        } catch (error) {
            console.error("Error al generar hoja de negocio:", error)
            throw error
        }
    }

    async generateBusinessSheetPDF(saleId, temporaryData) {
        try {
            console.log(`Generando hoja de negocio para venta ${saleId}`)
            this.initializeDocument("portrait")

            const { saleData, clientData, paymentDetails } = await this.getSaleCompleteData(saleId)

            const templateData = {
                // Client data
                "{{nombre}}": clientData?.names || "N/A",
                "{{apellidos}}": clientData?.surnames || "N/A",
                "{{cedula}}": clientData?.document || "N/A",
                "{{telefono}}": clientData?.phone || "N/A",
                "{{email}}": clientData?.email || "N/A",

                "{{lugar_expedicion}}": temporaryData.lugarExpedicion || "Por definir",
                "{{direccion}}": temporaryData.direccion || "Por definir",
                "{{ciudad}}": temporaryData.ciudad || "Por definir",
                "{{estado_civil}}": temporaryData.estadoCivil || "Por definir",
                "{{profesion}}": temporaryData.profesion || "Por definir",

                // Sale data
                "{{proyecto}}": this.getProjectName(saleData) || "N/A",
                "{{lote}}": saleData.lot ? `${saleData.lot.block}-${saleData.lot.lot_number}` : "N/A",
                "{{valor_total}}": this.formatCurrency(saleData.total_value) || "N/A",
                "{{cuota_inicial}}": this.formatCurrency(saleData.initial_payment) || "N/A",
                "{{valor_cuota}}": this.formatCurrency(saleData.quota_value) || "N/A",
                "{{fecha_venta}}": saleData.sale_date ? new Date(saleData.sale_date).toLocaleDateString("es-ES") : "N/A",
                "{{plan_pagos}}": saleData.plan?.name || "N/A",

                // Current date
                "{{fecha_actual}}": new Date().toLocaleDateString("es-ES"),
            }

            this.addBusinessSheetHeader(templateData)
            this.addClientSection(templateData)
            this.addSaleSection(templateData)
            this.addPaymentQuotasTable(saleData, paymentDetails)
            this.addSignatureSection(templateData)
            this.addFooter()

            const fileName = `Hoja_Negocio_${saleData.id_Sales}_${clientData?.names || "Cliente"}_${new Date().toISOString().split("T")[0]}.pdf`
            this.doc.save(fileName)

            console.log(`PDF generado exitosamente: ${fileName}`)
            return true
        } catch (error) {
            console.error("Error al generar PDF de hoja de negocio:", error)
            throw error
        }
    }

    addBusinessSheetHeader(templateData) {
        const pageWidth = this.doc.internal.pageSize.width

        this.doc.setFontSize(20)
        this.doc.setTextColor(40, 40, 40)
        this.doc.text("HOJA DE NEGOCIO", pageWidth / 2, 20, { align: "center" })

        this.doc.setFontSize(12)
        this.doc.setTextColor(100, 100, 100)
        this.doc.text(`Fecha: ${templateData["{{fecha_actual}}"]}`, pageWidth - 20, 15, { align: "right" })

        this.doc.setDrawColor(200, 200, 200)
        this.doc.line(20, 25, pageWidth - 20, 25)
    }

    addClientSection(templateData) {
        let yPosition = 40

        this.doc.setFontSize(14)
        this.doc.setTextColor(40, 40, 40)
        this.doc.text("INFORMACIÓN DEL CLIENTE", 20, yPosition)

        yPosition += 15

        const leftColumn = 20
        const rightColumn = 110

        this.doc.setFontSize(10)
        this.doc.setTextColor(60, 60, 60)

        // Left column
        this.doc.text(`Nombres: ${templateData["{{nombre}}"]}`, leftColumn, yPosition)
        this.doc.text(`Apellidos: ${templateData["{{apellidos}}"]}`, leftColumn, yPosition + 8)
        this.doc.text(`Cédula: ${templateData["{{cedula}}"]}`, leftColumn, yPosition + 16)
        this.doc.text(`Lugar Expedición: ${templateData["{{lugar_expedicion}}"]}`, leftColumn, yPosition + 24)
        this.doc.text(`Teléfono: ${templateData["{{telefono}}"]}`, leftColumn, yPosition + 32)
        this.doc.text(`Email: ${templateData["{{email}}"]}`, leftColumn, yPosition + 40)

        // Right column
        this.doc.text(`Dirección: ${templateData["{{direccion}}"]}`, rightColumn, yPosition)
        this.doc.text(`Ciudad: ${templateData["{{ciudad}}"]}`, rightColumn, yPosition + 8)
        this.doc.text(`Estado Civil: ${templateData["{{estado_civil}}"]}`, rightColumn, yPosition + 16)
        this.doc.text(`Profesión: ${templateData["{{profesion}}"]}`, rightColumn, yPosition + 24)
    }

    addSaleSection(templateData) {
        let yPosition = 130

        this.doc.setFontSize(14)
        this.doc.setTextColor(40, 40, 40)
        this.doc.text("INFORMACIÓN DE LA VENTA", 20, yPosition)

        yPosition += 15

        const leftColumn = 20
        const rightColumn = 110

        this.doc.setFontSize(10)
        this.doc.setTextColor(60, 60, 60)

        // Left column
        this.doc.text(`Proyecto: ${templateData["{{proyecto}}"]}`, leftColumn, yPosition)
        this.doc.text(`Lote: ${templateData["{{lote}}"]}`, leftColumn, yPosition + 8)
        this.doc.text(`Valor Total: ${templateData["{{valor_total}}"]}`, leftColumn, yPosition + 16)
        this.doc.text(`Cuota Inicial: ${templateData["{{cuota_inicial}}"]}`, leftColumn, yPosition + 24)

        // Right column
        this.doc.text(`Valor Cuota: ${templateData["{{valor_cuota}}"]}`, rightColumn, yPosition)
        this.doc.text(`Fecha Venta: ${templateData["{{fecha_venta}}"]}`, rightColumn, yPosition + 8)
        this.doc.text(`Plan de Pagos: ${templateData["{{plan_pagos}}"]}`, rightColumn, yPosition + 16)
    }

    addPaymentQuotasTable(saleData, paymentDetails) {
        const quotaCount = this.getQuotaCount(saleData)
        const startDate = new Date(saleData.sale_date || new Date())
        const quotaValue = saleData.quota_value || 0

        const quotaSchedule = []
        for (let i = 1; i <= quotaCount; i++) {
            const dueDate = new Date(startDate)
            dueDate.setMonth(dueDate.getMonth() + i)

            quotaSchedule.push({
                numero: i,
                valor: quotaValue,
                fechaVencimiento: dueDate.toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                }),
            })
        }

        const halfLength = Math.ceil(quotaSchedule.length / 2)
        const tableData = []

        // ahora sí: emparejamos la cuota i con la cuota i+halfLength
        for (let i = 0; i < halfLength; i++) {
            const leftQuota = quotaSchedule[i]
            const rightQuota = quotaSchedule[i + halfLength]

            const row = [
                leftQuota ? leftQuota.numero : "",
                leftQuota ? this.formatCurrency(leftQuota.valor) : "",
                leftQuota ? leftQuota.fechaVencimiento : "",
                rightQuota ? rightQuota.numero : "",
                rightQuota ? this.formatCurrency(rightQuota.valor) : "",
                rightQuota ? rightQuota.fechaVencimiento : "",
            ]

            tableData.push(row)
        }

        autoTable(this.doc, {
            startY: 200,
            head: [["N. Cuota", "Valor", "Fecha Vencimiento", "N. Cuota", "Valor", "Fecha Vencimiento"]],
            body: tableData,
            theme: "grid",
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: "bold",
                fontSize: 9,
                lineColor: [0, 0, 0],
                lineWidth: 0.5,
            },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                halign: "center",
                lineColor: [0, 0, 0],
                lineWidth: 0.3,
                fillColor: [255, 255, 255],
            },
            columnStyles: {
                0: { cellWidth: 20, halign: "center" },
                1: { cellWidth: 25, halign: "right" },
                2: { cellWidth: 30, halign: "center" },
                3: { cellWidth: 20, halign: "center" },
                4: { cellWidth: 25, halign: "right" },
                5: { cellWidth: 30, halign: "center" },
            },
            margin: {
                left: (this.doc.internal.pageSize.width - 150) / 2,
                right: (this.doc.internal.pageSize.width - 150) / 2,
            },
        })
    }


    addSignatureSection(templateData) {
        const pageHeight = this.doc.internal.pageSize.height
        let yPosition = pageHeight - 80

        this.doc.setFontSize(12)
        this.doc.setTextColor(40, 40, 40)
        this.doc.text("FIRMAS", 20, yPosition)

        yPosition += 20

        // Client signature
        this.doc.setFontSize(10)
        this.doc.text("_________________________", 30, yPosition + 20)
        this.doc.text("Firma del Cliente", 30, yPosition + 30)
        this.doc.text(`${templateData["{{nombre}}"]} ${templateData["{{apellidos}}"]}`, 30, yPosition + 38)
        this.doc.text(`C.C. ${templateData["{{cedula}}"]}`, 30, yPosition + 46)

        // Company signature
        this.doc.text("_________________________", 130, yPosition + 20)
        this.doc.text("Firma Autorizada", 130, yPosition + 30)
        this.doc.text("Empresa", 130, yPosition + 38)
    }

    // Helper methods
    getProjectName(sale) {
        if (sale?.lot?.project?.name) return sale.lot.project.name
        if (sale?.lot?.Project?.name) return sale.lot.Project.name
        if (sale?.Lot?.project?.name) return sale.Lot.project.name
        if (sale?.Lot?.Project?.name) return sale.Lot.Project.name
        return "Sin proyecto"
    }

    getQuotaCount(saleData) {
        // Try to get quota count from plan or calculate from sale data
        if (saleData.plan?.quota_count) return saleData.plan.quota_count
        if (saleData.plan?.name?.includes("24")) return 24
        if (saleData.plan?.name?.includes("36")) return 36

        // Default calculation based on total debt and quota value
        if (saleData.total_debt && saleData.quota_value && saleData.quota_value > 0) {
            return Math.ceil(saleData.total_debt / saleData.quota_value)
        }

        return 24 // Default
    }

    formatCurrency(amount) {
        if (!amount) return "$0"
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
        }).format(amount)
    }

    addFooter() {
        const pageHeight = this.doc.internal.pageSize.height
        const pageWidth = this.doc.internal.pageSize.width

        this.doc.setDrawColor(200, 200, 200)
        this.doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20)

        this.doc.setFontSize(8)
        this.doc.setTextColor(100, 100, 100)
        this.doc.text("Sistema de Gestión de Ventas", pageWidth / 2, pageHeight - 10, { align: "center" })
    }
}

const salesPdfService = new SalesPDFService()
export { salesPdfService }
export default salesPdfService
