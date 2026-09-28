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
  const [fromQuota, setFromQuota] = useState(null) // ← NUEVO: Cuota inicial del rango
  const [toQuota, setToQuota] = useState(null) // ← NUEVO: Cuota final del rango
  const [isProcessing, setIsProcessing] = useState(false)

  const safeOverdueQuotas = Array.isArray(overdueQuotas) ? overdueQuotas : []
  const safeRemainingQuotas = Array.isArray(remainingQuotas) ? remainingQuotas : []
  const safeTotalOverdueAmount = totalOverdueAmount || 0
  const overdueQuotaNumbers = safeOverdueQuotas.map((q) => q.quotaNumber)

  // Inicializar rango por defecto (últimas 5 cuotas)
  if (selectedOption === "custom" && (fromQuota === null || toQuota === null) && safeRemainingQuotas.length > 0) {
    const lastQuotaNum = safeRemainingQuotas[safeRemainingQuotas.length - 1].quotaNumber
    const firstOfLast5 = safeRemainingQuotas.length >= 5 
      ? safeRemainingQuotas[safeRemainingQuotas.length - 5].quotaNumber 
      : safeRemainingQuotas[0].quotaNumber
    if (fromQuota === null) setFromQuota(firstOfLast5)
    if (toQuota === null) setToQuota(lastQuotaNum)
  }

  // Calcular redistribución a última cuota
  const lastQuotaDistribution =
    safeRemainingQuotas.length > 0 ? safeRemainingQuotas[safeRemainingQuotas.length - 1] : null

  // ← NUEVO: Calcular redistribución por rango de cuotas
  const quotasInRange = safeRemainingQuotas.filter(
    (q) => q.quotaNumber >= fromQuota && q.quotaNumber <= toQuota
  )
  const rangeCount = quotasInRange.length
  const customDistribution = rangeCount > 0 ? safeTotalOverdueAmount / rangeCount : 0

  const handleRedistribute = async () => {
    if (!selectedOption) return

    setIsProcessing(true)
    try {
      // ← NUEVO: Enviar rango (fromQuota, toQuota) en lugar de customNumQuotas
      const options = {
        type: selectedOption,
        fromQuota: selectedOption === "custom" ? fromQuota : undefined,
        toQuota: selectedOption === "custom" ? toQuota : undefined,
      }
      await onRedistribute(options)
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
          {/* Resumen de cuotas vencidas - Mejorado */}
          <Card className="border-2 border-red-200 dark:border-red-900/50 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Resumen de Acuerdo de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-900">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Cuotas Vencidas</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">{safeOverdueQuotas.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-900">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Monto Total</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">{formatCurrency(safeTotalOverdueAmount)}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-100 dark:border-red-900/50">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Cuotas Impactadas:</p>
                <div className="flex flex-wrap gap-2">
                  {safeOverdueQuotas.map((quota) => (
                    <Badge key={quota.quotaNumber} className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800">
                      Cuota #{quota.quotaNumber}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Opciones de redistribución - Solo 2 opciones */}
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Selecciona una opción:</p>
            
            {/* OPCIÓN 1: Última Cuota */}
            <Card
              className={`cursor-pointer transition-all border-2 ${
                selectedOption === "lastQuota"
                  ? "border-pink-500 dark:border-pink-400 bg-gradient-to-br from-pink-50 to-pink-100/50 dark:from-pink-900/30 dark:to-pink-800/20 shadow-lg"
                  : "border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-600 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg"
              }`}
              onClick={() => setSelectedOption("lastQuota")}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex items-center h-6 mt-1">
                    <input
                      type="radio"
                      name="redistribution"
                      value="lastQuota"
                      checked={selectedOption === "lastQuota"}
                      onChange={() => setSelectedOption("lastQuota")}
                      className="w-5 h-5 text-pink-600 dark:text-pink-400 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">💰 Agregar a Última Cuota</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                      Las cuotas restantes mantienen su valor original. Todo el dinero vencido ({formatCurrency(safeTotalOverdueAmount)}) se agrega únicamente a la <span className="font-semibold">última cuota</span>.
                    </p>

                    {lastQuotaDistribution && (
                      <div className="mt-4 bg-white dark:bg-gray-900 p-4 rounded-lg border-2 border-pink-200 dark:border-pink-800">
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">📊 Vista Previa:</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {/* Mostrar primeras 2 cuotas */}
                          {safeRemainingQuotas.slice(0, 2).map((quota) => (
                            <div key={quota.quotaNumber} className="flex justify-between text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                              <span className="text-gray-700 dark:text-gray-300 font-medium">Cuota #{quota.quotaNumber}</span>
                              <span className="text-gray-600 dark:text-gray-400 font-semibold">{formatCurrency(quota.expectedAmount)}</span>
                            </div>
                          ))}
                          
                          {/* Si hay más de 2 cuotas, mostrar puntos suspensivos */}
                          {safeRemainingQuotas.length > 3 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2 font-medium">
                              ⋯ {safeRemainingQuotas.length - 3} cuotas más (sin cambios)
                            </div>
                          )}

                          {/* Mostrar SIEMPRE la última cuota (que recibe todo el dinero) */}
                          <div className="flex justify-between text-sm bg-gradient-to-r from-pink-100 to-pink-50 dark:from-pink-900/40 dark:to-pink-800/20 p-3 rounded-lg border-2 border-pink-300 dark:border-pink-700 font-bold">
                            <span className="text-gray-800 dark:text-gray-200">
                              Cuota #{lastQuotaDistribution.quotaNumber}
                              <span className="ml-2 text-xs bg-pink-200 dark:bg-pink-700 text-pink-800 dark:text-pink-200 px-2 py-1 rounded-full font-semibold">⭐ ÚLTIMA</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 line-through text-xs">
                                {formatCurrency(lastQuotaDistribution.expectedAmount)}
                              </span>
                              <ArrowRight className="h-4 w-4 text-green-600" />
                              <span className="text-green-600">
                                {formatCurrency(lastQuotaDistribution.expectedAmount + safeTotalOverdueAmount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* OPCIÓN 2: Personalizado */}
            <Card
              className={`cursor-pointer transition-all border-2 ${
                selectedOption === "custom"
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-purple-300"
              }`}
              onClick={() => setSelectedOption("custom")}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex items-center h-6">
                    <input
                      type="radio"
                      name="redistribution"
                      value="custom"
                      checked={selectedOption === "custom"}
                      onChange={() => setSelectedOption("custom")}
                      className="w-4 h-4 text-purple-600 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Distribuir en Rango de Cuotas</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Elige el rango de cuotas (DE cuota X A cuota Y) para distribuir el monto vencido.
                    </p>

                    {/* Inputs para elegir rango de cuotas */}
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">
                            Desde Cuota
                          </label>
                          <select
                            value={fromQuota || ""}
                            onChange={(e) => {
                              const val = parseInt(e.target.value)
                              setFromQuota(val)
                              setSelectedOption("custom")
                              // Auto-ajustar toQuota si es menor
                              if (toQuota && val > toQuota) setToQuota(val)
                            }}
                            onClick={() => setSelectedOption("custom")}
                            className="w-full px-4 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          >
                            <option value="">Seleccionar</option>
                            {safeRemainingQuotas.map((quota) => (
                              <option key={quota.quotaNumber} value={quota.quotaNumber}>
                                Cuota #{quota.quotaNumber}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">
                            Hasta Cuota
                          </label>
                          <select
                            value={toQuota || ""}
                            onChange={(e) => {
                              const val = parseInt(e.target.value)
                              setToQuota(val)
                              setSelectedOption("custom")
                              // Auto-ajustar fromQuota si es mayor
                              if (fromQuota && val < fromQuota) setFromQuota(val)
                            }}
                            onClick={() => setSelectedOption("custom")}
                            className="w-full px-4 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          >
                            <option value="">Seleccionar</option>
                            {safeRemainingQuotas.map((quota) => (
                              <option key={quota.quotaNumber} value={quota.quotaNumber}>
                                Cuota #{quota.quotaNumber}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Validación */}
                      {fromQuota && toQuota && (
                        <>
                          {quotasInRange.some((q) => overdueQuotaNumbers.includes(q.quotaNumber)) && (
                            <div className="bg-red-50 border border-red-200 rounded p-3">
                              <p className="text-xs text-red-600 font-medium">
                                ⚠️ El rango incluye cuotas vencidas. Las cuotas vencidas no pueden recibir dinero redistribuido.
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {fromQuota && toQuota && quotasInRange.length > 0 && !quotasInRange.some((q) => overdueQuotaNumbers.includes(q.quotaNumber)) && (
                        <div className="bg-white p-4 rounded border border-purple-100">
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div>
                              <p className="text-xs text-gray-600">Monto a Distribuir</p>
                              <p className="font-semibold text-purple-600">{formatCurrency(safeTotalOverdueAmount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Cuotas en Rango</p>
                              <p className="font-semibold text-purple-600">{rangeCount}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Por Cada Cuota</p>
                              <p className="font-semibold text-purple-600">{formatCurrency(customDistribution)}</p>
                            </div>
                          </div>

                          {quotasInRange.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-600 mb-2">
                                Cuotas #{fromQuota} al #{toQuota}:
                              </p>
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {quotasInRange.map((quota) => (
                                  <div key={quota.quotaNumber} className="flex justify-between text-xs bg-purple-50 p-2 rounded">
                                    <span className="text-gray-700">Cuota #{quota.quotaNumber}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-600">{formatCurrency(quota.expectedAmount)}</span>
                                      <ArrowRight className="h-3 w-3 text-purple-600" />
                                      <span className="font-semibold text-purple-600">
                                        {formatCurrency(quota.expectedAmount + customDistribution)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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