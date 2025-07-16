import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import axiosInstance from "@/lib/axiosInstance"

class PDFExportService {
    constructor() {
        this.doc = null
    }

    initializeDocument(orientation = "portrait") {
        // ✅ Permitir orientación horizontal
        this.doc = new jsPDF(orientation)
        this.doc.setFont("helvetica")
        return this.doc
    }

    // ✅ Obtener datos completos del lechón (igual que funciona en individual)
    async getPigletCompleteData(pigletId) {
        try {
            console.log(`Obteniendo datos para lechón ID: ${pigletId}`)

            // 1. Obtener datos básicos del lechón
            const pigletResponse = await axiosInstance.get(`/api/Piglet/GetPigletId?id_Piglet=${pigletId}`)
            const pigletData = pigletResponse.data

            console.log("Datos del lechón obtenidos:", pigletData)

            // 2. Obtener datos relacionados por separado si no vienen incluidos
            let corralData = null
            let raceData = null
            let stageData = null

            try {
                // ✅ Obtener corral por ID usando el endpoint correcto
                if (pigletData.id_Corral || pigletData.Id_Corral) {
                    const corralId = pigletData.id_Corral || pigletData.Id_Corral
                    const corralResponse = await axiosInstance.get(`/api/Corral/ConsultCorralById/${corralId}`)
                    corralData = corralResponse.data
                    console.log("Datos del corral:", corralData)
                }
            } catch (error) {
                console.warn("No se pudo obtener datos del corral:", error.message)
            }

            try {
                // ✅ Obtener raza por ID usando el endpoint correcto
                if (pigletData.id_Race || pigletData.Id_Race) {
                    const raceId = pigletData.id_Race || pigletData.Id_Race
                    const raceResponse = await axiosInstance.get(`/api/Race/GetRaceId?id_Race=${raceId}`)
                    raceData = raceResponse.data
                    console.log("Datos de la raza:", raceData)
                }
            } catch (error) {
                console.warn("No se pudo obtener datos de la raza:", error.message)
            }

            try {
                // ✅ Obtener etapa por ID usando el endpoint correcto
                if (pigletData.id_Stage || pigletData.Id_Stage) {
                    const stageId = pigletData.id_Stage || pigletData.Id_Stage
                    const stageResponse = await axiosInstance.get(`/api/Stage/GetStageId?id_Stage=${stageId}`)
                    stageData = stageResponse.data
                    console.log("Datos de la etapa:", stageData)
                }
            } catch (error) {
                console.warn("No se pudo obtener datos de la etapa:", error.message)
            }

            // 3. ✅ Obtener pesajes usando el endpoint correcto
            let weighingsData = []
            let pesoActual =
                pigletData.acum_Weight || pigletData.Acum_Weight || pigletData.weight_Initial || pigletData.Weight_Initial || 0
            let gananciaTotal = 0

            try {
                console.log(`Obteniendo pesajes para lechón ${pigletId}`)
                const weighingsResponse = await axiosInstance.get(`/api/Weighing/GetWeighingsByPiglet?id_Piglet=${pigletId}`)
                weighingsData = weighingsResponse.data || []
                console.log(`Pesajes encontrados: ${weighingsData.length}`)

                if (weighingsData.length > 0) {
                    // Ordenar pesajes por fecha
                    const sortedWeighings = weighingsData.sort(
                        (a, b) => new Date(a.fec_Weight || a.Fec_Weight) - new Date(b.fec_Weight || b.Fec_Weight),
                    )
                    const ultimoPesaje = sortedWeighings[sortedWeighings.length - 1]
                    pesoActual = ultimoPesaje.weight_Current || ultimoPesaje.Weight_Current
                    gananciaTotal = pesoActual - (pigletData.weight_Initial || pigletData.Weight_Initial || 0)
                    console.log(`Peso actual calculado: ${pesoActual}, Ganancia: ${gananciaTotal}`)
                } else {
                    console.log("No se encontraron pesajes, usando peso acumulado")
                    gananciaTotal = pesoActual - (pigletData.weight_Initial || pigletData.Weight_Initial || 0)
                }
            } catch (weighingError) {
                console.warn("Error al obtener pesajes:", weighingError.message)
                gananciaTotal = pesoActual - (pigletData.weight_Initial || pigletData.Weight_Initial || 0)
            }

            // ✅ Mapear datos correctamente según tu estructura de backend
            const mappedData = {
                // Campos del lechón (manejar ambas convenciones de nombres)
                id_Piglet: pigletData.id_Piglet || pigletData.Id_Piglet,
                name_Piglet: pigletData.name_Piglet || pigletData.Name_Piglet,
                weight_Initial: pigletData.weight_Initial || pigletData.Weight_Initial,
                acum_Weight: pigletData.acum_Weight || pigletData.Acum_Weight,
                sex_Piglet: pigletData.sex_Piglet || pigletData.Sex_Piglet,
                fec_Birth: pigletData.fec_Birth || pigletData.Fec_Birth,
                placa_Sena: pigletData.placa_Sena || pigletData.Placa_Sena,
                sta_Date: pigletData.sta_Date || pigletData.Sta_Date,

                // ✅ Campos relacionados obtenidos por separado o desde las relaciones
                des_Corral: corralData?.des_Corral || pigletData.corral?.Des_Corral || "Sin corral",
                nam_Race: raceData?.nam_Race || pigletData.race?.Nam_Race || "Sin raza",
                name_Stage: stageData?.name_Stage || pigletData.stage?.Name_Stage || "Sin etapa",

                // Campos calculados
                pesoActual,
                gananciaTotal,
            }

            console.log("Datos mapeados finales:", mappedData)

            return {
                pigletData: mappedData,
                weighingsData,
            }
        } catch (error) {
            console.error("Error al obtener datos completos del lechón:", error)
            throw error
        }
    }

    // ✅ Exportar un solo lechón (sin cambios)
    async exportSinglePiglet(pigletId) {
        try {
            console.log(`Iniciando exportación PDF para lechón ${pigletId}`)
            this.initializeDocument("portrait") // Individual en vertical

            const { pigletData, weighingsData } = await this.getPigletCompleteData(pigletId)

            this.addHeader(`Reporte de ${pigletData.name_Piglet || `Lechón ${pigletData.id_Piglet}`}`)
            this.addPigletBasicInfo(pigletData)

            if (weighingsData.length > 0) {
                this.addWeighingsTable(weighingsData)
            } else {
                this.addNoWeighingsMessage()
            }

            this.addFooter()

            const fileName = `Lechon_${pigletData.name_Piglet || pigletData.id_Piglet}_${new Date().toISOString().split("T")[0]}.pdf`
            this.doc.save(fileName)

            console.log(`PDF generado exitosamente: ${fileName}`)
            return true
        } catch (error) {
            console.error("Error al exportar PDF:", error)
            throw error
        }
    }

    // ✅ Exportar múltiples lechones en HORIZONTAL sin ID
    async exportMultiplePiglets(pigletsData) {
        try {
            console.log(`Exportando ${pigletsData.length} lechones a PDF`)
            this.initializeDocument("landscape") // ✅ HORIZONTAL para más espacio

            this.addHeaderLandscape("Reporte de Lechones")

            // ✅ Obtener datos completos para cada lechón usando la misma lógica que funciona
            const completeData = []
            // ✅ No limitamos a 25 lechones, procesamos todos gracias a la paginación
            const maxPiglets = pigletsData.length

            console.log(`Procesando ${maxPiglets} lechones...`)

            for (let i = 0; i < maxPiglets; i++) {
                const piglet = pigletsData[i]
                try {
                    console.log(`Procesando lechón ${i + 1}/${maxPiglets}: ${piglet.id_Piglet}`)

                    // ✅ Usar la misma función que funciona en individual
                    const { pigletData } = await this.getPigletCompleteData(piglet.id_Piglet)
                    completeData.push(pigletData)

                    console.log(
                        `✅ Lechón ${piglet.id_Piglet} procesado: Corral=${pigletData.des_Corral}, Raza=${pigletData.nam_Race}, Etapa=${pigletData.name_Stage}`,
                    )
                } catch (error) {
                    console.warn(`Error al obtener datos del lechón ${piglet.id_Piglet}:`, error)
                    // Usar datos básicos si no se pueden obtener completos
                    completeData.push({
                        id_Piglet: piglet.id_Piglet || piglet.Id_Piglet,
                        name_Piglet: piglet.name_Piglet || piglet.Name_Piglet || "Sin nombre",
                        weight_Initial: piglet.weight_Initial || piglet.Weight_Initial || 0,
                        pesoActual: piglet.acum_Weight || piglet.Acum_Weight || piglet.weight_Initial || piglet.Weight_Initial || 0,
                        acum_Weight: piglet.acum_Weight || piglet.Acum_Weight || 0,
                        gananciaTotal:
                            (piglet.acum_Weight || piglet.Acum_Weight || 0) - (piglet.weight_Initial || piglet.Weight_Initial || 0),
                        sex_Piglet: piglet.sex_Piglet || piglet.Sex_Piglet || "Sin dato",
                        placa_Sena: piglet.placa_Sena || piglet.Placa_Sena || "Sin dato",
                        des_Corral: "Sin datos",
                        nam_Race: "Sin datos",
                        name_Stage: "Sin datos",
                    })
                }
            }

            console.log(`Datos completos obtenidos para ${completeData.length} lechones`)

            this.addPigletsTableLandscapeWithoutID(completeData) // ✅ Nueva tabla sin ID con paginación
            this.addFooterLandscape()

            const fileName = `Reporte_Lechones_${new Date().toISOString().split("T")[0]}.pdf`
            this.doc.save(fileName)

            console.log(`PDF de ${completeData.length} lechones generado: ${fileName}`)
            return true
        } catch (error) {
            console.error("Error al exportar PDF de múltiples lechones:", error)
            throw error
        }
    }

    // ✅ Header para orientación horizontal
    addHeaderLandscape(title = "Reporte de Lechones") {
        const pageWidth = this.doc.internal.pageSize.width // Más ancho en horizontal

        this.doc.setFontSize(24)
        this.doc.setTextColor(40, 40, 40)
        this.doc.text("PESO PIG", pageWidth / 2, 20, { align: "center" })

        this.doc.setFontSize(18)
        this.doc.setTextColor(60, 60, 60)
        this.doc.text(title, pageWidth / 2, 35, { align: "center" })

        this.doc.setFontSize(12)
        this.doc.setTextColor(100, 100, 100)
        const currentDate = new Date().toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        this.doc.text(`Generado el: ${currentDate}`, pageWidth - 20, 15, { align: "right" })

        this.doc.setDrawColor(200, 200, 200)
        this.doc.line(20, 45, pageWidth - 20, 45)
    }

    // ✅ Tabla horizontal SIN ID y con PAGINACIÓN AUTOMÁTICA
    addPigletsTableLandscapeWithoutID(pigletsData) {
        const tableData = pigletsData.map((piglet) => [
            // ✅ QUITAMOS EL ID - empezamos directamente con el nombre
            piglet.name_Piglet || "Sin nombre",
            `${(piglet.weight_Initial || 0).toFixed(1)} kg`,
            `${(piglet.pesoActual || 0).toFixed(1)} kg`,
            `${(piglet.acum_Weight || 0).toFixed(1)} kg`,
            `${(piglet.gananciaTotal || 0).toFixed(2)} kg`,
            piglet.sex_Piglet || "Sin dato",
            piglet.des_Corral || "Sin corral",
            piglet.nam_Race || "Sin raza",
            piglet.name_Stage || "Sin etapa",
            piglet.placa_Sena || "Sin dato", // ✅ Más espacio para placa SENA
            piglet.fec_Birth ? new Date(piglet.fec_Birth).toLocaleDateString("es-ES") : "Sin fecha",
        ])

        // ✅ Tabla horizontal CON PAGINACIÓN AUTOMÁTICA
        autoTable(this.doc, {
            startY: 55,
            head: [
                ["Nombre", "P.Ini", "P.Act", "P.Acum", "Gan Peso", "Sexo", "Corral", "Raza", "Etapa", "Placa SENA", "Fecha N."],
            ],
            body: tableData,
            theme: "striped",
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: "bold",
                fontSize: 10,
            },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                overflow: "linebreak",
                halign: "center",
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },
            // ✅ Anchos redistribuidos sin ID - más espacio para Placa SENA
            columnStyles: {
                0: { cellWidth: 30 }, // Nombre Completo (más espacio)
                1: { cellWidth: 20 }, // Peso Inicial
                2: { cellWidth: 20 }, // Peso Actual
                3: { cellWidth: 25 }, // Peso Acumulado
                4: { cellWidth: 25 }, // Ganancia Total
                5: { cellWidth: 20 }, // Sexo
                6: { cellWidth: 20 }, // Corral
                7: { cellWidth: 35 }, // Raza
                8: { cellWidth: 25 }, // Etapa
                9: { cellWidth: 20 }, // Placa SENA
                10: { cellWidth: 30 }, // Fecha Nacimiento
            },
            margin: { left: 10, right: 10 },

            // ✅✅✅ CONFIGURACIÓN DE PAGINACIÓN AUTOMÁTICA ✅✅✅
            showHead: "everyPage", // Muestra los encabezados en cada página
            rowPageBreak: "avoid", // Evita cortar filas entre páginas
            pageBreak: "auto", // Salto de página automático

            // ✅ Función para personalizar cada página
            didDrawPage: (data) => {
                // Agregar número de página en el pie de página
                const pageNumber = this.doc.internal.getNumberOfPages()
                const totalPages = this.doc.internal.getNumberOfPages()
                const pageWidth = this.doc.internal.pageSize.width
                const pageHeight = this.doc.internal.pageSize.height

                // Si no es la primera página, agregar indicador de continuación
                if (pageNumber > 1) {
                    this.doc.setFontSize(14)
                    this.doc.setTextColor(80, 80, 80)
                    this.doc.text("", pageWidth / 2, 35, { align: "center" })
                }

                // Agregar número de página en cada página
                this.doc.setFontSize(8)
                this.doc.setTextColor(100, 100, 100)
                this.doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 20, pageHeight - 15, { align: "right" })
            },
        })

        // Agregar información sobre la cantidad de lechones
        const pageHeight = this.doc.internal.pageSize.height
        const pageWidth = this.doc.internal.pageSize.width

        this.doc.setFontSize(9)
        this.doc.setTextColor(80, 80, 80)
        this.doc.text(`Total de lechones: ${pigletsData.length}`, 20, pageHeight - 15)

        // Si hay más de 10 lechones, agregar nota informativa
        if (pigletsData.length > 10) {
            const currentPage = this.doc.internal.getNumberOfPages()
            this.doc.setPage(1) // Ir a la primera página
            this.doc.setFontSize(8)
            this.doc.setTextColor(100, 100, 100)
            this.doc.text("* Este reporte contiene múltiples páginas", 20, 50)
            this.doc.setPage(currentPage) // Volver a la página actual
        }
    }

    // ✅ Footer para orientación horizontal
    addFooterLandscape() {
        const pageHeight = this.doc.internal.pageSize.height
        const pageWidth = this.doc.internal.pageSize.width

        this.doc.setDrawColor(200, 200, 200)
        this.doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20)

        this.doc.setFontSize(10)
        this.doc.setTextColor(100, 100, 100)
        this.doc.text("Sistema de Gestión Porcina - PESO PIG", pageWidth / 2, pageHeight - 10, { align: "center" })
    }

    // ✅ Métodos existentes para exportación individual (sin cambios)
    addHeader(title = "Reporte de Lechón") {
        const pageWidth = this.doc.internal.pageSize.width

        this.doc.setFontSize(20)
        this.doc.setTextColor(40, 40, 40)
        this.doc.text("PESO PIG", pageWidth / 2, 20, { align: "center" })

        this.doc.setFontSize(16)
        this.doc.setTextColor(60, 60, 60)
        this.doc.text(title, pageWidth / 2, 30, { align: "center" })

        this.doc.setFontSize(10)
        this.doc.setTextColor(100, 100, 100)
        const currentDate = new Date().toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        this.doc.text(`Generado el: ${currentDate}`, pageWidth - 20, 15, { align: "right" })

        this.doc.setDrawColor(200, 200, 200)
        this.doc.line(20, 35, pageWidth - 20, 35)
    }

    addPigletBasicInfo(pigletData) {
        let yPosition = 50

        this.doc.setFontSize(14)
        this.doc.setTextColor(40, 40, 40)
        this.doc.text("INFORMACIÓN DEL LECHÓN", 20, yPosition)

        yPosition += 15

        const leftColumn = 20
        const rightColumn = 110

        this.doc.setFontSize(10)
        this.doc.setTextColor(60, 60, 60)

        // Columna izquierda
        this.doc.text(`ID: ${pigletData.id_Piglet || "N/A"}`, leftColumn, yPosition)
        this.doc.text(`Nombre: ${pigletData.name_Piglet || "N/A"}`, leftColumn, yPosition + 8)
        this.doc.text(`Peso Inicial: ${(pigletData.weight_Initial || 0).toFixed(1)} kg`, leftColumn, yPosition + 16)
        this.doc.text(`Peso Actual: ${(pigletData.pesoActual || 0).toFixed(1)} kg`, leftColumn, yPosition + 24)
        this.doc.text(`Peso Acumulado: ${(pigletData.acum_Weight || 0).toFixed(1)} kg`, leftColumn, yPosition + 32)
        this.doc.text(`Ganancia Total: ${(pigletData.gananciaTotal || 0).toFixed(2)} kg`, leftColumn, yPosition + 40)

        // Columna derecha
        this.doc.text(`Sexo: ${pigletData.sex_Piglet || "N/A"}`, rightColumn, yPosition)
        this.doc.text(`Corral: ${pigletData.des_Corral || "N/A"}`, rightColumn, yPosition + 8)
        this.doc.text(`Raza: ${pigletData.nam_Race || "N/A"}`, rightColumn, yPosition + 16)
        this.doc.text(`Etapa: ${pigletData.name_Stage || "N/A"}`, rightColumn, yPosition + 24)
        this.doc.text(`Placa SENA: ${pigletData.placa_Sena || "N/A"}`, rightColumn, yPosition + 32)
        this.doc.text(
            `Nacimiento: ${pigletData.fec_Birth ? new Date(pigletData.fec_Birth).toLocaleDateString("es-ES") : "N/A"}`,
            rightColumn,
            yPosition + 40,
        )
    }

    addWeighingsTable(weighingsData) {
        const tableData = weighingsData.map((weighing, index) => [
            index + 1,
            new Date(weighing.fec_Weight || weighing.Fec_Weight).toLocaleDateString("es-ES"),
            `${(weighing.weight_Current || weighing.Weight_Current).toFixed(1)} kg`,
            `${(weighing.weight_Gain || weighing.Weight_Gain) >= 0 ? "+" : ""}${(weighing.weight_Gain || weighing.Weight_Gain).toFixed(2)} kg`,
            weighing.nom_Users || weighing.Nom_Users || weighing.user?.Nom_Users || "N/A",
        ])

        autoTable(this.doc, {
            startY: 120,
            head: [["#", "Fecha", "Peso Actual", "Ganancia", "Usuario"]],
            body: tableData,
            theme: "striped",
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: "bold",
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },
        })
    }

    addNoWeighingsMessage() {
        this.doc.setFontSize(12)
        this.doc.setTextColor(100, 100, 100)
        this.doc.text("No hay pesajes registrados para este lechón.", 20, 120)
    }

    addFooter() {
        const pageHeight = this.doc.internal.pageSize.height
        const pageWidth = this.doc.internal.pageSize.width

        this.doc.setDrawColor(200, 200, 200)
        this.doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20)

        this.doc.setFontSize(8)
        this.doc.setTextColor(100, 100, 100)
        this.doc.text("Sistema de Gestión Porcina - PESO PIG", pageWidth / 2, pageHeight - 10, { align: "center" })
    }
}

export default new PDFExportService()
