"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, AlertCircle, CheckCircle, Loader2, Clock, TrendingUp, Users, CreditCard } from "lucide-react"
import axiosInstance from "@/lib/axiosInstance"

export default function OverdueEmailsButton() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  const handleCheckSummary = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    console.log("[OverdueEmails] Obteniendo resumen de mora...")
    
    try {
      const response = await axiosInstance.get("/api/OverdueNotification/summary")
      console.log("[OverdueEmails] Resumen obtenido:", response.data)
      
      setSummary(response.data)
      setShowConfirm(true)
      
      if (response.data.totalClientsWithOverdue === 0) {
        setError({
          type: "info",
          message: "No hay clientes con mora en este momento. ¡Excelente! 🎉"
        })
      }
    } catch (err) {
      console.error("[OverdueEmails] Error al obtener resumen:", err)
      const errorMessage = err.response?.data?.message || err.message || "Error al obtener el resumen de mora"
      setError({
        type: "error",
        message: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmails = async () => {
    setLoading(true)
    setError(null)
    
    console.log("[OverdueEmails] Enviando correos de notificación...")
    
    try {
      const response = await axiosInstance.post("/api/OverdueNotification/process-all")
      console.log("[OverdueEmails] Correos enviados:", response.data)
      
      setResult(response.data)
      setShowConfirm(false)
      setSummary(null)
      
      // Cerrar el mensaje de éxito después de 10 segundos
      setTimeout(() => {
        setResult(null)
      }, 10000)
    } catch (err) {
      console.error("[OverdueEmails] Error al enviar correos:", err)
      const errorMessage = err.response?.data?.message || err.message || "Error al enviar los correos"
      setError({
        type: "error",
        message: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowConfirm(false)
    setSummary(null)
    setError(null)
  }

  const getSeverityColor = (range) => {
    if (range.includes("1-30")) return "bg-yellow-100 border-yellow-300 text-yellow-800"
    if (range.includes("31-60")) return "bg-orange-100 border-orange-300 text-orange-800"
    if (range.includes("61-90")) return "bg-red-100 border-red-300 text-red-800"
    return "bg-purple-100 border-purple-300 text-purple-800"
  }

  const getSeverityIcon = (range) => {
    if (range.includes("1-30")) return <Clock className="h-4 w-4 text-yellow-600" />
    if (range.includes("31-60")) return <AlertCircle className="h-4 w-4 text-orange-600" />
    if (range.includes("61-90")) return <AlertCircle className="h-4 w-4 text-red-600" />
    return <AlertCircle className="h-4 w-4 text-purple-600" />
  }

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      {error && (
        <Alert variant={error.type === "error" ? "destructive" : "default"} className={error.type === "info" ? "bg-blue-50 border-blue-200" : ""}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Success Result */}
      {result && !showConfirm && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-green-900 text-lg">{result.message}</div>
                <div className="mt-2 space-y-1 text-sm text-green-800">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>
                      <strong>{result.notificationsSent}</strong> {result.notificationsSent === 1 ? "correo enviado" : "correos enviados"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Fecha: {result.timestamp}</span>
                  </div>
                  {result.durationMs && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>Duración: {(result.durationMs / 1000).toFixed(2)}s</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Button or Summary Card */}
      {!showConfirm ? (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-blue-600" />
              Notificaciones de Mora
            </CardTitle>
            <CardDescription>
              Envía correos automáticos a clientes con cuotas vencidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleCheckSummary} 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 gap-2 h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando mora...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Ver Clientes en Mora
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-300 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg text-amber-900">
                  Resumen de Mora - Notificaciones Pendientes
                </CardTitle>
                <CardDescription className="mt-1 text-amber-700">
                  {summary?.message || "Revisa el detalle antes de enviar las notificaciones"}
                </CardDescription>
                {summary?.timestamp && (
                  <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Datos actualizados: {summary.timestamp}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-blue-700">{summary?.totalClientsWithOverdue || 0}</div>
                <div className="text-xs text-blue-600 mt-1 font-medium uppercase tracking-wide">Clientes</div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border-2 border-red-200 shadow-sm hover:shadow-md transition-shadow">
                <CreditCard className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-red-700">
                  {formatCurrency(summary?.totalOverdueAmount)}
                </div>
                <div className="text-xs text-red-600 mt-1 font-medium uppercase tracking-wide">Mora Total</div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border-2 border-amber-200 shadow-sm hover:shadow-md transition-shadow">
                <AlertCircle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-amber-700">{summary?.totalOverdueQuotas || 0}</div>
                <div className="text-xs text-amber-600 mt-1 font-medium uppercase tracking-wide">Cuotas Vencidas</div>
              </div>
            </div>

            {/* Breakdown by Days */}
            {summary?.byDaysOverdue && summary.byDaysOverdue.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Clock className="h-4 w-4" />
                  Desglose por Días de Atraso:
                </div>
                <div className="space-y-2">
                  {summary.byDaysOverdue.map((item, index) => (
                    <div 
                      key={index} 
                      className={`flex justify-between items-center p-3 rounded-lg border-2 ${getSeverityColor(item.range)} hover:shadow-md transition-all`}
                    >
                      <div className="flex items-center gap-3">
                        {getSeverityIcon(item.range)}
                        <div>
                          <span className="text-sm font-semibold">{item.range}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {item.count} {item.count === 1 ? "cuota" : "cuotas"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{formatCurrency(item.amount)}</div>
                        <div className="text-xs opacity-75">
                          {((item.amount / summary.totalOverdueAmount) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warning Message */}
            <Alert className="bg-amber-50 border-amber-300">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                <strong>Importante:</strong> Se enviará un correo electrónico a cada cliente con cuotas vencidas. 
                Esta acción no se puede deshacer. Asegúrate de revisar los datos antes de confirmar.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button 
                onClick={handleSendEmails} 
                disabled={loading || summary?.totalClientsWithOverdue === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 gap-2 h-11 text-base font-semibold shadow-md hover:shadow-lg transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Enviando correos...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Confirmar y Enviar {summary?.totalClientsWithOverdue || 0} {summary?.totalClientsWithOverdue === 1 ? "Correo" : "Correos"}
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleCancel} 
                variant="outline" 
                disabled={loading}
                className="sm:w-32 h-11 border-2 hover:bg-gray-50"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
