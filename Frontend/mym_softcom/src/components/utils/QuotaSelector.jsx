"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"
import { Label } from "@/components/ui/label"

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
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
  } catch {
    return "N/A"
  }
}

// ← NUEVO: Tolerancia para redondeos (si falta menos de esto, considera como pagada)
const ROUNDING_TOLERANCE = 1000 // $1,000 COP

// ← NUEVO: Helper para verificar si una cuota está pagada considerando redondeo
const isQuotaPaid = (coveredAmount, expectedAmount) => {
  return coveredAmount >= expectedAmount - ROUNDING_TOLERANCE
}

export default function QuotaSelector({ sale, paymentDetails, paymentAmount, onQuotasSelected }) {
  const [quotas, setQuotas] = useState([])
  const [selectedQuotas, setSelectedQuotas] = useState(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (sale && paymentDetails) {
      loadQuotas()
    }
  }, [sale, paymentDetails])

  const loadQuotas = () => {
    setLoading(true)
    try {
      const totalQuotas = sale.plan?.number_quotas || 0
      const quotaValue = sale.quota_value || 0
      const saleDate = new Date(sale.sale_date)
      const currentDate = new Date()

      // Agrupar pagos por cuota
      const aggregatedQuotas = new Map()
      const uniquePayments = new Map()

      paymentDetails.forEach((detail) => {
        if (detail.payment?.id_Payments) {
          const paymentId = detail.payment.id_Payments
          if (!uniquePayments.has(paymentId)) {
            uniquePayments.set(paymentId, {
              amount: detail.payment.amount || 0,
              date: detail.payment.payment_date,
            })
          }
        }
        
        if (detail.number_quota > 0) {
          const current = aggregatedQuotas.get(detail.number_quota) || { covered: 0 }
          current.covered += detail.covered_amount || 0
          aggregatedQuotas.set(detail.number_quota, current)
        }
      })

      const quotasArray = []
      for (let i = 1; i <= totalQuotas; i++) {
        const coveredAmount = aggregatedQuotas.get(i)?.covered || 0
        
        // Calcular fecha de vencimiento
        let dueDate = new Date(saleDate)
        dueDate.setMonth(dueDate.getMonth() + i)
        const maxDayInMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate()
        dueDate.setDate(Math.min(saleDate.getDate(), maxDayInMonth))

        // Determinar estado
        let status = "Pendiente"
        let statusColor = "bg-gray-100 text-gray-800"
        let statusIcon = <Clock className="h-4 w-4" />
        let isOverdue = false

        if (isQuotaPaid(coveredAmount, quotaValue)) {
          status = "Pagada"
          statusColor = "bg-green-100 text-green-800"
          statusIcon = <CheckCircle className="h-4 w-4" />
        } else if (coveredAmount > 0) {
          if (dueDate < currentDate) {
            status = "Vencida (Abonada)"
            statusColor = "bg-red-100 text-red-800"
            statusIcon = <AlertTriangle className="h-4 w-4" />
            isOverdue = true
          } else {
            status = "Abonada"
            statusColor = "bg-yellow-100 text-yellow-800"
            statusIcon = <Clock className="h-4 w-4" />
          }
        } else if (dueDate < currentDate) {
          status = "Vencida"
          statusColor = "bg-red-100 text-red-800"
          statusIcon = <XCircle className="h-4 w-4" />
          isOverdue = true
        }

        const pendingAmount = quotaValue - coveredAmount

        quotasArray.push({
          quotaNumber: i,
          dueDate,
          expectedAmount: quotaValue,
          coveredAmount,
          pendingAmount: Math.max(0, pendingAmount),
          status,
          statusColor,
          statusIcon,
          isOverdue,
          isPaid: isQuotaPaid(coveredAmount, quotaValue),
        })
      }

      setQuotas(quotasArray)

      // Sugerir automáticamente cuotas vencidas
      const overdueQuotas = quotasArray
        .filter((q) => q.isOverdue && !q.isPaid)
        .map((q) => q.quotaNumber)

      if (overdueQuotas.length > 0 && paymentAmount > 0) {
        setSelectedQuotas(new Set(overdueQuotas.slice(0, 1))) // Seleccionar la primera vencida
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleQuota = (quotaNumber) => {
    const newSelected = new Set(selectedQuotas)
    if (newSelected.has(quotaNumber)) {
      newSelected.delete(quotaNumber)
    } else {
      newSelected.add(quotaNumber)
    }
    setSelectedQuotas(newSelected)
    onQuotasSelected?.(Array.from(newSelected))
  }

  const totalPending = Array.from(selectedQuotas)
    .reduce((sum, quotaNum) => {
      const quota = quotas.find((q) => q.quotaNumber === quotaNum)
      return sum + (quota?.pendingAmount || 0)
    }, 0)

  const overdueQuotas = quotas.filter((q) => q.isOverdue && !q.isPaid)

  if (loading) {
    return <div className="text-center py-4">Cargando cuotas...</div>
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
        <CardTitle className="flex items-center gap-3 text-gray-800">
          <AlertCircle className="h-5 w-5 text-slate-600" />
          <span className="text-lg font-semibold">Seleccionar Cuota(s)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {overdueQuotas.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
            <p className="text-sm font-semibold text-red-800 mb-2">
              ⚠️ Hay {overdueQuotas.length} cuota(s) vencida(s) sin pagar
            </p>
            <p className="text-xs text-red-700">
              Se recomienda aplicar el pago a estas cuotas primero.
            </p>
          </div>
        )}

        <div className="max-h-96 overflow-y-auto space-y-2">
          {quotas.map((quota) => (
            <div
              key={quota.quotaNumber}
              className={`p-3 border rounded-lg transition-colors ${
                selectedQuotas.has(quota.quotaNumber)
                  ? "bg-blue-50 border-blue-300"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedQuotas.has(quota.quotaNumber)}
                  onCheckedChange={() => toggleQuota(quota.quotaNumber)}
                  disabled={quota.isPaid}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Label className="font-semibold text-gray-800 cursor-pointer">
                      Cuota #{quota.quotaNumber}
                    </Label>
                    <Badge className={`${quota.statusColor} font-semibold flex items-center gap-1`}>
                      {quota.statusIcon}
                      {quota.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Vencimiento: {formatDate(quota.dueDate)}</p>
                    <div className="flex justify-between">
                      <span>Monto esperado:</span>
                      <span className="font-semibold">{formatCurrency(quota.expectedAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pagado:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(quota.coveredAmount)}</span>
                    </div>
                    {!quota.isPaid && (
                      <div className="flex justify-between bg-red-50 p-2 rounded">
                        <span className="font-semibold text-red-700">Pendiente:</span>
                        <span className="font-semibold text-red-700">{formatCurrency(quota.pendingAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedQuotas.size > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-300 rounded-lg">
            <p className="text-sm font-semibold text-blue-800 mb-2">
              📊 Resumen de Selección
            </p>
            <div className="text-sm text-blue-700 space-y-1">
              <p>Cuotas seleccionadas: {selectedQuotas.size}</p>
              <p>Total pendiente en cuotas seleccionadas: {formatCurrency(totalPending)}</p>
              {paymentAmount > 0 && (
                <>
                  <p>Monto del pago: {formatCurrency(paymentAmount)}</p>
                  {paymentAmount > totalPending && (
                    <p className="text-orange-600 font-semibold">
                      ⚠️ El pago excede el total pendiente. Se aplicará el monto completo.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
