"use client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle, XCircle, Clock } from "lucide-react"

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
  } catch (error) {
    return "N/A"
  }
}

export default function MonthlyQuotaTracker({ sale, paymentDetails }) {
  if (!sale || !sale.plan) {
    return <p className="text-center text-gray-500">No hay información de venta o plan disponible para las cuotas.</p>
  }

  const totalQuotas = sale.plan.number_quotas || 0
  const quotaValue = sale.quota_value || 0
  const saleDate = new Date(sale.sale_date)

  // Agrupar montos cubiertos y fechas de pago por número de cuota
  const aggregatedQuotas = new Map() // Map<number_quota, { covered: decimal, paymentDates: Date[] }>

  paymentDetails.forEach((detail) => {
    if (detail.number_quota > 0) {
      // Asumiendo que number_quota 1 es la primera cuota regular
      const current = aggregatedQuotas.get(detail.number_quota) || { covered: 0, paymentDates: [] }
      current.covered += detail.covered_amount || 0
      if (detail.payment?.payment_date) {
        current.paymentDates.push(new Date(detail.payment.payment_date))
      }
      aggregatedQuotas.set(detail.number_quota, current)
    }
  })

  const quotas = []
  for (let i = 1; i <= totalQuotas; i++) {
    const coveredInfo = aggregatedQuotas.get(i)
    const coveredAmount = coveredInfo?.covered || 0
    // const paymentDate = coveredInfo?.paymentDates.length > 0 ? coveredInfo.paymentDates[0] : null; // Podrías usar la primera o la última fecha de pago

    // Calcular fecha de vencimiento para cada cuota
    const dueDate = new Date(saleDate)
    dueDate.setMonth(saleDate.getMonth() + i) // Cuota 1 es 1 mes después de saleDate, Cuota 2 es 2 meses después, etc.
    dueDate.setDate(saleDate.getDate()) // Mantener el mismo día del mes

    let status = "Pendiente"
    let statusColor = "bg-gray-100 text-gray-800"
    let statusIcon = <Clock className="h-4 w-4" />

    if (coveredAmount >= quotaValue) {
      status = "Pagada"
      statusColor = "bg-green-100 text-green-800"
      statusIcon = <CheckCircle className="h-4 w-4" />
    } else if (coveredAmount > 0) {
      status = "Abonada"
      statusColor = "bg-yellow-100 text-yellow-800"
      statusIcon = <Clock className="h-4 w-4" /> // Sigue pendiente de pago completo
    } else if (dueDate < new Date()) {
      // Si no hay pago y la fecha de vencimiento ya pasó
      status = "Vencida"
      statusColor = "bg-red-100 text-red-800"
      statusIcon = <XCircle className="h-4 w-4" />
    }

    quotas.push({
      quotaNumber: i,
      expectedAmount: quotaValue,
      coveredAmount: coveredAmount,
      remainingAmount: Math.max(0, quotaValue - coveredAmount),
      dueDate: dueDate,
      status: status,
      statusColor: statusColor,
      statusIcon: statusIcon,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Control de Cuotas
        </CardTitle>
        <CardDescription>Detalle mensual de pagos y estado de cada cuota.</CardDescription>
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotas.map((quota) => (
                  <tr key={quota.quotaNumber} className="hover:bg-gray-50">
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
                      {formatCurrency(quota.remainingAmount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge className={`flex items-center justify-center gap-1 ${quota.statusColor}`}>
                        {quota.statusIcon}
                        {quota.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
