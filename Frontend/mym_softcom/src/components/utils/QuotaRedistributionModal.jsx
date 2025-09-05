"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Calculator, ArrowRight } from "lucide-react"

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amount || 0)
}

export default function QuotaRedistributionModal({
  isOpen,
  onClose,
  overdueQuotas = [], // Added default empty array
  remainingQuotas = [], // Added default empty array
  totalOverdueAmount = 0, // Added default value
  onRedistribute,
}) {
  const [selectedOption, setSelectedOption] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const safeOverdueQuotas = Array.isArray(overdueQuotas) ? overdueQuotas : []
  const safeRemainingQuotas = Array.isArray(remainingQuotas) ? remainingQuotas : []
  const safeTotalOverdueAmount = totalOverdueAmount || 0

  // Calcular redistribución uniforme
  const uniformDistribution = safeRemainingQuotas.length > 0 ? safeTotalOverdueAmount / safeRemainingQuotas.length : 0

  // Calcular redistribución a última cuota
  const lastQuotaDistribution =
    safeRemainingQuotas.length > 0 ? safeRemainingQuotas[safeRemainingQuotas.length - 1] : null

  const handleRedistribute = async () => {
    if (!selectedOption) return

    setIsProcessing(true)
    try {
      await onRedistribute(selectedOption)
      onClose()
    } catch (error) {
      console.error("Error al redistribuir:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (safeOverdueQuotas.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sin Cuotas Vencidas</DialogTitle>
            <DialogDescription>No hay cuotas vencidas para redistribuir en este momento.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Redistribuir Cuotas Vencidas
          </DialogTitle>
          <DialogDescription>
            Selecciona cómo deseas redistribuir las {safeOverdueQuotas.length} cuotas vencidas por un total de{" "}
            {formatCurrency(safeTotalOverdueAmount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumen de cuotas vencidas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Cuotas Vencidas a Redistribuir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {safeOverdueQuotas.map((quota) => (
                  <div key={quota.quotaNumber} className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span className="text-sm font-medium">Cuota #{quota.quotaNumber}</span>
                    <Badge className="bg-red-100 text-red-800">{formatCurrency(quota.remainingAmount)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Opciones de redistribución */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opcion 1: Distribución uniforme */}
            <Card
              className={`cursor-pointer transition-all ${
                selectedOption === "uniform" ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
              }`}
              onClick={() => setSelectedOption("uniform")}
            >
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <input
                    type="radio"
                    checked={selectedOption === "uniform"}
                    onChange={() => setSelectedOption("uniform")}
                    className="text-blue-600"
                  />
                  Distribución Uniforme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Distribuir {formatCurrency(safeTotalOverdueAmount)} uniformemente entre las{" "}
                  {safeRemainingQuotas.length} cuotas restantes
                </p>

                <div className="bg-blue-100 p-3 rounded">
                  <p className="text-sm font-medium text-blue-800">+ {formatCurrency(uniformDistribution)} por cuota</p>
                </div>

                {/* Vista previa de algunas cuotas */}
                {safeRemainingQuotas.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500">Vista previa:</p>
                    {safeRemainingQuotas.slice(0, 3).map((quota) => (
                      <div key={quota.quotaNumber} className="flex justify-between text-xs bg-white p-2 rounded border">
                        <span>Cuota #{quota.quotaNumber}</span>
                        <div className="flex items-center gap-2">
                          <span>{formatCurrency(quota.expectedAmount)}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium text-blue-600">
                            {formatCurrency(quota.expectedAmount + uniformDistribution)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {safeRemainingQuotas.length > 3 && (
                      <p className="text-xs text-gray-500">... y {safeRemainingQuotas.length - 3} cuotas más</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Opción 2: Agregar a última cuota */}
            <Card
              className={`cursor-pointer transition-all ${
                selectedOption === "lastQuota" ? "ring-2 ring-green-500 bg-green-50" : "hover:bg-gray-50"
              }`}
              onClick={() => setSelectedOption("lastQuota")}
            >
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <input
                    type="radio"
                    checked={selectedOption === "lastQuota"}
                    onChange={() => setSelectedOption("lastQuota")}
                    className="text-green-600"
                  />
                  Agregar a Última Cuota
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Agregar todo el monto vencido ({formatCurrency(safeTotalOverdueAmount)}) a la última cuota
                </p>

                {lastQuotaDistribution && (
                  <>
                    <div className="bg-green-100 p-3 rounded">
                      <p className="text-sm font-medium text-green-800">
                        Cuota #{lastQuotaDistribution.quotaNumber} será:{" "}
                        {formatCurrency(lastQuotaDistribution.expectedAmount + safeTotalOverdueAmount)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">Vista previa:</p>
                      <div className="flex justify-between text-xs bg-white p-2 rounded border">
                        <span>Cuota #{lastQuotaDistribution.quotaNumber} (Última)</span>
                        <div className="flex items-center gap-2">
                          <span>{formatCurrency(lastQuotaDistribution.expectedAmount)}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium text-green-600">
                            {formatCurrency(lastQuotaDistribution.expectedAmount + safeTotalOverdueAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button onClick={handleRedistribute} disabled={!selectedOption || isProcessing} className="min-w-[120px]">
              {isProcessing ? "Procesando..." : "Redistribuir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}