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

  // Validaciones
  const isValid =
    numQuotasToDistribute > 0 &&
    amountPerQuota > 0 &&
    startDate &&
    numQuotasToDistribute <= safeRemainingQuotas.length &&
    safeRemainingQuotas.length > 0

  // Preview de cuotas a actualizar
  const quotasPreview = safeRemainingQuotas.slice(0, parseInt(numQuotasToDistribute) || 0)

  const handleRedistribute = async () => {
    if (!isValid) return

    setIsProcessing(true)
    try {
      const options = {
        type: "custom",
        numQuotasToDistribute: parseInt(numQuotasToDistribute),
        amountPerQuota: parseFloat(amountPerQuota),
        startDate: startDate,
      }
      await onRedistribute(options)
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

          {/* Formulario de configuración */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardHeader>
              <CardTitle className="text-base text-blue-700">
                📋 Configurar Distribución
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Número de cuotas */}
              <div className="space-y-2">
                <Label htmlFor="numQuotas" className="text-sm font-semibold">
                  ¿En cuántas cuotas distribuir el total vencido?
                  <span className="text-red-600 ml-1">*</span>
                </Label>
                <Input
                  id="numQuotas"
                  type="number"
                  min="1"
                  max={safeRemainingQuotas.length}
                  value={numQuotasToDistribute}
                  onChange={(e) => setNumQuotasToDistribute(e.target.value)}
                  placeholder={`Máximo ${safeRemainingQuotas.length} cuotas disponibles`}
                  className="border-2 border-blue-300 focus:border-blue-500"
                />
                <p className="text-xs text-gray-600">
                  Tienes {safeRemainingQuotas.length} cuotas no vencidas disponibles
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
                    onClick={() => {
                      if (numQuotasToDistribute && numQuotasToDistribute > 0) {
                        const calculated = safeTotalOverdueAmount / numQuotasToDistribute
                        setAmountPerQuota(Math.round(calculated))
                      }
                    }}
                    className="whitespace-nowrap"
                  >
                    Auto-calcular
                  </Button>
                </div>
                {amountPerQuota && numQuotasToDistribute && (
                  <p className="text-xs text-green-600 font-medium">
                    ✓ {numQuotasToDistribute} cuotas × {formatCurrency(amountPerQuota)} = {formatCurrency(amountPerQuota * numQuotasToDistribute)}
                  </p>
                )}
              </div>

              {/* Fecha de inicio */}
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-sm font-semibold">
                  Fecha de inicio de la distribución
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
            </CardContent>
          </Card>

          {/* Preview de cuotas */}
          {numQuotasToDistribute > 0 && amountPerQuota > 0 && (
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100/50">
              <CardHeader>
                <CardTitle className="text-base text-green-700">
                  📊 Vista Previa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {quotasPreview.map((quota) => (
                    <div
                      key={quota.quotaNumber}
                      className="flex justify-between items-center bg-white p-3 rounded border border-green-200"
                    >
                      <span className="font-medium text-gray-700">Cuota #{quota.quotaNumber}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600">{formatCurrency(quota.expectedAmount)}</span>
                        <ArrowRight className="h-4 w-4 text-green-600" />
                        <span className="font-bold text-green-600">
                          {formatCurrency((quota.expectedAmount || 0) + parseFloat(amountPerQuota))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
