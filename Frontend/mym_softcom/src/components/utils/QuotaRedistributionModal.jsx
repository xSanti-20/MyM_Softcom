"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Calculator, ArrowRight, Loader2 } from "lucide-react"

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
  overdueQuotas = [],
  remainingQuotas = [],
  totalOverdueAmount = 0,
  onRedistribute,
}) {
  const [redistributionType, setRedistributionType] = useState("lastQuota") // "lastQuota" o "distribute"
  const [numQuotasToDistribute, setNumQuotasToDistribute] = useState("")
  const [amountPerQuota, setAmountPerQuota] = useState("")
  const [startDate, setStartDate] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const safeOverdueQuotas = Array.isArray(overdueQuotas) ? overdueQuotas : []
  const safeRemainingQuotas = Array.isArray(remainingQuotas) ? remainingQuotas : []
  const safeTotalOverdueAmount = totalOverdueAmount || 0

  // Auto-calcular monto por cuota cuando cambia el número de cuotas
  useMemo(() => {
    if (numQuotasToDistribute && numQuotasToDistribute > 0) {
      const calculated = safeTotalOverdueAmount / numQuotasToDistribute
      setAmountPerQuota(Math.round(calculated))
    }
  }, [numQuotasToDistribute, safeTotalOverdueAmount])

  // Validaciones según tipo
  const isValidLastQuota = true // No necesita validaciones
  const isValidDistribute =
    numQuotasToDistribute > 0 &&
    amountPerQuota > 0 &&
    startDate &&
    numQuotasToDistribute <= safeRemainingQuotas.length &&
    safeRemainingQuotas.length > 0

  const isValid = redistributionType === "lastQuota" ? isValidLastQuota : isValidDistribute

  // Preview de cuotas a actualizar
  const quotasPreview = safeRemainingQuotas.slice(0, parseInt(numQuotasToDistribute) || 0)

  const handleRedistribute = async () => {
    if (!isValid) return

    setIsProcessing(true)
    try {
      if (redistributionType === "lastQuota") {
        // Opción 1: Todo a última cuota
        const options = {
          type: "lastQuota",
          numQuotasToDistribute: 1, // Solo la última cuota
          amountPerQuota: safeTotalOverdueAmount,
          startDate: new Date().toISOString().split("T")[0],
        }
        await onRedistribute(options)
      } else {
        // Opción 2: Distribuir en múltiples cuotas
        const options = {
          type: "custom",
          numQuotasToDistribute: parseInt(numQuotasToDistribute),
          amountPerQuota: parseFloat(amountPerQuota),
          startDate: startDate,
        }
        await onRedistribute(options)
      }
      onClose()
      // Limpiar formulario
      setNumQuotasToDistribute("")
      setAmountPerQuota("")
      setStartDate("")
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Redistribuir Cuotas Vencidas
          </DialogTitle>
          <DialogDescription>
            Define cómo distribuir las {safeOverdueQuotas.length} cuotas vencidas por un total de{" "}
            {formatCurrency(safeTotalOverdueAmount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumen de cuotas vencidas */}
          <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Cuotas en Mora
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-red-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase">Total Vencidas</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">{safeOverdueQuotas.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-red-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase">Monto Total</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(safeTotalOverdueAmount)}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-red-100">
                <p className="text-xs font-bold text-gray-700 uppercase mb-3">Cuotas Impactadas:</p>
                <div className="flex flex-wrap gap-2">
                  {safeOverdueQuotas.map((quota) => (
                    <Badge key={quota.quotaNumber} className="bg-red-100 text-red-800 border border-red-300">
                      Cuota #{quota.quotaNumber}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* OPCIÓN 1: Toda a Última Cuota */}
          <Card
            className={`cursor-pointer transition-all border-2 ${
              redistributionType === "lastQuota"
                ? "border-pink-500 bg-gradient-to-br from-pink-50 to-pink-100/50 shadow-lg"
                : "border-gray-200 hover:border-pink-300 bg-white hover:shadow-md"
            }`}
            onClick={() => setRedistributionType("lastQuota")}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <input
                  type="radio"
                  name="redistribution"
                  value="lastQuota"
                  checked={redistributionType === "lastQuota"}
                  onChange={() => setRedistributionType("lastQuota")}
                  className="w-5 h-5 text-pink-600 cursor-pointer mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">💰 Agregar Todo a Última Cuota</h3>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                    Todo el dinero vencido (<span className="font-semibold">{formatCurrency(safeTotalOverdueAmount)}</span>) se agrega únicamente a la última cuota de la venta. Las cuotas restantes mantienen su valor original.
                  </p>
                  {redistributionType === "lastQuota" && (
                    <div className="mt-4 bg-pink-50 p-4 rounded-lg border-2 border-pink-200">
                      <p className="text-sm font-semibold text-gray-700 mb-3">📊 Vista Previa:</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center bg-white p-3 rounded border border-pink-200">
                          <span className="font-medium text-gray-700">Última Cuota</span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-600">{formatCurrency(safeRemainingQuotas[safeRemainingQuotas.length - 1]?.expectedAmount || 0)}</span>
                            <ArrowRight className="h-4 w-4 text-green-600" />
                            <span className="font-bold text-green-600">
                              {formatCurrency((safeRemainingQuotas[safeRemainingQuotas.length - 1]?.expectedAmount || 0) + safeTotalOverdueAmount)}
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

          {/* OPCIÓN 2: Distribuir en Múltiples Cuotas */}
          <Card
            className={`cursor-pointer transition-all border-2 ${
              redistributionType === "distribute"
                ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-lg"
                : "border-gray-200 hover:border-blue-300 bg-white hover:shadow-md"
            }`}
            onClick={() => setRedistributionType("distribute")}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <input
                  type="radio"
                  name="redistribution"
                  value="distribute"
                  checked={redistributionType === "distribute"}
                  onChange={() => setRedistributionType("distribute")}
                  className="w-5 h-5 text-blue-600 cursor-pointer mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">📊 Distribuir en Múltiples Cuotas</h3>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                    Distribuye el dinero vencido entre varias cuotas no vencidas. Define cuántas cuotas y cuánto agregar a cada una.
                  </p>

                  {redistributionType === "distribute" && (
                    <div className="mt-4 space-y-4 bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                      {/* Número de cuotas */}
                      <div className="space-y-2">
                        <Label htmlFor="numQuotas" className="text-sm font-semibold">
                          ¿En cuántas cuotas distribuir?
                          <span className="text-red-600 ml-1">*</span>
                        </Label>
                        <Input
                          id="numQuotas"
                          type="number"
                          min="1"
                          max={safeRemainingQuotas.length}
                          value={numQuotasToDistribute}
                          onChange={(e) => setNumQuotasToDistribute(e.target.value)}
                          placeholder={`Máximo ${safeRemainingQuotas.length}`}
                          className="border-2 border-blue-300 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-600">
                          Disponibles: {safeRemainingQuotas.length} cuotas no vencidas
                        </p>
                      </div>

                      {/* Monto por cuota */}
                      <div className="space-y-2">
                        <Label htmlFor="amountPerQuota" className="text-sm font-semibold">
                          Monto a agregar a cada cuota
                          <span className="text-red-600 ml-1">*</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="amountPerQuota"
                            type="number"
                            value={amountPerQuota}
                            onChange={(e) => setAmountPerQuota(e.target.value)}
                            placeholder="Auto-calculado"
                            className="border-2 border-blue-300 focus:border-blue-500 flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (numQuotasToDistribute && numQuotasToDistribute > 0) {
                                const calculated = safeTotalOverdueAmount / numQuotasToDistribute
                                setAmountPerQuota(Math.round(calculated))
                              }
                            }}
                            className="whitespace-nowrap"
                          >
                            Auto
                          </Button>
                        </div>
                        {amountPerQuota && numQuotasToDistribute && (
                          <p className="text-xs text-green-600 font-medium">
                            ✓ {numQuotasToDistribute} × {formatCurrency(amountPerQuota)} = {formatCurrency(amountPerQuota * numQuotasToDistribute)}
                          </p>
                        )}
                      </div>

                      {/* Fecha de inicio */}
                      <div className="space-y-2">
                        <Label htmlFor="startDate" className="text-sm font-semibold">
                          Fecha de inicio
                          <span className="text-red-600 ml-1">*</span>
                        </Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="border-2 border-blue-300 focus:border-blue-500"
                        />
                      </div>

                      {/* Preview */}
                      {numQuotasToDistribute > 0 && amountPerQuota > 0 && (
                        <div className="mt-4 bg-white p-3 rounded border-2 border-green-200">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Vista Previa:</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {quotasPreview.map((quota) => (
                              <div key={quota.quotaNumber} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                                <span>Cuota #{quota.quotaNumber}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600">{formatCurrency(quota.expectedAmount)}</span>
                                  <ArrowRight className="h-3 w-3 text-green-600" />
                                  <span className="font-bold text-green-600">
                                    {formatCurrency((quota.expectedAmount || 0) + parseFloat(amountPerQuota))}
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
            </CardContent>
          </Card>

          {/* Botones de acción */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleRedistribute}
              disabled={!isValid || isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Redistribuir Cuotas"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}