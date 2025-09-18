"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"
import { useState, useEffect } from "react"
import QuotaRedistributionModal from "./QuotaRedistributionModal"
import { Button } from "@/components/ui/button"

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

export default function MonthlyQuotaTracker({ sale, paymentDetails }) {
  const [showRedistributionModal, setShowRedistributionModal] = useState(false)

  useEffect(() => {
    if (sale && paymentDetails) {
      console.log("[v0] Quota data updated - refreshing display")
    }
  }, [sale, paymentDetails])

  if (!sale || !sale.plan) {
    return <p className="text-center text-gray-500">No hay información de venta o plan disponible para las cuotas.</p>
  }

  const totalQuotas = sale.plan.number_quotas || 0
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
  const redistributedQuotaNumbers = sale.redistributedQuotaNumbers ? JSON.parse(sale.redistributedQuotaNumbers) : []

  const saleDate = new Date(sale.sale_date)
  const currentDate = new Date()

  const aggregatedQuotas = new Map()

  paymentDetails.forEach((detail) => {
    if (detail.number_quota > 0) {
      const current = aggregatedQuotas.get(detail.number_quota) || { covered: 0, paymentDates: [] }
      current.covered += detail.covered_amount || 0
      if (detail.payment?.payment_date) {
        current.paymentDates.push(new Date(detail.payment.payment_date))
      }
      aggregatedQuotas.set(detail.number_quota, current)
    }
  })

  const quotas = []
  let totalOverdueAmount = 0
  let overdueQuotasCount = 0

  for (let i = 1; i <= totalQuotas; i++) {
    const coveredInfo = aggregatedQuotas.get(i)
    const coveredAmount = coveredInfo?.covered || 0

    const dueDate = new Date(saleDate)
    dueDate.setMonth(saleDate.getMonth() + i)
    dueDate.setDate(saleDate.getDate())

    const isOverdueRedistributed = redistributedQuotaNumbers.includes(i)

    let adjustedQuotaValue

    if (customQuotas && customQuotas.length > 0) {
      // Use custom quota values for personalized plans
      const customQuota = customQuotas.find((q) => q.QuotaNumber === i)
      if (customQuota) {
        adjustedQuotaValue = customQuota.Amount
      } else {
        adjustedQuotaValue = quotaValue
      }
    } else if (isOverdueRedistributed) {
      adjustedQuotaValue = originalQuotaValue
    } else if (redistributedQuotaNumbers.length > 0 && newQuotaValue !== null) {
      const pendingQuotas = []
      for (let j = 1; j <= totalQuotas; j++) {
        if (!redistributedQuotaNumbers.includes(j)) {
          pendingQuotas.push(j)
        }
      }
      const isLastPendingQuota = i === Math.max(...pendingQuotas)

      if (redistributionType === "lastQuota" && isLastPendingQuota && lastQuotaValue !== null) {
        adjustedQuotaValue = lastQuotaValue
      } else {
        adjustedQuotaValue = newQuotaValue
      }
    } else {
      adjustedQuotaValue = quotaValue
    }

    let status = "Pendiente"
    let statusColor = "bg-gray-100 text-gray-800"
    let statusIcon = <Clock className="h-4 w-4" />
    let isOverdue = false

    if (isOverdueRedistributed) {
      status = "Distribuida"
      statusColor = "bg-purple-100 text-purple-800"
      statusIcon = <CheckCircle className="h-4 w-4" />
    } else if (coveredAmount >= adjustedQuotaValue) {
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

    if (isOverdue && !isOverdueRedistributed) {
      const overdueAmount = adjustedQuotaValue - coveredAmount
      totalOverdueAmount += overdueAmount
      overdueQuotasCount++
    }

    const daysOverdue =
      isOverdue && !isOverdueRedistributed ? Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24)) : 0

    quotas.push({
      quotaNumber: i,
      expectedAmount: adjustedQuotaValue,
      coveredAmount: coveredAmount,
      remainingAmount: Math.max(0, adjustedQuotaValue - coveredAmount),
      dueDate: dueDate,
      status: status,
      statusColor: statusColor,
      statusIcon: statusIcon,
      isOverdue: isOverdue && !isOverdueRedistributed,
      daysOverdue: daysOverdue,
      isRedistributed: isOverdueRedistributed,
    })
  }

  const overdueQuotas = quotas.filter(
    (q) => q.isOverdue && q.remainingAmount > 0 && !redistributedQuotaNumbers.includes(q.quotaNumber),
  )
  const remainingQuotas = quotas.filter(
    (q) => !redistributedQuotaNumbers.includes(q.quotaNumber) && q.status === "Pendiente",
  )

  const handleRedistribute = async (option) => {
    try {
      const requestData = {
        redistributionType: option,
        overdueQuotas: overdueQuotas.map((q) => ({
          quotaNumber: q.quotaNumber,
          remainingAmount: q.remainingAmount,
        })),
      }

      console.log("[v0] Sending redistribution request:", requestData)

      const response = await fetch(`http://localhost:5216/api/Sale/${sale.id_Sales}/redistribute-quotas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error("Error al redistribuir cuotas")
      }

      setShowRedistributionModal(false)

      setTimeout(() => {
        console.log("[v0] Redistribution completed successfully")
        window.dispatchEvent(
          new CustomEvent("quotaRedistributionComplete", {
            detail: { sale: responseData.sale, paymentDetails: responseData.paymentDetails },
          }),
        )
      }, 100)
    } catch (error) {
      console.error("Error:", error)
      alert("Error al redistribuir las cuotas. Por favor intenta nuevamente.")
    }
  }

  return (
    <>
      <Card>
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
            {overdueQuotas.length > 0 && remainingQuotas.length > 0 && (
              <Button onClick={() => setShowRedistributionModal(true)} className="bg-blue-600 hover:bg-blue-700">
                Redistribuir Cuotas
              </Button>
            )}
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
                      className={`hover:bg-gray-50 ${quota.isOverdue ? "bg-red-50" : ""} ${quota.isRedistributed ? "bg-purple-50" : ""}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {quota.quotaNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{formatDate(quota.dueDate)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {formatCurrency(quota.expectedAmount)}
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

      <QuotaRedistributionModal
        isOpen={showRedistributionModal}
        onClose={() => setShowRedistributionModal(false)}
        overdueQuotas={overdueQuotas}
        remainingQuotas={remainingQuotas}
        totalOverdueAmount={totalOverdueAmount}
        onRedistribute={handleRedistribute}
      />
    </>
  )
}
