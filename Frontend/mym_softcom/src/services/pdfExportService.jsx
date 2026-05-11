function numeroALetras(amount) {
  if (amount == null) return ""

  // Asegurar número
  const numero = Number(amount) || 0
  const entero = Math.floor(Math.abs(numero))
  const centavos = Math.round((Math.abs(numero) - entero) * 100)

  // funciones internas para convertir grupos
  const unidades = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"]
  const especiales = {
    10: "diez",
    11: "once",
    12: "doce",
    13: "trece",
    14: "catorce",
    15: "quince",
    16: "dieciseis",
    17: "diecisiete",
    18: "dieciocho",
    19: "diecinueve",
    20: "veinte",
  }
  const decenas = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"]
  const centenas = [
    "",
    "ciento",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
  ]

  function tresCifras(n) {
    let str = ""
    n = Number(n)
    if (n === 0) return ""
    if (n === 100) return "cien"
    const c = Math.floor(n / 100)
    const r = n % 100
    if (c > 0) str += centenas[c]

    if (r > 0) {
      if (str) str += " "
      if (r < 10) {
        str += unidades[r]
      } else if (r < 21) {
        str += especiales[r] || ""
      } else {
        const d = Math.floor(r / 10)
        const u = r % 10
        if (d === 2 && u !== 0) {
          // veintiuno, veintidos...
          str += "veinti" + unidades[u]
        } else {
          str += decenas[d]
          if (u !== 0) str += " y " + unidades[u]
        }
      }
    }
    return str
  }

  function seccion(num, divisor, singular, plural) {
    const cientos = Math.floor(num / divisor)
    const resto = num - cientos * divisor
    let palabras = ""
    if (cientos > 0) {
      if (cientos > 1) palabras = `${convertir(cientos)} ${plural}`
      else palabras = singular
    }
    if (resto > 0) palabras = (palabras ? `${palabras} ` : "") + convertir(resto)
    return palabras
  }

  function convertir(num) {
    num = Number(num)
    if (num < 1000) return tresCifras(num)
    if (num < 1000000) {
      const miles = Math.floor(num / 1000)
      const resto = num % 1000
      const milesStr = miles === 1 ? "mil" : `${convertir(miles)} mil`
      return resto > 0 ? `${milesStr} ${tresCifras(resto)}` : milesStr
    }
    if (num < 1000000000000) {
      // millones
      const millones = Math.floor(num / 1000000)
      const resto = num % 1000000
      const millonesStr = millones === 1 ? "un millon" : `${convertir(millones)} millones`
      return resto > 0 ? `${millonesStr} ${convertir(resto)}` : millonesStr
    }
    // para números muy grandes (no esperados)
    return String(num)
  }

  // construir la cadena final
  let palabras = convertir(entero)

  // Ajustes comunes: "uno" -> "un" antes de palabras masculinas como "millón" o "peso"
  // Reemplazos simples para mejorar gramática
  palabras = palabras.replace(/\buno mil\b/gi, "mil") // "uno mil" -> "mil"
  palabras = palabras.replace(/\bun millón\b/gi, "un millon")

  // Uppercase y añadir moneda
  let resultado = palabras ? palabras.toUpperCase() + " PESOS M/CTE" : "CERO PESOS M/CTE"

  // añadir centavos si existen
  if (centavos > 0) {
    resultado += ` CON ${centavos.toString().padStart(2, "0")}/100`
  }

  return resultado
}

function numeroALetrasSinMoneda(amount) {
  if (amount == null) return ""

  // Asegurar número
  const numero = Number(amount) || 0
  const entero = Math.floor(Math.abs(numero))

  // funciones internas para convertir grupos (reutilizando las mismas de numeroALetras)
  const unidades = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"]
  const especiales = {
    10: "diez",
    11: "once",
    12: "doce",
    13: "trece",
    14: "catorce",
    15: "quince",
    16: "dieciseis",
    17: "diecisiete",
    18: "dieciocho",
    19: "diecinueve",
    20: "veinte",
  }
  const decenas = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"]
  const centenas = [
    "",
    "ciento",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
  ]

  function tresCifras(n) {
    let str = ""
    n = Number(n)
    if (n === 0) return ""
    if (n === 100) return "cien"
    const c = Math.floor(n / 100)
    const r = n % 100
    if (c > 0) str += centenas[c]

    if (r > 0) {
      if (str) str += " "
      if (r < 10) {
        str += unidades[r]
      } else if (r < 21) {
        str += especiales[r] || ""
      } else {
        const d = Math.floor(r / 10)
        const u = r % 10
        if (d === 2 && u !== 0) {
          // veintiuno, veintidos...
          str += "veinti" + unidades[u]
        } else {
          str += decenas[d]
          if (u !== 0) str += " y " + unidades[u]
        }
      }
    }
    return str
  }

  function convertir(num) {
    num = Number(num)
    if (num < 1000) return tresCifras(num)
    if (num < 1000000) {
      const miles = Math.floor(num / 1000)
      const resto = num % 1000
      const milesStr = miles === 1 ? "mil" : `${convertir(miles)} mil`
      return resto > 0 ? `${milesStr} ${tresCifras(resto)}` : milesStr
    }
    if (num < 1000000000000) {
      // millones
      const millones = Math.floor(num / 1000000)
      const resto = num % 1000000
      const millonesStr = millones === 1 ? "un millon" : `${convertir(millones)} millones`
      return resto > 0 ? `${millonesStr} ${convertir(resto)}` : millonesStr
    }
    return String(num)
  }

  // construir la cadena final sin moneda
  let palabras = convertir(entero)

  // Ajustes comunes
  palabras = palabras.replace(/\buno mil\b/gi, "mil") // "uno mil" -> "mil"
  palabras = palabras.replace(/\bun millón\b/gi, "un millon")

  // Solo uppercase, sin moneda
  return palabras ? palabras.toUpperCase() : "CERO"
}

function buildPlanPagosHTML(saleData) {
  console.log("[v0] buildPlanPagosHTML called with saleData:", saleData)

  if (!saleData || !saleData.plan) {
    console.log("[v0] No plan found in saleData")
    return `
      <table class="plan-pagos-table">
        <thead>
          <tr>
            <th>Cuota #</th>
            <th>Valor</th>
            <th>Fecha Vencimiento</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="3" style="text-align: center; padding: 20px;">No hay plan de pagos definido</td>
          </tr>
        </tbody>
      </table>
    `
  }

  const totalQuotas = saleData.plan.number_quotas || 0
  const saleDate = new Date(saleData.sale_date)
  const paymentPlanType = saleData.paymentPlanType || saleData.PaymentPlanType
  const customQuotasJson = saleData.customQuotasJson || saleData.CustomQuotasJson

  console.log("[v0] Payment Plan Type:", paymentPlanType)
  console.log("[v0] Custom Quotas JSON:", customQuotasJson)

  // Detectar si es plan personalizado
  let customQuotas = null
  if (paymentPlanType?.toLowerCase() === "custom" && customQuotasJson) {
    try {
      customQuotas = JSON.parse(customQuotasJson)
      console.log("[v0] Custom plan detected with", customQuotas?.length, "personalized quotas")
      console.log("[v0] First 3 custom quotas:", customQuotas?.slice(0, 3))
    } catch (error) {
      console.error("Error parsing custom quotas JSON:", error)
    }
  }

  const quotaValue = saleData.quota_value || 0

  if (totalQuotas === 0) {
    console.log("[v0] Invalid quota data - totalQuotas:", totalQuotas)
    return `
      <table class="plan-pagos-table">
        <thead>
          <tr>
            <th>Cuota #</th>
            <th>Valor</th>
            <th>Fecha Vencimiento</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="3" style="text-align: center; padding: 20px;">Datos de cuotas inválidos</td>
          </tr>
        </tbody>
      </table>
    `
  }

  console.log("[v0] Generating quotas - totalQuotas:", totalQuotas, "paymentPlanType:", paymentPlanType)

  const rows = []
  for (let i = 1; i <= totalQuotas; i++) {
    // ✅ Fecha por defecto: calculada automáticamente (corregida para evitar desbordamiento)
    const saleDay = saleDate.getDate()
    const saleMonth = saleDate.getMonth()
    const saleYear = saleDate.getFullYear()

    // Calcular el año y mes de destino
    const totalMonths = saleMonth + i
    const targetYear = saleYear + Math.floor(totalMonths / 12)
    const targetMonth = ((totalMonths % 12) + 12) % 12 // Asegurar que esté entre 0-11

    // ✅ Obtener el último día del mes de destino ANTES de crear la fecha
    const maxDayInMonth = new Date(targetYear, targetMonth + 1, 0).getDate()

    // Crear la fecha directamente con el día correcto
    const finalDay = Math.min(saleDay, maxDayInMonth)
    const dueDate = new Date(targetYear, targetMonth, finalDay)

    // Usar valor de cuota personalizada si existe, sino usar el valor automático
    let currentQuotaValue = quotaValue
    let formattedDate = dueDate.toLocaleDateString("es-CO")

    if (customQuotas && customQuotas.length > 0) {
      const customQuota = customQuotas.find(q => q.quotaNumber === i || q.QuotaNumber === i)
      if (customQuota) {
        // Intentar con Amount (mayúscula) y amount (minúscula)
        const customAmount = customQuota.amount || customQuota.Amount
        if (customAmount) {
          currentQuotaValue = customAmount
          if (i <= 3 || i === totalQuotas) {
            console.log(`[v0] Quota ${i}: Using custom value ${currentQuotaValue}`)
          }
        }

        // ✅ CORRECCIÓN: Usar fecha personalizada si existe
        const customDueDate = customQuota.dueDate || customQuota.DueDate
        if (customDueDate) {
          // Parsear manualmente para evitar problemas de UTC
          const [year, month, day] = customDueDate.split('-').map(Number)
          const localDate = new Date(year, month - 1, day)
          formattedDate = localDate.toLocaleDateString("es-CO")
          if (i <= 3 || i === totalQuotas) {
            console.log(`[v0] Quota ${i}: Using custom date ${customDueDate} -> ${formattedDate}`)
          }
        }
      }
    } else if (i === 1) {
      console.log("[v0] No custom quotas found, using automatic value:", quotaValue)
    }

    rows.push(`
      <tr>
        <td>${i}</td>
        <td>${new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(currentQuotaValue)}</td>
        <td>${formattedDate}</td>
      </tr>
    `)
  }

  const planHTML = `
    <table class="plan-pagos-table">
      <thead>
        <tr>
          <th>Cuota #</th>
          <th>Valor</th>
          <th>Fecha Vencimiento</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  `

  console.log("[v0] Generated plan HTML with", totalQuotas, "quotas")
  return planHTML
}

class SalesPDFService {
  /**
   * Convierte números a letras sin moneda
   */
  numeroALetrasSinMoneda(amount) {
    return numeroALetrasSinMoneda(amount)
  }

  /**
   * Genera un PDF de reporte de venta (para consultas del cliente)
   * @param {object} clientData - Datos del cliente
   * @param {object} saleData - Datos de la venta
   * @param {array} detailsData - Detalles de pagos/cuotas
   */
  async generateSaleReportPDF(clientData, saleData, detailsData) {
    try {
      console.log("[SaleReport] Generating sale report PDF")

      const formatCurrency = (amount) => {
        return new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format(amount || 0)
      }

      const formatDate = (date) => {
        return new Date(date).toLocaleDateString("es-CO")
      }

      // Construir tabla de cuotas
      let quotasTableHTML = `
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 12px 10px; text-align: left; font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase;">Cuota #</th>
              <th style="border: 1px solid #ddd; padding: 12px 10px; text-align: center; font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase;">Valor Cuota</th>
              <th style="border: 1px solid #ddd; padding: 12px 10px; text-align: center; font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase;">Monto Cubierto</th>
              <th style="border: 1px solid #ddd; padding: 12px 10px; text-align: center; font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase;">Saldo</th>
              <th style="border: 1px solid #ddd; padding: 12px 10px; text-align: center; font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase;">Estado</th>
            </tr>
          </thead>
          <tbody>
      `

      // Agrupar detalles por cuota
      const detailsByQuota = {}
      detailsData?.forEach(detail => {
        if (!detailsByQuota[detail.number_quota]) {
          detailsByQuota[detail.number_quota] = 0
        }
        detailsByQuota[detail.number_quota] += detail.covered_amount || 0
      })

      const numQuotas = saleData.plan?.number_quotas || 0
      const quotaValue = saleData.quota_value || 0

      // Mostrar TODAS las cuotas
      for (let i = 1; i <= numQuotas; i++) {
        const covered = detailsByQuota[i] || 0
        const remaining = quotaValue - covered
        const status = covered >= quotaValue ? "✓ Pagada" : "Pendiente"
        const statusColor = covered >= quotaValue ? "#27ae60" : "#e74c3c"
        const rowBg = i % 2 === 0 ? "#fafafa" : "#fff"

        quotasTableHTML += `
          <tr style="background-color: ${rowBg};">
            <td style="border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px;">${i}</td>
            <td style="border: 1px solid #ddd; padding: 10px; text-align: right; font-size: 13px;">${formatCurrency(quotaValue)}</td>
            <td style="border: 1px solid #ddd; padding: 10px; text-align: right; font-size: 13px;">${formatCurrency(covered)}</td>
            <td style="border: 1px solid #ddd; padding: 10px; text-align: right; font-size: 13px;">${formatCurrency(remaining)}</td>
            <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 13px; color: ${statusColor}; font-weight: bold;">${status}</td>
          </tr>
        `
      }

      quotasTableHTML += `
            </tbody>
          </table>
      `

      // Construir HTML del reporte
      const reportHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Reporte de Venta - ${clientData.names} ${clientData.surnames}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                line-height: 1.6; 
                color: #333;
                background-color: #fff;
              }
              .container { max-width: 950px; margin: 0 auto; padding: 30px 20px; }
              .header { 
                text-align: center; 
                border-bottom: 4px solid #e91e63; 
                padding-bottom: 25px; 
                margin-bottom: 40px;
              }
              .header h1 { 
                margin: 0 0 8px 0; 
                color: #2c3e50; 
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 0.5px;
              }
              .header .subtitle { 
                color: #7f8c8d; 
                font-size: 14px;
                margin: 5px 0;
              }
              .header .date { 
                color: #95a5a6; 
                font-size: 11px;
                margin-top: 8px;
              }
              .section { 
                margin-bottom: 35px;
                display: flex;
              }
              .sidebar { 
                width: 10px; 
                height: auto; 
                background-color: #e91e63; 
                margin-right: 0;
              }
              .section-content {
                flex: 1;
              }
              .section-title { 
                background-color: #e91e63; 
                color: white; 
                padding: 14px 18px; 
                font-size: 13px; 
                font-weight: bold; 
                letter-spacing: 0.5px;
                text-transform: uppercase;
              }
              .section-body { 
                padding: 20px 18px;
                background-color: #fafafa;
              }
              .info-row { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 30px; 
                margin-bottom: 18px;
              }
              .info-item { }
              .info-label { 
                font-weight: bold; 
                color: #e91e63; 
                font-size: 10px; 
                text-transform: uppercase;
                letter-spacing: 0.3px;
                margin-bottom: 4px;
              }
              .info-value { 
                font-size: 14px; 
                color: #2c3e50;
                font-weight: 500;
              }
              .financial-row {
                display: flex;
                gap: 12px;
                margin-bottom: 15px;
              }
              .financial-card { 
                flex: 1;
                background-color: #fff; 
                padding: 16px; 
                border-radius: 3px;
                text-align: center; 
                border-top: 4px solid #e91e63;
                box-shadow: 0 1px 3px rgba(0,0,0,0.08);
              }
              .financial-card .label { 
                font-size: 11px; 
                color: #7f8c8d; 
                text-transform: uppercase;
                font-weight: bold;
                letter-spacing: 0.2px;
                margin-bottom: 8px;
              }
              .financial-card .value { 
                font-size: 18px; 
                color: #2c3e50; 
                font-weight: bold;
              }
              .progress-section {
                margin-top: 18px;
                padding-top: 15px;
              }
              .progress-label {
                font-size: 12px;
                color: #2c3e50;
                font-weight: bold;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
              }
              .progress-bar {
                width: 100%;
                height: 16px;
                background-color: #ecf0f1;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
              }
              .progress-fill {
                height: 100%;
                background: linear-gradient(to right, #27ae60 0%, #2ecc71 100%);
                border-radius: 8px;
              }
              .footer { 
                text-align: center; 
                color: #95a5a6; 
                font-size: 10px; 
                margin-top: 25px; 
                padding-top: 10px;
              }
              .footer p { margin: 2px 0; line-height: 1.3; }
            </style>
          </head>
          <body>
            <div class="container">
              <!-- Header -->
              <div class="header">
                <h1>REPORTE DE VENTA</h1>
                <p class="subtitle">Consulta de Estado de Compra</p>
                <p class="date">Fecha de Generación: ${formatDate(new Date())}</p>
              </div>

              <!-- Información del Cliente -->
              <div class="section">
                <div class="sidebar"></div>
                <div class="section-content">
                  <div class="section-title">INFORMACIÓN DEL CLIENTE</div>
                  <div class="section-body">
                    <div class="info-row">
                      <div class="info-item">
                        <div class="info-label">Nombre Completo</div>
                        <div class="info-value">${clientData.names} ${clientData.surnames}</div>
                      </div>
                      <div class="info-item">
                        <div class="info-label">Número de Documento</div>
                        <div class="info-value">${clientData.document}</div>
                      </div>
                    </div>
                    <div class="info-row">
                      <div class="info-item">
                        <div class="info-label">Teléfono</div>
                        <div class="info-value">${clientData.phone || "No registrado"}</div>
                      </div>
                      <div class="info-item">
                        <div class="info-label">Email</div>
                        <div class="info-value">${clientData.email || "No registrado"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Información de la Venta -->
              <div class="section">
                <div class="sidebar"></div>
                <div class="section-content">
                  <div class="section-title">INFORMACIÓN DE LA VENTA</div>
                  <div class="section-body">
                    <div class="info-row">
                      <div class="info-item">
                        <div class="info-label">Proyecto</div>
                        <div class="info-value">${saleData.lot?.project?.name || "No disponible"}</div>
                      </div>
                      <div class="info-item">
                        <div class="info-label">Lote</div>
                        <div class="info-value">${saleData.lot?.block || "N/A"}-${saleData.lot?.lot_number || "N/A"}</div>
                      </div>
                    </div>
                    <div class="info-row">
                      <div class="info-item">
                        <div class="info-label">Estado de la Venta</div>
                        <div class="info-value">${saleData.status || "No disponible"}</div>
                      </div>
                      <div class="info-item">
                        <div class="info-label">Número de Cuotas</div>
                        <div class="info-value">${numQuotas} cuotas</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Resumen Financiero -->
              <div class="section">
                <div class="sidebar"></div>
                <div class="section-content">
                  <div class="section-title">RESUMEN FINANCIERO</div>
                  <div class="section-body">
                    <div class="financial-row">
                      <div class="financial-card">
                        <div class="label">Valor Total</div>
                        <div class="value">${formatCurrency(saleData.total_value)}</div>
                      </div>
                      <div class="financial-card">
                        <div class="label">Total Pagado</div>
                        <div class="value">${formatCurrency(saleData.total_raised)}</div>
                      </div>
                      <div class="financial-card">
                        <div class="label">Saldo Pendiente</div>
                        <div class="value">${formatCurrency(saleData.total_debt)}</div>
                      </div>
                      <div class="financial-card">
                        <div class="label">Valor Cuota</div>
                        <div class="value">${formatCurrency(quotaValue)}</div>
                      </div>
                    </div>
                    
                    <div class="progress-section">
                      <div class="progress-label">
                        <span>Progreso de Pago</span>
                        <span>${((saleData.total_raised / saleData.total_value) * 100).toFixed(1)}%</span>
                      </div>
                      <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(((saleData.total_raised / saleData.total_value) * 100), 100)}%;"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Plan de Cuotas -->
              <div class="section">
                <div class="sidebar"></div>
                <div class="section-content">
                  <div class="section-title">PLAN DE PAGOS - DETALLE DE CUOTAS</div>
                  <div class="section-body">
                    ${quotasTableHTML}
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="footer">
                <p>Reporte generado el ${formatDate(new Date())}. Para consultas contacte al equipo de atención al cliente.</p>
              </div>
            </div>
          </body>
        </html>
      `

      // Generar nombre del archivo
      const sanitizedClientName = `${clientData.names} ${clientData.surnames}`.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
      const fileName = `Reporte_Venta_${sanitizedClientName}_${new Date().getTime()}.pdf`

      console.log("[SaleReport] Sending to API with filename:", fileName)

      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html: reportHTML,
          filename: fileName,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error generating PDF: ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log("[SaleReport] PDF generated and downloaded successfully")
    } catch (error) {
      console.error("[SaleReport] Error:", error)
      throw error
    }
  }

  /**
   * Genera el PDF del contrato según el tipo de venta (lote o casa) usando Puppeteer
   * @param {number|string} saleId - ID de la venta
   * @param {object} saleData - Datos de la venta (puede ser plano o con estructura completa)
   * @param {object} temporaryData - Datos del modal (tipoContrato, proyecto, dirección, ciudad, etc.)
   */
  async generateContractPDF(saleId, saleData, temporaryData) {
    try {
      console.log("[v0] generateContractPDF called with:")
      console.log("[v0] saleId:", saleId)
      console.log("[v0] saleData:", saleData)
      console.log("[v0] temporaryData:", temporaryData)

      if (!saleData) {
        throw new Error("Datos de la venta no están disponibles")
      }

      const templateType = this.selectTemplate(temporaryData.proyecto, temporaryData.tipoContrato)
      console.log("[v0] Using template type:", templateType)

      const processedHTML = await this.loadAndProcessTemplate(templateType, saleData, temporaryData)
      console.log("[v0] HTML processed, sending to API")

      // Generar nombre del archivo con el nombre del cliente
      const firstName = saleData.client?.names || saleData.client?.name || ''
      const lastName = saleData.client?.surnames || saleData.client?.surname || ''
      const fullName = `${firstName} ${lastName}`.trim()
      const clientName = fullName || temporaryData.cliente || 'Cliente'

      // Limpiar el nombre del cliente (eliminar caracteres especiales)
      const sanitizedClientName = clientName.trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
      const fileName = `Contrato_${sanitizedClientName}.pdf`

      console.log("[v0] Generated filename:", fileName)

      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html: processedHTML,
          filename: fileName,
        }),
      })

      console.log("[v0] API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] API error response:", errorText)
        throw new Error(`Error generating PDF: ${response.statusText} - ${errorText}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log("[v0] PDF generated and downloaded successfully")
    } catch (error) {
      console.error("[v0] Error al generar el PDF:", error)
      throw error
    }
  }

  /**
   * Updated template selection method to match actual template filenames
   * Selects the appropriate template based on project and contract type
   * @param {string} proyecto - Project name (malibu, reservas-del-poblado, luxury-malibu)
   * @param {string} tipoContrato - Contract type (lote, casa)
   * @returns {string} Template filename
   */
  selectTemplate(proyecto, tipoContrato) {
    console.log("[v0] Selecting template for proyecto:", proyecto, "tipoContrato:", tipoContrato)

    // Normalize project name
    const normalizedProject = proyecto?.toLowerCase().replace(/\s+/g, "-") || "malibu"
    const normalizedType = tipoContrato?.toLowerCase() || "lote"

    // Template selection logic based on project and type
    switch (normalizedProject) {
      case "malibu":
        // Malibu has both lote and casa templates
        return normalizedType === "casa" ? "malibu-casa" : "malibu-lote"

      case "reservas-del-poblado":
        // Reservas del Poblado has both lote and casa templates
        return normalizedType === "casa" ? "reservas-casa" : "reservas-lote"

      case "luxury-malibu":
        // Luxury Malibu only has lote template
        return "luxury-lote"

      default:
        // Default fallback to malibu lote
        console.warn("[v0] Unknown project, using default malibu-lote template")
        return "malibu-lote"
    }
  }

  /**
   * Carga y procesa la plantilla HTML con los datos de la venta
   */
  async loadAndProcessTemplate(templateType, saleData, temporaryData) {
    try {
      console.log("[v0] Loading template:", templateType)

      let templatePath = `/templates/contratos/${templateType}.html`
      let response = await fetch(templatePath)

      if (!response.ok) {
        console.warn("[v0] Template not found:", templatePath, "- falling back to generic lote template")
        templatePath = `/templates/contratos/lote.html`
        response = await fetch(templatePath)

        if (!response.ok) {
          throw new Error(`No se pudo cargar la plantilla: ${templatePath}`)
        }
      }

      let htmlContent = await response.text()
      console.log("[v0] Template loaded successfully")

      const calculateDeliveryDate = () => {
        if (!saleData.plan?.number_quotas || !saleData.sale_date) {
          return "N/A"
        }

        // ✅ CORRECCIÓN: Si hay cuotas personalizadas, usar la fecha de la última cuota
        if (saleData.customQuotas && saleData.customQuotas.length > 0) {
          // Encontrar la cuota con el número más alto (última cuota)
          const lastCustomQuota = saleData.customQuotas.reduce((max, quota) => {
            const quotaNum = quota.quotaNumber || quota.QuotaNumber || 0
            const maxNum = max.quotaNumber || max.QuotaNumber || 0
            return quotaNum > maxNum ? quota : max
          })

          const lastDueDate = lastCustomQuota.dueDate || lastCustomQuota.DueDate
          if (lastDueDate) {
            // Parsear manualmente para evitar problemas de UTC
            const [year, month, day] = lastDueDate.split('-').map(Number)
            const localDate = new Date(year, month - 1, day)
            console.log(`[PDF] Using custom last quota date: ${lastDueDate} -> ${localDate.toLocaleDateString("es-CO")}`)
            return localDate.toLocaleDateString("es-CO", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          }
        }

        // ✅ Si no hay cuotas personalizadas, calcular automáticamente
        const saleDate = new Date(saleData.sale_date)
        const lastQuotaDate = new Date(saleDate)
        const targetMonth = saleDate.getMonth() + saleData.plan.number_quotas
        const targetDay = saleDate.getDate()

        // Establecer el mes primero
        lastQuotaDate.setMonth(targetMonth)

        // Ajustar al último día del mes si el día original no existe en el mes de destino
        const maxDayInMonth = new Date(lastQuotaDate.getFullYear(), lastQuotaDate.getMonth() + 1, 0).getDate()
        lastQuotaDate.setDate(Math.min(targetDay, maxDayInMonth))

        return lastQuotaDate.toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      }

      const valor50Porciento = (saleData.total_value || 0) * 0.5

      const fechaSeparacion = saleData.sale_date
        ? new Date(saleData.sale_date).toLocaleDateString("es-CO", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
        : "N/A"

      const parseBlockAndLot = (lotData) => {
        if (!lotData) return { manzana: "N/A", lote: "N/A" }

        // If lot has block and lot_number properties
        if (lotData.block && lotData.lot_number) {
          return {
            manzana: `Manzana ${lotData.block}`,
            lote: `Lote ${lotData.lot_number}`,
          }
        }

        // If it's a string format like "1-1"
        if (typeof lotData === "string" && lotData.includes("-")) {
          const [block, lotNum] = lotData.split("-")

          return {
            manzana: `Manzana ${block}`,
            lote: `Lote ${lotNum}`,
          }
        }

        return { manzana: "N/A", lote: "N/A" }
      }

      const { manzana, lote } = parseBlockAndLot(saleData.lot)

      const getAreaValue = (lotData) => {
        if (!lotData) return "N/A"

        let area = lotData.lot_area || lotData.area || "N/A"

        // If area is a string like "120 m²", extract just the number
        if (typeof area === "string") {
          area = area.replace(/\s*m²?\s*/gi, "").trim()
        }

        return area
      }

      const areaLote = getAreaValue(saleData.lot)

      const replacements = {
        // Cliente data - converted to uppercase
        CLIENTE_NOMBRE_COMPLETO: (
          `${saleData.client?.names || ""} ${saleData.client?.surnames || ""}`.trim() || "N/A"
        ).toUpperCase(),
        CLIENTE_CC_NUM: (saleData.client?.document || "N/A").toString().toUpperCase(),
        CLIENTE_CC_EXPEDIDA_EN: (temporaryData.lugarExpedicion || "N/A").toUpperCase(),
        CLIENTE_TELEFONO: (saleData.client?.phone || "N/A").toString().toUpperCase(),
        CLIENTE_EMAIL: (saleData.client?.email || "N/A").toUpperCase(),
        CLIENTE_DIRECCION: (temporaryData.direccion || "N/A").toUpperCase(),
        CLIENTE_CIUDAD: (temporaryData.ciudad || "N/A").toUpperCase(),

        // Segundo comprador (opcional)
        SEGUNDO_COMPRADOR: temporaryData.tieneSegundoComprador ? true : false,
        SEGUNDO_COMPRADOR_NOMBRE: temporaryData.tieneSegundoComprador ?
          (temporaryData.segundoCompradorNombre || "N/A").toUpperCase() : "",
        SEGUNDO_COMPRADOR_CEDULA: temporaryData.tieneSegundoComprador ?
          (temporaryData.segundoCompradorCedula || "N/A").toUpperCase() : "",

        // Consecutivo del contrato
        CONSECUTIVO: temporaryData.consecutivo ? temporaryData.consecutivo.toUpperCase() : "",

        PROYECTO: (temporaryData.proyecto || "N/A").replace(/-/g, ' ').toUpperCase(),
        LOTE: lote.toUpperCase(),
        MANZANA: manzana.toUpperCase(),
        LOCATION: (saleData.lot?.location || "N/A").toUpperCase(),
        AREA_LOTE: areaLote.toString().toUpperCase(),
        AREA_LOTE_LETRAS: this.numeroALetrasSinMoneda(areaLote),
        AREA_CONSTRUIDA: (temporaryData.areaConstruida || saleData.lot?.built_area || "N/A").toString().toUpperCase(),
        AREA_CONSTRUIDA_LETRAS: this.numeroALetrasSinMoneda(temporaryData.areaConstruida || saleData.lot?.built_area || 0),

        // Precios y valores - already uppercase from numeroALetras function
        PRECIO_LETRAS: numeroALetras(saleData.total_value || 0),
        PRECIO: new Intl.NumberFormat("es-CO", {
          minimumFractionDigits: 0,
        }).format(saleData.total_value || 0).replace(/[.,]/g, '.'),

        VALOR_TOTAL_LETRAS: numeroALetras(saleData.total_value || 0),
        VALOR_TOTAL_NUM: new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format(saleData.total_value || 0),

        SEPARACION_LETRAS: numeroALetras(saleData.initial_payment || 0),
        SEPARACION_NUM: new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format(saleData.initial_payment || 0),
        SEPARACION: new Intl.NumberFormat("es-CO", {
          minimumFractionDigits: 0,
        }).format(saleData.initial_payment || 0).replace(/[.,]/g, '.'),

        VALOR_50_PORCIENTO_LETRAS: numeroALetras(valor50Porciento),
        VALOR_50_PORCIENTO_NUM: new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format(valor50Porciento),

        // Saldos para casas (30% y 70%)
        SALDO_30_LETRAS: numeroALetras((saleData.total_value || 0) * 0.30),
        SALDO_30: new Intl.NumberFormat("es-CO", {
          minimumFractionDigits: 0,
        }).format((saleData.total_value || 0) * 0.30).replace(/[.,]/g, '.'),

        SALDO_70_LETRAS: numeroALetras((saleData.total_value || 0) * 0.70),
        SALDO_70: new Intl.NumberFormat("es-CO", {
          minimumFractionDigits: 0,
        }).format((saleData.total_value || 0) * 0.70).replace(/[.,]/g, '.'),

        NUM_CUOTAS: (saleData.plan?.number_quotas || 0).toString(),
        VALOR_CUOTA_LETRAS: numeroALetras(saleData.quota_value || 0),
        VALOR_CUOTA_NUM: new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format(saleData.quota_value || 0),

        // Arras calculation (10% of total value)
        ARRAS_LETRAS: numeroALetras((saleData.total_value || 0) * 0.1),
        ARRAS_NUM: new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format((saleData.total_value || 0) * 0.1),
        ARRAS: new Intl.NumberFormat("es-CO", {
          minimumFractionDigits: 0,
        }).format((saleData.total_value || 0) * 0.1).replace(/[.,]/g, '.'),

        FECHA_ENTREGA: calculateDeliveryDate().toUpperCase(),

        FECHA_SEPARACION: fechaSeparacion.toUpperCase(),

        FECHA_CONTRATO_LARGA: new Date()
          .toLocaleDateString("es-CO", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
          .toUpperCase(),
        CIUDAD_FIRMA: (temporaryData.ciudad || "N/A").toUpperCase(),

        // Fechas de firma individuales
        FECHA_FIRMA_DIA: new Date().getDate().toString(),
        FECHA_FIRMA_MES: new Date().toLocaleDateString("es-CO", { month: "long" }).toUpperCase(),
        FECHA_FIRMA_ANO: new Date().getFullYear().toString(),

        // Número de cuotas
        CUOTAS: (saleData.quotes || 0).toString(),

        // Plan de pagos
        PLAN_PAGOS_HTML: buildPlanPagosHTML(saleData),
      }

      console.log("[v0] Applying replacements:", Object.keys(replacements))

      // Process conditional blocks first (Mustache-style)
      const processConditionals = (html, data) => {
        // Process {{#SEGUNDO_COMPRADOR}} blocks
        const conditionalRegex = /{{#(\w+)}}([\s\S]*?){{\/\1}}/g
        const negativeConditionalRegex = /{{[\^](\w+)}}([\s\S]*?){{\/\1}}/g

        // Handle positive conditionals ({{#VAR}}...{{/VAR}})
        html = html.replace(conditionalRegex, (match, varName, content) => {
          const value = data[varName]
          return value ? content : ''
        })

        // Handle negative conditionals ({{^VAR}}...{{/VAR}})
        html = html.replace(negativeConditionalRegex, (match, varName, content) => {
          const value = data[varName]
          return !value ? content : ''
        })

        return html
      }

      // Apply conditional processing
      htmlContent = processConditionals(htmlContent, replacements)

      // Replace all placeholders
      Object.entries(replacements).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, "g")
        htmlContent = htmlContent.replace(regex, value || "N/A")
      })

      // Agregar comentario con consecutivo para el header del PDF
      const consecutivo = temporaryData.consecutivo || ""
      console.log("[v0] Consecutivo from temporaryData:", consecutivo);
      console.log("[v0] Full temporaryData:", JSON.stringify(temporaryData, null, 2));
      if (consecutivo) {
        htmlContent = `<!--CONSECUTIVO:${consecutivo}-->\n${htmlContent}`
        console.log("[v0] Added consecutivo comment to HTML");
        console.log("[v0] HTML with comment starts with:", htmlContent.substring(0, 100));
      } else {
        console.log("[v0] No consecutivo provided in temporaryData");
      }

      console.log("[v0] Template processed successfully")
      return htmlContent
    } catch (error) {
      console.error("[v0] Error loading template:", error)
      throw error
    }
  }
}

const salesPdfService = new SalesPDFService()
export default salesPdfService
export { buildPlanPagosHTML }
