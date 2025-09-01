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
      const dueDate = new Date(saleDate.getFullYear(), saleDate.getMonth() + i, saleDate.getDate())
      const isOverdue = dueDate < currentDate

      const isRedistributed = redistributedQuotaNumbers.includes(i)

      // Get covered amount from aggregated data
      const coveredInfo = aggregatedQuotas.get(i)
      const totalPaid = coveredInfo?.covered || 0

      if (isOverdue && totalPaid < quotaValue && !isRedistributed) {
        const remainingAmount = quotaValue - totalPaid
        overdueQuotas.push({
          quotaNumber: i,
          remainingAmount: remainingAmount,
          expectedAmount: quotaValue,
          dueDate: dueDate,
        })
        totalOverdueAmount += remainingAmount
      } else if (!isOverdue && !isRedistributed && totalPaid < quotaValue) {
        remainingQuotas.push({
          quotaNumber: i,
          expectedAmount: quotaValue,
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
