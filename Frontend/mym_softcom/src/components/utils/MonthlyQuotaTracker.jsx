"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import axiosInstance from "@/lib/axiosInstance"

// ← NUEVO: Componente para mostrar cuotas directo desde tabla BD
const QuotasTableView = ({ quotas, paymentDetails, currentDate }) => {
  console.log('[QuotasTableView] 📊 Renderizando', quotas.length, 'quotas de tabla')
  
  // Agrupar pagos por cuota
  const paymentsByQuota = {}
  paymentDetails.forEach((detail) => {
    const quotaNum = detail.number_quota
    if (quotaNum > 0) {
      if (!paymentsByQuota[quotaNum]) {
        paymentsByQuota[quotaNum] = 0
      }
      paymentsByQuota[quotaNum] += detail.covered_amount || 0
    }
  })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date)
    } catch (error) {
      return "N/A"
    }
  }

  let totalPaid = 0
  let totalPending = 0

  const quotaRows = quotas.map((quota) => {
    const paidAmount = paymentsByQuota[quota.quota_number] || 0
    const remainingAmount = quota.current_amount - paidAmount
    const dueDate = new Date(quota.due_date)
    const isOverdue = dueDate < currentDate

    totalPaid += paidAmount
    totalPending += Math.max(remainingAmount, 0)

    let status = "Pendiente"
    let statusColor = "bg-gray-100 text-gray-800"
    let statusIcon = "○"

    // ✅ LÓGICA CORRECTA DE ESTADO:
    if (remainingAmount <= 0) {
      // Pagada completamente
      status = "Pagada"
      statusColor = "bg-green-100 text-green-800"
      statusIcon = "✓"
    } else if (quota.status === "Distribuida") {
      // Cuota que cedió su dinero en redistribución
      status = "Distribuida"
      statusColor = "bg-purple-100 text-purple-800"
      statusIcon = "⟳"
    } else if (isOverdue && paidAmount > 0 && remainingAmount > 0) {
      // Vencida pero con abono parcial
      status = "Vencido Abonado"
      statusColor = "bg-orange-100 text-orange-800"
      statusIcon = "!"
    } else if (isOverdue && remainingAmount > 0) {
      // Vencida sin pagar
      status = "Vencido"
      statusColor = "bg-red-100 text-red-800"
      statusIcon = "!"
    } else if (!isOverdue && paidAmount > 0 && remainingAmount > 0) {
      // Abonado parcialmente pero dentro de fecha
      status = "Abonado"
      statusColor = "bg-blue-100 text-blue-800"
      statusIcon = "+"
    } else {
      // Pendiente (no pagado, dentro de fecha)
      status = "Pendiente"
      statusColor = "bg-yellow-100 text-yellow-800"
      statusIcon = "○"
    }

    const daysOverdue = isOverdue && remainingAmount > 0 
      ? Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24))
      : null

    console.log(`[QuotasTableView] Cuota ${quota.quota_number}: status_bd=${quota.status}, remaining=${remainingAmount}, paid=${paidAmount}, overdue=${isOverdue} → ${status}`)

    return {
      quotaNumber: quota.quota_number,
      dueDate: formatDate(quota.due_date),
      expectedAmount: formatCurrency(quota.amount),
      paidAmount: formatCurrency(paidAmount),
      remainingAmount: formatCurrency(Math.max(remainingAmount, 0)),
      status: status,
      statusColor,
      statusIcon,
      daysOverdue,
    }
  })

  return (
    <Card className="mt-6 overflow-hidden border-gray-200">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-600" />
            Cuotas Mensuales (Tabla)
          </CardTitle>
          <div className="text-sm text-gray-600">
            Total Pagado: <span className="font-semibold">{formatCurrency(totalPaid)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Cuota</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha Vencimiento</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Valor Esperado</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Abonado</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Saldo Pendiente</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Días Vencido</th>
              </tr>
            </thead>
            <tbody>
              {quotaRows.map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.quotaNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{row.dueDate}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{row.expectedAmount}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-semibold">{row.paidAmount}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-semibold">{row.remainingAmount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${row.statusColor}`}>
                      {row.statusIcon} {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row.daysOverdue ? <span className="text-red-600 font-semibold">{row.daysOverdue} días</span> : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date)
  } catch (error) {
    return "N/A"
  }
}

// ← NUEVO: Tolerancia para redondeos (si falta menos de esto, considera como pagada)
const ROUNDING_TOLERANCE = 1000 // $1,000 COP

// ← NUEVO: Helper para verificar si una cuota está pagada considerando redondeo
const isQuotaPaid = (coveredAmount, expectedAmount) => {
  const difference = expectedAmount - coveredAmount
  // Considerada pagada si: cubrió el monto completo O si falta menos de la tolerancia
  return coveredAmount >= expectedAmount - ROUNDING_TOLERANCE
}

export default function MonthlyQuotaTracker({ sale, paymentDetails, onRedistributionComplete }) {
  useEffect(() => {
    if (sale && paymentDetails) {
      console.log("[v0] Quota data updated - refreshing display")
    }
  }, [sale, paymentDetails])

  if (!sale || !sale.plan) {
    return <p className="text-center text-gray-500">No hay información de venta o plan disponible para las cuotas.</p>
  }

  // ✅ PREFERENCIA 1: Si tenemos quotas de la tabla (BD), usarlas directamente
  console.log('[MonthlyQuotaTracker] 🔍 Verificando quotas:', {
    hasQuotasTable: !!sale.quotas,
    quotasTableCount: sale.quotas?.length || 0,
  })
  
  if (sale.quotas && sale.quotas.length > 0) {
    console.log('[MonthlyQuotaTracker] ✅ Usando quotas de la tabla BD')
    return <QuotasTableView quotas={sale.quotas} paymentDetails={paymentDetails} currentDate={new Date()} />
  }

  // ✅ PREFERENCIA 2: Si no hay quotas tabla, usar lógica antigua (customQuotasJson o plan regular)
  const quotaValue = sale.quota_value || 0
  const originalQuotaValue = sale.originalQuotaValue || quotaValue
  const newQuotaValue = sale.newQuotaValue || sale.NewQuotaValue || null
  const lastQuotaValue = sale.lastQuotaValue || sale.LastQuotaValue || null

  let customQuotas = null
  // Priorizar los nombres de campo en minúsculas que espera el backend
  const paymentPlanType = sale.paymentPlanType || sale.PaymentPlanType
  const customQuotasJson = sale.customQuotasJson || sale.CustomQuotasJson
  
  if (paymentPlanType?.toLowerCase() === "custom" && customQuotasJson) {
    try {
      customQuotas = JSON.parse(customQuotasJson)
      console.log("[v0] Custom plan detected with", customQuotas?.length, "personalized quotas")
    } catch (error) {
      console.error("Error parsing custom quotas JSON:", error)
    }
  }

  const redistributionAmount = sale.redistributionAmount || 0
  const redistributionType = sale.redistributionType || null
  
  // ← NUEVO: Parsear JSON unificado {"received": [...], "overdue": [...]}
  let redistributedQuotaNumbers = []
  let overdueQuotaNumbers = []
  if (sale.redistributedQuotaNumbers) {
    try {
      const quotaData = JSON.parse(sale.redistributedQuotaNumbers)
      console.log("[REDISTRIBUTION] Raw JSON:", sale.redistributedQuotaNumbers)
      console.log("[REDISTRIBUTION] Parsed data:", quotaData)
      
      // Si tiene estructura new (con "received" y "overdue")
      if (quotaData.received || quotaData.overdue) {
        redistributedQuotaNumbers = quotaData.received || []
        overdueQuotaNumbers = quotaData.overdue || []
        console.log("[REDISTRIBUTION] Received quotas:", redistributedQuotaNumbers)
        console.log("[REDISTRIBUTION] Overdue quotas:", overdueQuotaNumbers)
      } else {
        // Fallback a estructura old (solo array)
        redistributedQuotaNumbers = Array.isArray(quotaData) ? quotaData : []
        console.log("[REDISTRIBUTION] Using fallback (old format):", redistributedQuotaNumbers)
      }
    } catch (error) {
      console.error("Error parsing redistributed quota numbers:", error)
    }
  }

  const saleDate = new Date(sale.sale_date)
  const currentDate = new Date()

  // 🔧 CORRECCIÓN: Agrupar pagos por cuota evitando duplicados
  // En lugar de sumar todos los covered_amount, debemos agrupar por pago único
  const aggregatedQuotas = new Map()
  
  // Primero, crear un mapa de pagos únicos por ID
  const uniquePayments = new Map()
  paymentDetails.forEach((detail) => {
    if (detail.payment?.id_Payments) {
      const paymentId = detail.payment.id_Payments
      if (!uniquePayments.has(paymentId)) {
        uniquePayments.set(paymentId, {
          amount: detail.payment.amount || 0,
          date: detail.payment.payment_date,
          details: []
        })
      }
      uniquePayments.get(paymentId).details.push(detail)
    }
  })

  console.log(`[QUOTA TRACKER] 📦 Total payment details: ${paymentDetails.length}`)
  console.log(`[QUOTA TRACKER] 💳 Unique payments: ${uniquePayments.size}`)

  // Ahora distribuir los montos de pagos únicos a las cuotas
  uniquePayments.forEach((payment, paymentId) => {
    // Obtener todos los detalles de este pago
    const detailsForPayment = payment.details
    
    console.log(`[QUOTA TRACKER] 💳 Pago ID ${paymentId}:`, {
      amount: payment.amount,
      detailsCount: detailsForPayment.length,
      details: detailsForPayment.map(d => ({
        quota: d.number_quota,
        covered_amount: d.covered_amount
      }))
    })
    
    // Verificar si hay inconsistencias
    const totalCovered = detailsForPayment.reduce((sum, d) => sum + (d.covered_amount || 0), 0)
    
    // 🔧 CORRECCIÓN CRÍTICA: Si el covered_amount total no coincide con el monto del pago,
    // distribuir el monto real del pago proporcionalmente
    let useCorrection = false
    if (Math.abs(totalCovered - payment.amount) > 0.01) {
      console.warn(`⚠️ [QUOTA TRACKER] INCONSISTENCIA DETECTADA en pago ${paymentId}:`, {
        paymentAmount: payment.amount,
        totalCoveredInDetails: totalCovered,
        difference: totalCovered - payment.amount,
        percentageDiff: ((totalCovered - payment.amount) / payment.amount * 100).toFixed(2) + '%'
      })
      useCorrection = true
    }
    
    // Si el pago tiene múltiples detalles (distribuido en varias cuotas)
    detailsForPayment.forEach((detail) => {
      if (detail.number_quota > 0) {
        const current = aggregatedQuotas.get(detail.number_quota) || { covered: 0, paymentDates: [] }
        
        // 🔧 Si hay inconsistencia, usar el monto real del pago distribuido proporcionalmente
        let amountToAdd
        if (useCorrection && totalCovered > 0) {
          // Distribuir el monto real del pago proporcionalmente
          const proportion = (detail.covered_amount || 0) / totalCovered
          amountToAdd = payment.amount * proportion
          console.log(`🔧 [QUOTA TRACKER] Corrigiendo cuota ${detail.number_quota}: ${detail.covered_amount} → ${amountToAdd}`)
        } else {
          // Usar el covered_amount tal cual
          amountToAdd = detail.covered_amount || 0
        }
        
        current.covered += amountToAdd
        if (payment.date && !current.paymentDates.some(d => d.getTime() === new Date(payment.date).getTime())) {
          current.paymentDates.push(new Date(payment.date))
        }
        aggregatedQuotas.set(detail.number_quota, current)
      }
    })
  })

  console.log('[QUOTA TRACKER] 📊 Resumen:', {
    uniquePayments: uniquePayments.size,
    totalPaymentAmount: Array.from(uniquePayments.values()).reduce((sum, p) => sum + p.amount, 0),
    aggregatedQuotas: Array.from(aggregatedQuotas.entries()).slice(0, 5).map(([quota, data]) => ({
      quota,
      covered: data.covered
    }))
  })

  const quotas = []
  let totalOverdueAmount = 0
  let overdueQuotasCount = 0

  for (let i = 1; i <= totalQuotas; i++) {
    const coveredInfo = aggregatedQuotas.get(i)
    const coveredAmount = coveredInfo?.covered || 0

    // 🔧 Calcular fecha de vencimiento (usar fecha personalizada si existe)
    let dueDate
    if (customQuotas && customQuotas.length > 0) {
      const customQuota = customQuotas.find((q) => q.QuotaNumber === i)
      if (customQuota && customQuota.DueDate) {
        // ✅ Usar fecha personalizada SIN problemas de zona horaria
        const [year, month, day] = customQuota.DueDate.split('-').map(Number)
        dueDate = new Date(year, month - 1, day) // month - 1 porque enero = 0
        console.log(`[QUOTA ${i}] Using custom date: ${customQuota.DueDate} -> ${dueDate.toLocaleDateString('es-CO')}`)
      } else {
        // Fallback a cálculo automático si no hay fecha personalizada
        console.log(`[QUOTA ${i}] No custom date found, using automatic calculation`)
        dueDate = new Date(saleDate)
        const targetMonth = saleDate.getMonth() + i
        const targetDay = saleDate.getDate()
        
        dueDate.setMonth(targetMonth)
        
        // Ajustar al último día del mes si el día original no existe en el mes de destino
        const maxDayInMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate()
        dueDate.setDate(Math.min(targetDay, maxDayInMonth))
      }
    } else {
      // Cálculo automático para planes no personalizados
      dueDate = new Date(saleDate)
      const targetMonth = saleDate.getMonth() + i
      const targetDay = saleDate.getDate()
      
      // Establecer el mes primero
      dueDate.setMonth(targetMonth)
      
      // Ajustar al último día del mes si el día original no existe en el mes de destino
      const maxDayInMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate()
      dueDate.setDate(Math.min(targetDay, maxDayInMonth))
    }

    // ← NUEVO: Detectar si esta cuota RECIBE la redistribución (está en el rango que recibe dinero)
    const isQuotaReceivingRedistribution = redistributedQuotaNumbers.includes(i)

    // Primero, calcular el valor BASE (original) de la cuota
    let baseQuotaValue = quotaValue

    if (customQuotas && customQuotas.length > 0) {
      const customQuota = customQuotas.find((q) => q.QuotaNumber === i)
      if (customQuota) {
        baseQuotaValue = customQuota.Amount
      }
    }

    // Detectar si fue una cuota vencida (está pagada completamente pero fue vencida antes)
    // Usar baseQuotaValue para este cálculo, no adjustedQuotaValue
    const isOverdueRedistributed = overdueQuotaNumbers.includes(i)

    // AHORA sí modificar adjustedQuotaValue para las que reciben dinero
    let adjustedQuotaValue = baseQuotaValue

    if (isQuotaReceivingRedistribution) {
      // ← NUEVO: Cuotas que RECIBEN el dinero vencido
      // - Si tiene CustomQuotasJson: ya está sumado por el backend
      // - Si es plan regular: debe sumar aquí en frontend
      if (customQuotas && customQuotas.length > 0) {
        // CustomQuotasJson ya fue actualizado por backend con valor sumado
        adjustedQuotaValue = baseQuotaValue  // Ya es el total
      } else {
        // Plan regular: suma en frontend
        adjustedQuotaValue = baseQuotaValue + (newQuotaValue || 0)
      }
    } else if (redistributionType === "lastQuota" && i === totalQuotas && lastQuotaValue !== null) {
      // Última cuota recibe TODO el dinero vencido
      adjustedQuotaValue = lastQuotaValue
    }

    let status = "Pendiente"
    let statusColor = "bg-gray-100 text-gray-800"
    let statusIcon = <Clock className="h-4 w-4" />
    let isOverdue = false

    // ← PRIMERO: Detectar si ESTA CUOTA FUE VENCIDA SIN PAGAR (cedió su dinero)
    // Si: está en overdueQuotaNumbers = FUE VENCIDA Y CEDIÓ
    const wasOverdueUnpaid = 
      isOverdueRedistributed &&
      coveredAmount < baseQuotaValue &&
      redistributionType && 
      !isQuotaReceivingRedistribution

    if (wasOverdueUnpaid) {
      // ← NUEVA: Solo cuotas VENCIDAS SIN PAGAR (cedieron dinero) - Muestra como DISTRIBUIDA
      status = "Distribuida"
      statusColor = "bg-purple-100 text-purple-800"
      statusIcon = <CheckCircle className="h-4 w-4" />
    } else if (isQuotaReceivingRedistribution) {
      // ← NUEVA: Cuota que RECIBE el dinero vencido - Muestra como PENDIENTE (sigue siendo pending)
      status = "Pendiente"
      statusColor = "bg-yellow-100 text-yellow-800"
      statusIcon = <Clock className="h-4 w-4" />
    } else if (isQuotaPaid(coveredAmount, adjustedQuotaValue)) {
      // ✅ Cuota pagada completamente (con tolerancia de redondeo) - NO importa si se pagó tarde
      status = "Pagada"
      statusColor = "bg-green-100 text-green-800"
      statusIcon = <CheckCircle className="h-4 w-4" />
      // NO marcar como vencida si ya está pagada completamente
      isOverdue = false
    } else if (coveredAmount > 0) {
      // Hay abono parcial - solo marcar como vencida si aún tiene saldo pendiente
      if (dueDate < currentDate) {
        status = "Vencida (Abonada)"
        statusColor = "bg-red-100 text-red-800"
        statusIcon = <AlertTriangle className="h-4 w-4" />
        isOverdue = true // ✅ Solo es mora si tiene saldo pendiente
      } else {
        status = "Abonada"
        statusColor = "bg-yellow-100 text-yellow-800"
        statusIcon = <Clock className="h-4 w-4" />
      }
    } else if (dueDate < currentDate) {
      // Sin ningún pago y ya venció
      status = "Vencida"
      statusColor = "bg-red-100 text-red-800"
      statusIcon = <XCircle className="h-4 w-4" />
      isOverdue = true
    }

    // ✅ Solo contar como vencida si tiene saldo pendiente
    if (isOverdue && !isOverdueRedistributed && coveredAmount < adjustedQuotaValue) {
      const overdueAmount = adjustedQuotaValue - coveredAmount
      totalOverdueAmount += overdueAmount
      overdueQuotasCount++
    }

    // ✅ Solo calcular días de atraso si tiene saldo pendiente Y está vencida
    const daysOverdue =
      isOverdue && !isOverdueRedistributed && coveredAmount < adjustedQuotaValue
        ? Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24))
        : 0

    quotas.push({
      quotaNumber: i,
      expectedAmount: adjustedQuotaValue,
      originalAmount: quotaValue, // ← NUEVO: Guardar el valor original
      coveredAmount: coveredAmount,
      // ← NUEVO: Si está pagada por tolerancia de redondeo, mostrar remainingAmount como $0
      remainingAmount: isQuotaPaid(coveredAmount, adjustedQuotaValue) ? 0 : Math.max(0, adjustedQuotaValue - coveredAmount),
      dueDate: dueDate,
      status: status,
      statusColor: statusColor,
      statusIcon: statusIcon,
      isOverdue: isOverdue && !isOverdueRedistributed && coveredAmount < adjustedQuotaValue, // ✅ Solo si tiene saldo pendiente
      daysOverdue: daysOverdue,
      isRedistributed: isOverdueRedistributed, // Cuota que fue vencida
      isReceivingRedistribution: isQuotaReceivingRedistribution, // ← NUEVO: Cuota que RECIBE dinero vencido
    })
  }

  const overdueQuotas = quotas.filter(
    (q) => q.isOverdue && q.remainingAmount > 0 && !redistributedQuotaNumbers.includes(q.quotaNumber),
  )
  const remainingQuotas = quotas.filter(
    (q) => !q.isReceivingRedistribution && !q.isRedistributed && q.status === "Pendiente",
  )

  // 🔍 DEBUG: Ver por qué aparece el botón de redistribución
  console.log('[REDISTRIBUCION] Estado:', {
    overdueQuotasCount: overdueQuotas.length,
    remainingQuotasCount: remainingQuotas.length,
    shouldShowButton: overdueQuotas.length > 0 && remainingQuotas.length > 0,
    overdueQuotas: overdueQuotas.map(q => ({
      cuota: q.quotaNumber,
      esperado: q.expectedAmount,
      cubierto: q.coveredAmount,
      restante: q.remainingAmount,
      isOverdue: q.isOverdue
    }))
  })

  
  return (
    <>
      <Card data-quota-tracker className="border-2 border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Control de Cuotas
                {overdueQuotasCount > 0 && (
                  <Badge className="bg-red-100 text-red-800 ml-2">{overdueQuotasCount} cuotas vencidas</Badge>
                )}
                {paymentPlanType && (
                  <Badge className="bg-blue-100 text-blue-800 ml-2">
                    {paymentPlanType === "custom"
                      ? "Plan Personalizado"
                      : paymentPlanType === "house"
                        ? "Plan Casa"
                        : "Plan Automático"}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Detalle mensual de pagos y estado de cada cuota.
                {totalOverdueAmount > 0 && (
                  <span className="block mt-1 text-red-600 font-medium">
                    Monto total en mora: {formatCurrency(totalOverdueAmount)}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {totalQuotas === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay cuotas definidas para esta venta en el plan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cuota #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Venc.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Cuota
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto Cubierto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo Cuota
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Días Atraso
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quotas.map((quota) => (
                    <tr
                      key={quota.quotaNumber}
                      className={`hover:bg-gray-50 ${quota.isOverdue ? "bg-red-50" : ""} ${quota.isRedistributed ? "bg-purple-50" : ""} ${quota.isReceivingRedistribution ? "bg-blue-50" : ""}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {quota.quotaNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{formatDate(quota.dueDate)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {quota.isReceivingRedistribution ? (
                          // ← NUEVO: Mostrar valor original y nuevo cuando recibe dinero vencido
                          <div className="space-y-1">
                            <div className="text-gray-400 line-through text-xs">
                              {formatCurrency(quota.originalAmount)}
                            </div>
                            <div className="font-bold text-blue-600">
                              {formatCurrency(quota.expectedAmount)}
                            </div>
                            <div className="text-xs text-blue-500">
                              +{formatCurrency(quota.expectedAmount - quota.originalAmount)}
                            </div>
                          </div>
                        ) : (
                          formatCurrency(quota.expectedAmount)
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {formatCurrency(quota.coveredAmount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        <span
                          className={
                            quota.remainingAmount > 0 && quota.isOverdue && !quota.isRedistributed
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {quota.isRedistributed ? formatCurrency(0) : formatCurrency(quota.remainingAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={`flex items-center justify-center gap-1 ${quota.statusColor}`}>
                          {quota.statusIcon}
                          {quota.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {quota.isOverdue && !quota.isRedistributed ? (
                          <span className="text-red-600 font-medium">{quota.daysOverdue} días</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
