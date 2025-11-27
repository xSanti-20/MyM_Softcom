"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import QuotaRedistributionModal from "./QuotaRedistributionModal"
import axiosInstance from "@/lib/axiosInstance"

export default function QuotaRedistributionButton({ saleId, paymentDetails = [], sale, onRedistributionComplete }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const calculateOverdueQuotas = () => {
    if (!sale?.plan?.number_quotas || !sale?.sale_date)
      return { overdueQuotas: [], remainingQuotas: [], totalOverdueAmount: 0 }

    const currentDate = new Date()
    const saleDate = new Date(sale.sale_date)
    const totalQuotas = sale.plan.number_quotas
    const quotaValue = sale.quota_value || 0

    // 🔧 Obtener cuotas personalizadas si existen
    let customQuotas = null
    const paymentPlanType = sale.paymentPlanType || sale.PaymentPlanType
    const customQuotasJson = sale.customQuotasJson || sale.CustomQuotasJson
    
    if (paymentPlanType?.toLowerCase() === "custom" && customQuotasJson) {
      try {
        customQuotas = JSON.parse(customQuotasJson)
        console.log('[QuotaRedistributionButton] Plan personalizado detectado con', customQuotas?.length, 'cuotas')
      } catch (error) {
        console.error("Error parsing custom quotas JSON:", error)
      }
    }

    const redistributedQuotaNumbers = sale.redistributedQuotaNumbers ? JSON.parse(sale.redistributedQuotaNumbers) : []

    const overdueQuotas = []
    const remainingQuotas = []
    let totalOverdueAmount = 0

    const aggregatedQuotas = new Map()
    paymentDetails.forEach((detail) => {
      if (detail.number_quota > 0) {
        const current = aggregatedQuotas.get(detail.number_quota) || { covered: 0 }
        current.covered += detail.covered_amount || 0
        aggregatedQuotas.set(detail.number_quota, current)
      }
    })

    for (let i = 1; i <= totalQuotas; i++) {
      // 🔧 Calcular fecha de vencimiento (usar fecha personalizada si existe)
      let dueDate
      if (customQuotas && customQuotas.length > 0) {
        const customQuota = customQuotas.find((q) => q.QuotaNumber === i)
        if (customQuota && customQuota.DueDate) {
          // ✅ Usar fecha personalizada SIN problemas de zona horaria
          const [year, month, day] = customQuota.DueDate.split('-').map(Number)
          dueDate = new Date(year, month - 1, day) // month - 1 porque enero = 0
        } else {
          // Fallback a cálculo automático
          dueDate = new Date(saleDate.getFullYear(), saleDate.getMonth() + i, saleDate.getDate())
        }
      } else {
        // Cálculo automático para planes no personalizados
        dueDate = new Date(saleDate.getFullYear(), saleDate.getMonth() + i, saleDate.getDate())
      }
      
      const isOverdue = dueDate < currentDate

      const isRedistributed = redistributedQuotaNumbers.includes(i)

      // 🔧 Obtener el valor correcto de la cuota (personalizado o estándar)
      let adjustedQuotaValue
      if (customQuotas && customQuotas.length > 0) {
        const customQuota = customQuotas.find((q) => q.QuotaNumber === i)
        adjustedQuotaValue = customQuota ? customQuota.Amount : quotaValue
      } else {
        adjustedQuotaValue = quotaValue
      }

      // Get covered amount from aggregated data
      const coveredInfo = aggregatedQuotas.get(i)
      const totalPaid = coveredInfo?.covered || 0

      // ✅ Comparar con el valor correcto de la cuota
      if (isOverdue && totalPaid < adjustedQuotaValue && !isRedistributed) {
        const remainingAmount = adjustedQuotaValue - totalPaid
        overdueQuotas.push({
          quotaNumber: i,
          remainingAmount: remainingAmount,
          expectedAmount: adjustedQuotaValue,
          dueDate: dueDate,
        })
        totalOverdueAmount += remainingAmount
      } else if (!isOverdue && !isRedistributed && totalPaid < adjustedQuotaValue) {
        remainingQuotas.push({
          quotaNumber: i,
          expectedAmount: adjustedQuotaValue,
          dueDate: dueDate,
        })
      }
    }

    return { overdueQuotas, remainingQuotas, totalOverdueAmount }
  }

  const { overdueQuotas, remainingQuotas, totalOverdueAmount } = calculateOverdueQuotas()

  const handleRedistribute = async (redistributionType) => {
    setIsProcessing(true)
    try {
      const requestData = {
        redistributionType: redistributionType,
        overdueQuotas: overdueQuotas.map((q) => ({
          quotaNumber: q.quotaNumber,
          remainingAmount: q.remainingAmount,
        })),
      }

      await axiosInstance.post(`/api/Sale/${saleId}/redistribute-quotas`, requestData)

      if (onRedistributionComplete) {
        await onRedistributionComplete()
      }

      setIsModalOpen(false)
    } catch (error) {
      console.error("Error al redistribuir cuotas:", error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  if (overdueQuotas.length === 0) {
    return null // No mostrar el botón si no hay cuotas vencidas
  }

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="outline"
        className="flex items-center gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
      >
        <AlertTriangle className="h-4 w-4" />
        Redistribuir Cuotas Vencidas ({overdueQuotas.length})
      </Button>

      <QuotaRedistributionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        overdueQuotas={overdueQuotas}
        remainingQuotas={remainingQuotas}
        totalOverdueAmount={totalOverdueAmount}
        onRedistribute={handleRedistribute}
      />
    </>
  )
}
