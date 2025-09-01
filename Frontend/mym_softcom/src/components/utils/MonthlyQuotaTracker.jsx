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

  // 🔹 Copia local de props
  const [localSale, setLocalSale] = useState(sale)
  const [localPaymentDetails, setLocalPaymentDetails] = useState(paymentDetails)

  useEffect(() => {
    if (sale && paymentDetails) {
      console.log("[v0] Quota data updated - refreshing display")
      console.log("[v0] Sale data received:", {
        quota_value: sale.quota_value,
        originalQuotaValue: sale.originalQuotaValue,
        newQuotaValue: sale.newQuotaValue,
        NewQuotaValue: sale.NewQuotaValue,
        redistributedQuotaNumbers: sale.redistributedQuotaNumbers,
      })
      setLocalSale(sale)
      setLocalPaymentDetails(paymentDetails)
    }
  }, [sale, paymentDetails])

  if (!localSale || !localSale.plan) {
    return <p className="text-center text-gray-500">No hay información de venta o plan disponible para las cuotas.</p>
  }

  const totalQuotas = localSale.plan.number_quotas || 0
  const quotaValue = localSale.quota_value || 0
  const originalQuotaValue = localSale.originalQuotaValue || localSale.OriginalQuotaValue || quotaValue
  const newQuotaValue = localSale.newQuotaValue || localSale.NewQuotaValue || null

  console.log("[v0] DEBUGGING QUOTA VALUES:")
  console.log("[v0] - quotaValue (from DB):", quotaValue)
  console.log("[v0] - originalQuotaValue (calculated):", originalQuotaValue)
  console.log("[v0] - newQuotaValue (calculated):", newQuotaValue)
  console.log("[v0] - redistributedQuotaNumbers:", JSON.stringify(localSale.redistributedQuotaNumbers))

  const redistributionAmount = localSale.redistributionAmount || 0
  const redistributionType = localSale.redistributionType || null
  const redistributedQuotaNumbers = localSale.redistributedQuotaNumbers
    ? JSON.parse(localSale.redistributedQuotaNumbers)
    : []

  const saleDate = new Date(localSale.sale_date)
  const currentDate = new Date()

  const aggregatedQuotas = new Map()

  localPaymentDetails.forEach((detail) => {
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

    const adjustedQuotaValue = isOverdueRedistributed
      ? originalQuotaValue
      : redistributedQuotaNumbers.length > 0 && newQuotaValue !== null
        ? newQuotaValue
        : originalQuotaValue

    console.log(`[v0] Quota ${i} FINAL VALUES:`, {
      adjustedQuotaValue,
      isOverdueRedistributed,
      redistributedQuotaNumbers,
      newQuotaValue,
      originalQuotaValue,
    })

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
      isRedistributed: isOverdueRedistributed, // Add flag for redistributed status
    })

    console.log(`[v0] QUOTA ${i} PUSHED TO ARRAY:`, {
      quotaNumber: i,
      expectedAmount: adjustedQuotaValue,
      status: status,
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

      const response = await fetch(`http://localhost:5216/api/Sale/${localSale.id_Sales}/redistribute-quotas`, {
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

      // 🔹 Actualiza el estado local directamente con la respuesta
      if (responseData.sale) setLocalSale(responseData.sale)
      if (responseData.paymentDetails) setLocalPaymentDetails(responseData.paymentDetails)

      setTimeout(() => {
        console.log("[v0] Redistribution completed successfully")
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
