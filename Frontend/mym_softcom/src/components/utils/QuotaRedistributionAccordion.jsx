"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronDown, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import axiosInstance from "@/lib/axiosInstance"

export default function QuotaRedistributionAccordion({ 
  saleId, 
  sale,
  paymentDetails = [],
  onRedistributionComplete 
}) {
  // ✅ NUEVO: Estado para cuotas desde tabla Quotas
  const [quotasFromDB, setQuotasFromDB] = useState([])
  const [loadingQuotas, setLoadingQuotas] = useState(false)
  const [migrationNeeded, setMigrationNeeded] = useState(false)

  // ✅ NUEVO: Cargar cuotas desde tabla cuando cambia saleId
  useEffect(() => {
    const loadQuotas = async () => {
      try {
        setLoadingQuotas(true)
        console.log(`[QuotaRedistributionAccordion] 📋 Obteniendo cuotas para venta ${saleId}`)
        
        const response = await axiosInstance.get(`/api/Sale/${saleId}/quotas`)
        
        console.log(`[QuotaRedistributionAccordion] 📊 Respuesta:`, response.data)
        
        if (response.data.quotas && response.data.quotas.length > 0) {
          console.log(`[QuotaRedistributionAccordion] ✅ ${response.data.quotas.length} cuotas cargadas desde BD`)
          console.log(`[QuotaRedistributionAccordion] 📋 Primeras cuotas:`, response.data.quotas.slice(0, 3))
          setQuotasFromDB(response.data.quotas)
          setMigrationNeeded(false)
        } else {
          console.log(`[QuotaRedistributionAccordion] ⚠️ No hay cuotas en tabla (${response.data.quotas?.length || 0} cuotas), necesita migración`)
          setMigrationNeeded(true)
        }
      } catch (error) {
        console.error(`[QuotaRedistributionAccordion] ❌ Error al obtener cuotas: ${error.message}`)
        console.error(`[QuotaRedistributionAccordion] 📡 Error response:`, error.response?.data)
        console.log(`[QuotaRedistributionAccordion] 🔄 Intentando migrar desde customQuotasJson`)
        setMigrationNeeded(true)
      } finally {
        setLoadingQuotas(false)
      }
    }

    if (saleId) {
      loadQuotas()
    }
  }, [saleId])

  // ✅ NUEVO: Migrar cuotas si es necesario
  const handleMigrateQuotas = async () => {
    try {
      setLoadingQuotas(true)
      console.log(`[QuotaRedistributionAccordion] 🔄 Iniciando migración para venta ${saleId}`)
      
      await axiosInstance.post(`/api/Sale/${saleId}/migrate-quotas`)
      
      console.log(`[QuotaRedistributionAccordion] ✅ Migración completada, recargan cuotas`)
      
      // Recargar cuotas después de migrar
      const response = await axiosInstance.get(`/api/Sale/${saleId}/quotas`)
      if (response.data.quotas) {
        setQuotasFromDB(response.data.quotas)
        setMigrationNeeded(false)
      }
    } catch (error) {
      console.error(`[QuotaRedistributionAccordion] ❌ Error en migración: ${error.message}`)
      alert("Error al migrar cuotas: " + error.message)
    } finally {
      setLoadingQuotas(false)
    }
  }

  // Calcular cuotas vencidas y pendientes automáticamente
  const { overdueQuotas, remainingQuotas } = useMemo(() => {
    console.log(`[useMemo] 🔍 Calculando cuotas. quotasFromDB=${quotasFromDB.length}, sale.customQuotasJson=${!!sale?.customQuotasJson}`)
    
    // ✅ PREFERENCIA 1: Si tenemos cuotas de BD y tienen datos, usarlas
    if (quotasFromDB && quotasFromDB.length > 0) {
      console.log(`[QuotaRedistributionAccordion] 📊 Calculando vencidas/pendientes desde tabla (${quotasFromDB.length} cuotas)`)
      console.log(`[QuotaRedistributionAccordion] 📋 Todas las cuotas:`, quotasFromDB.map(q => ({ 
        num: q.quota_number, 
        status: q.status, 
        amount: q.current_amount, 
        due: q.due_date 
      })))
      
      const currentDate = new Date()
      const overdueResult = []
      const remainingResult = []

      // Agregar pagos por cuota desde paymentDetails
      const paymentsByQuota = {}
      paymentDetails.forEach((detail) => {
        const quotaNum = detail.number_quota
        if (quotaNum > 0) {
          if (!paymentsByQuota[quotaNum]) {
            paymentsByQuota[quotaNum] = 0
          }
          paymentsByQuota[quotaNum] += detail.covered_amount || 0
        }
      })

      quotasFromDB.forEach((quota) => {
        const dueDate = new Date(quota.due_date)
        const isOverdue = dueDate < currentDate
        const isPaid = quota.status === "Pagada"
        const isDistribuida = quota.status === "Distribuida"
        const isVencida = quota.status === "Vencida"
        const paidAmount = paymentsByQuota[quota.quota_number] || 0
        const remainingAmount = quota.current_amount - paidAmount

        console.log(`  Cuota ${quota.quota_number}: due=${dueDate.toLocaleDateString()}, status=${quota.status}, overdue=${isOverdue}, paid=${isPaid}, dist=${isDistribuida}, remaining=${remainingAmount}`)

        // ✅ INCLUIR CUOTAS VENCIDAS (sin importar si tienen remaining) Y DISTRIBUIDAS
        // Porque vencidas y distribuidas son cuotas que pueden redistribuirse
        if (!isPaid && (isVencida || isDistribuida)) {
          overdueResult.push({
            quotaNumber: quota.quota_number,
            remainingAmount: Math.max(remainingAmount, 0), // Al menos 0, no negativo
            expectedAmount: quota.amount,
            dueDate: dueDate,
          })
        } else if (!isOverdue && !isPaid && remainingAmount > 0) {
          remainingResult.push({
            quotaNumber: quota.quota_number,
            expectedAmount: quota.current_amount,
            dueDate: dueDate,
          })
        }
      })

      console.log(`[QuotaRedistributionAccordion] ✅ Cálculo: ${overdueResult.length} vencidas, ${remainingResult.length} pendientes`)
      // ✅ Si tenemos datos de tabla (incluso si está vacío), retornar
      return { overdueQuotas: overdueResult, remainingQuotas: remainingResult }
    }

    // ✅ PREFERENCIA 2: Si la tabla no tiene cuotas, usar fallback customQuotasJson
    console.log(`[QuotaRedistributionAccordion] 📊 Fallback a customQuotasJson (tabla vacía o sin cuotas)`)
    if (!sale?.plan?.number_quotas || !sale?.sale_date) {
      console.log(`[QuotaRedistributionAccordion] ⚠️ Sin plan o sale_date`)
      return { overdueQuotas: [], remainingQuotas: [] }
    }

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
      } catch (error) {
        console.error("Error parsing custom quotas JSON:", error)
      }
    }

    const parsedRedistribution = sale.redistributedQuotaNumbers ? JSON.parse(sale.redistributedQuotaNumbers) : null
    let redistributedQuotaNumbers = []
    let overdueQuotasFromRedistribution = []
    
    if (parsedRedistribution) {
      if (Array.isArray(parsedRedistribution)) {
        redistributedQuotaNumbers = parsedRedistribution
      } else if (parsedRedistribution.received) {
        redistributedQuotaNumbers = parsedRedistribution.received || []
        overdueQuotasFromRedistribution = parsedRedistribution.overdue || []
      }
    }

    const aggregatedQuotas = new Map()
    const uniquePayments = new Map()
    
    paymentDetails.forEach((detail) => {
      if (detail.payment?.id_Payments) {
        const paymentId = detail.payment.id_Payments
        if (!uniquePayments.has(paymentId)) {
          uniquePayments.set(paymentId, {
            amount: detail.payment.amount || 0,
            details: []
          })
        }
        uniquePayments.get(paymentId).details.push(detail)
      }
    })

    uniquePayments.forEach((payment) => {
      const totalCovered = payment.details.reduce((sum, d) => sum + (d.covered_amount || 0), 0)
      let useCorrection = false
      if (Math.abs(totalCovered - payment.amount) > 0.01) {
        useCorrection = true
      }
      
      payment.details.forEach((detail) => {
        if (detail.number_quota > 0) {
          const current = aggregatedQuotas.get(detail.number_quota) || { covered: 0 }
          let amountToAdd
          if (useCorrection && totalCovered > 0) {
            const proportion = (detail.covered_amount || 0) / totalCovered
            amountToAdd = payment.amount * proportion
          } else {
            amountToAdd = detail.covered_amount || 0
          }
          current.covered += amountToAdd
          aggregatedQuotas.set(detail.number_quota, current)
        }
      })
    })

    const overdueQuotasResult = []
    const remainingQuotasResult = []

    for (let i = 1; i <= totalQuotas; i++) {
      let dueDate
      if (customQuotas && customQuotas.length > 0) {
        const customQuota = customQuotas.find((q) => q.QuotaNumber === i)
        if (customQuota && customQuota.DueDate) {
          const [year, month, day] = customQuota.DueDate.split('-').map(Number)
          dueDate = new Date(year, month - 1, day)
        } else {
          const saleDay = saleDate.getDate()
          const saleMonth = saleDate.getMonth()
          const saleYear = saleDate.getFullYear()
          const totalMonths = saleMonth + i
          const targetYear = saleYear + Math.floor(totalMonths / 12)
          const targetMonth = ((totalMonths % 12) + 12) % 12
          const maxDayInMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
          const finalDay = Math.min(saleDay, maxDayInMonth)
          dueDate = new Date(targetYear, targetMonth, finalDay)
        }
      } else {
        const saleDay = saleDate.getDate()
        const saleMonth = saleDate.getMonth()
        const saleYear = saleDate.getFullYear()
        const totalMonths = saleMonth + i
        const targetYear = saleYear + Math.floor(totalMonths / 12)
        const targetMonth = ((totalMonths % 12) + 12) % 12
        const maxDayInMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
        const finalDay = Math.min(saleDay, maxDayInMonth)
        dueDate = new Date(targetYear, targetMonth, finalDay)
      }
      
      const isOverdue = dueDate < currentDate
      const isRedistributed = redistributedQuotaNumbers.includes(i)
      const isDistribuida = overdueQuotasFromRedistribution.includes(i)

      let adjustedQuotaValue
      if (customQuotas && customQuotas.length > 0) {
        const customQuota = customQuotas.find((q) => q.QuotaNumber === i)
        adjustedQuotaValue = customQuota ? customQuota.Amount : quotaValue
      } else {
        adjustedQuotaValue = quotaValue
      }

      const coveredInfo = aggregatedQuotas.get(i)
      const totalPaid = coveredInfo?.covered || 0

      if (isOverdue && totalPaid < adjustedQuotaValue && !isRedistributed && !isDistribuida) {
        const remainingAmount = adjustedQuotaValue - totalPaid
        overdueQuotasResult.push({
          quotaNumber: i,
          remainingAmount: remainingAmount,
          expectedAmount: adjustedQuotaValue,
          dueDate: dueDate,
        })
      } else if (!isOverdue && !isRedistributed && totalPaid < adjustedQuotaValue) {
        remainingQuotasResult.push({
          quotaNumber: i,
          expectedAmount: adjustedQuotaValue,
          dueDate: dueDate,
        })
      }
    }

    return { overdueQuotas: overdueQuotasResult, remainingQuotas: remainingQuotasResult }
  }, [sale, paymentDetails])

  const [isExpanded, setIsExpanded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUndoing, setIsUndoing] = useState(false)
  const [selectedQuotas, setSelectedQuotas] = useState([])
  const [distributionMode, setDistributionMode] = useState("lastQuota") // "lastQuota", "manual", "custom"
  const [manualDistribution, setManualDistribution] = useState({}) // { quotaNumber: monto }
  const [numQuotasToDistribute, setNumQuotasToDistribute] = useState(1)
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  // Sincronizar selectedQuotas cuando overdueQuotas cambia
  useEffect(() => {
    setSelectedQuotas(overdueQuotas.map(q => q.quotaNumber))
  }, [overdueQuotas])

  // Calcular dinero total de cuotas seleccionadas
  const totalSelectedAmount = selectedQuotas.reduce((sum, quotaNum) => {
    const quota = overdueQuotas.find(q => q.quotaNumber === quotaNum)
    return sum + (quota?.remainingAmount || 0)
  }, 0)

  // Cuotas que recibirán la redistribución (las que no están vencidas)
  const quotasToReceive = remainingQuotas.map(q => q.quotaNumber)
  const quotasToReceiveCount = quotasToReceive.length

  // Calcular montos según modo de distribución
  let amountPerQuota = 0
  let quotasForDistribution = []
  
  if (distributionMode === "lastQuota") {
    // Todo a última cuota no pagada
    quotasForDistribution = [quotasToReceive[quotasToReceive.length - 1]].filter(Boolean)
    amountPerQuota = totalSelectedAmount
  } else if (distributionMode === "custom") {
    // Distribuir en las últimas N cuotas
    quotasForDistribution = quotasToReceive.slice(-numQuotasToDistribute)
    amountPerQuota = quotasToReceiveCount > 0 
      ? totalSelectedAmount / quotasForDistribution.length 
      : 0
  } else if (distributionMode === "manual") {
    // Configuración manual por el usuario
    quotasForDistribution = Object.keys(manualDistribution).map(Number).filter(q => manualDistribution[q] > 0)
  }

  // Toggle selección de cuota
  const toggleQuota = (quotaNum) => {
    setSelectedQuotas(prev => 
      prev.includes(quotaNum)
        ? prev.filter(q => q !== quotaNum)
        : [...prev, quotaNum]
    )
  }

  // Seleccionar/Deseleccionar todas
  const toggleAll = () => {
    if (selectedQuotas.length === overdueQuotas.length) {
      setSelectedQuotas([])
    } else {
      setSelectedQuotas(overdueQuotas.map(q => q.quotaNumber))
    }
  }

  // Manejar redistribución
  const handleRedistribute = async () => {
    if (selectedQuotas.length === 0) {
      alert("Selecciona al menos una cuota para redistribuir")
      return
    }

    if (distributionMode === "lastQuota" && quotasForDistribution.length === 0) {
      alert("No hay cuota final disponible para recibir la redistribución")
      return
    }

    if (distributionMode === "custom" && quotasForDistribution.length === 0) {
      alert("Selecciona al menos una cuota destino")
      return
    }

    if (distributionMode === "manual") {
      const totalManual = Object.values(manualDistribution).reduce((a, b) => a + b, 0)
      if (totalManual !== totalSelectedAmount) {
        alert(`Total manual (${totalManual}) no coincide con total de redistribución (${totalSelectedAmount})`)
        return
      }
      if (quotasForDistribution.length === 0) {
        alert("Configura al menos una cuota destino con monto")
        return
      }
    }

    setIsProcessing(true)
    try {
      let requestData = {
        redistributionType: distributionMode === "lastQuota" ? "lastQuota" : "custom",
        fromQuota: Math.min(...selectedQuotas),
        toQuota: Math.max(...selectedQuotas),
        overdueQuotas: selectedQuotas.map(quotaNum => ({
          quotaNumber: quotaNum,
          remainingAmount: overdueQuotas.find(q => q.quotaNumber === quotaNum)?.remainingAmount || 0
        })),
        startDate: startDate
      }

      if (distributionMode === "manual") {
        // Enviar configuración manual
        requestData.manualDistribution = manualDistribution
      } else if (distributionMode === "custom") {
        // Distribuir en múltiples cuotas
        requestData.numQuotasToDistribute = quotasForDistribution.length
        requestData.amountPerQuota = amountPerQuota
      } else {
        // lastQuota: todo a una cuota
        requestData.numQuotasToDistribute = 1
        requestData.amountPerQuota = totalSelectedAmount
      }

      console.log('[QuotaRedistributionAccordion] 📤 Enviando:', requestData)

      await axiosInstance.post(`/api/Sale/${saleId}/redistribute-quotas`, requestData)

      console.log('[QuotaRedistributionAccordion] ✅ Redistribución exitosa')
      
      // ✅ IMPORTANTE: Recargar quotas de la BD para reflejar cambios
      console.log('[QuotaRedistributionAccordion] 🔄 Recargando quotas después de redistribuir...')
      const refreshResponse = await axiosInstance.get(`/api/Sale/${saleId}/quotas`)
      if (refreshResponse.data.quotas) {
        console.log('[QuotaRedistributionAccordion] ✅ Quotas recargadas:', refreshResponse.data.quotas.length)
        setQuotasFromDB(refreshResponse.data.quotas)
      }
      
      alert("✅ Redistribución completada exitosamente")
      setIsExpanded(false)
      
      // Reset a valores por defecto
      setDistributionMode("lastQuota")
      setManualDistribution({})
      setNumQuotasToDistribute(1)

      if (onRedistributionComplete) {
        await onRedistributionComplete()
      }
    } catch (error) {
      console.error("Error al redistribuir cuotas:", error)
      alert("❌ Error: " + (error.response?.data?.message || error.message))
    } finally {
      setIsProcessing(false)
    }
  }

  // Manejar deshacer redistribución
  const handleUndoRedistribution = async () => {
    if (!confirm("¿Estás seguro de que deseas deshacer la redistribución? Las cuotas volverán a su estado original.")) {
      return
    }

    setIsUndoing(true)
    try {
      console.log('[QuotaRedistributionAccordion] 🔄 Deshaciendo redistribución para venta:', saleId)

      await axiosInstance.post(`/api/Sale/${saleId}/undo-redistribution`)

      console.log('[QuotaRedistributionAccordion] ✅ Undo exitoso')
      
      // ✅ IMPORTANTE: Recargar quotas de la BD para reflejar cambios
      console.log('[QuotaRedistributionAccordion] 🔄 Recargando quotas después del undo...')
      const refreshResponse = await axiosInstance.get(`/api/Sale/${saleId}/quotas`)
      if (refreshResponse.data.quotas) {
        console.log('[QuotaRedistributionAccordion] ✅ Quotas recargadas:', refreshResponse.data.quotas.length)
        setQuotasFromDB(refreshResponse.data.quotas)
      }
      
      alert("✅ Redistribución deshecha exitosamente")
      setIsExpanded(false)

      // Recargar cuotas después del undo
      if (onRedistributionComplete) {
        await onRedistributionComplete()
      }
    } catch (error) {
      console.error("Error al deshacer redistribución:", error)
      alert("❌ Error: " + (error.response?.data?.message || error.message))
    } finally {
      setIsUndoing(false)
    }
  }

  // Detectar si hay cuotas distribuidas (para mostrar botón de undo)
  const hasDistributedQuotas = quotasFromDB && quotasFromDB.some(q => q.status === "Distribuida")

  // No mostrar si no hay cuotas vencidas
  if (overdueQuotas.length === 0) {
    // Si necesita migración, mostrar botón de migración
    if (migrationNeeded && !loadingQuotas) {
      return (
        <Card className="mb-6 overflow-hidden border-blue-200 bg-blue-50">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              <div className="text-left">
                <h3 className="font-semibold text-blue-900">Migración de Cuotas Necesaria</h3>
                <p className="text-sm text-blue-700">Las cuotas necesitan migrarse a la nueva estructura</p>
              </div>
            </div>
            <Button
              onClick={handleMigrateQuotas}
              disabled={loadingQuotas}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loadingQuotas ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Migrando...
                </>
              ) : (
                "Migrar Cuotas"
              )}
            </Button>
          </div>
        </Card>
      )
    }
    
    return null
  }

  return (
    <Card className="mb-6 overflow-hidden border-orange-200 bg-orange-50">
      {/* Encabezado del Acordeón */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={loadingQuotas}
        className="w-full px-6 py-4 flex items-center justify-between bg-orange-100 hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <div className="text-left">
            <h3 className="font-semibold text-orange-900">
              📊 Redistribución de Cuotas Vencidas
            </h3>
            <p className="text-sm text-orange-700">
              {loadingQuotas ? "Cargando cuotas..." : `${overdueQuotas.length} cuota(s) vencida(s) • Total: $${totalSelectedAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
            </p>
          </div>
        </div>
        <ChevronDown 
          className={`h-5 w-5 text-orange-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Contenido del Acordeón */}
      {isExpanded && (
        <div className="px-6 py-6 space-y-6 border-t border-orange-200">
          
          {/* Sección: Seleccionar Cuotas Vencidas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold text-gray-700">
                Seleccionar cuotas a redistribuir:
              </Label>
              <button
                onClick={toggleAll}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
                disabled={loadingQuotas}
              >
                {selectedQuotas.length === overdueQuotas.length ? "Deseleccionar todas" : "Seleccionar todas"}
              </button>
            </div>
            
            <div className="space-y-2 bg-white p-4 rounded-lg border border-orange-100">
              {overdueQuotas.map(quota => (
                <div key={quota.quotaNumber} className="flex items-center gap-3">
                  <Checkbox
                    id={`quota-${quota.quotaNumber}`}
                    checked={selectedQuotas.includes(quota.quotaNumber)}
                    onCheckedChange={() => toggleQuota(quota.quotaNumber)}
                    disabled={isProcessing || loadingQuotas}
                  />
                  <label
                    htmlFor={`quota-${quota.quotaNumber}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    <span className="font-medium text-gray-700">
                      Cuota #{quota.quotaNumber}
                    </span>
                    <span className="text-gray-600 ml-2">
                      ${quota.remainingAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Sección: Resumen */}
          <div className="bg-white p-4 rounded-lg border border-orange-100">
            <Label className="text-sm font-semibold text-gray-700 block mb-3">Resumen</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600">Total a redistribuir</p>
                <p className="text-lg font-bold text-orange-600">
                  ${totalSelectedAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Cuotas disponibles</p>
                <p className="text-lg font-bold text-blue-600">
                  {quotasToReceiveCount}
                </p>
              </div>
            </div>
          </div>

          {/* Sección: Estrategia de Distribución */}
          <div className="space-y-4">
            <Label className="text-base font-semibold text-gray-700">Cómo distribuir el dinero:</Label>
            
            {/* Opción 1: Última Cuota */}
            <div className="p-4 border-2 rounded-lg transition-all cursor-pointer"
              onClick={() => setDistributionMode("lastQuota")}
              style={{
                borderColor: distributionMode === "lastQuota" ? "#ea580c" : "#e5e7eb",
                backgroundColor: distributionMode === "lastQuota" ? "#fef3c7" : "#ffffff"
              }}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded border-2 mt-1 flex items-center justify-center ${
                  distributionMode === "lastQuota" 
                    ? "bg-orange-600 border-orange-600" 
                    : "border-gray-300"
                }`}>
                  {distributionMode === "lastQuota" && <span className="text-white text-sm">✓</span>}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Todo a última cuota</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Se redistribuye todo el monto a la cuota #{quotasToReceive[quotasToReceive.length - 1]}
                  </p>
                </div>
              </div>
            </div>

            {/* Opción 2: Múltiples Cuotas */}
            <div className="p-4 border-2 rounded-lg transition-all cursor-pointer"
              onClick={() => setDistributionMode("custom")}
              style={{
                borderColor: distributionMode === "custom" ? "#ea580c" : "#e5e7eb",
                backgroundColor: distributionMode === "custom" ? "#fef3c7" : "#ffffff"
              }}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded border-2 mt-1 flex items-center justify-center ${
                  distributionMode === "custom" 
                    ? "bg-orange-600 border-orange-600" 
                    : "border-gray-300"
                }`}>
                  {distributionMode === "custom" && <span className="text-white text-sm">✓</span>}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Distribuir en múltiples cuotas</p>
                  <p className="text-sm text-gray-600 mt-1 mb-3">
                    Especifica cuántas de las últimas cuotas recibirán el dinero
                  </p>
                  {distributionMode === "custom" && (
                    <div className="space-y-2">
                      <Label htmlFor="num-quotas" className="text-xs text-gray-700">
                        Cuántas cuotas recebirán dinero:
                      </Label>
                      <Input
                        id="num-quotas"
                        type="number"
                        min="1"
                        max={quotasToReceiveCount}
                        value={numQuotasToDistribute}
                        onChange={(e) => setNumQuotasToDistribute(Math.min(parseInt(e.target.value) || 1, quotasToReceiveCount))}
                        disabled={isProcessing || loadingQuotas}
                        className="text-sm"
                      />
                      <p className="text-xs text-blue-600">
                        Cuotas: {quotasForDistribution.join(", ")} • Monto c/u: ${amountPerQuota.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Opción 3: Configuración Manual */}
            <div className="p-4 border-2 rounded-lg transition-all cursor-pointer"
              onClick={() => setDistributionMode("manual")}
              style={{
                borderColor: distributionMode === "manual" ? "#ea580c" : "#e5e7eb",
                backgroundColor: distributionMode === "manual" ? "#fef3c7" : "#ffffff"
              }}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded border-2 mt-1 flex items-center justify-center ${
                  distributionMode === "manual" 
                    ? "bg-orange-600 border-orange-600" 
                    : "border-gray-300"
                }`}>
                  {distributionMode === "manual" && <span className="text-white text-sm">✓</span>}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Configuración personalizada</p>
                  <p className="text-sm text-gray-600 mt-1 mb-3">
                    Especifica exactamente cuánto dinero va a cada cuota
                  </p>
                  {distributionMode === "manual" && (
                    <div className="space-y-2 bg-gray-50 p-3 rounded">
                      {quotasToReceive.map(quotaNum => (
                        <div key={quotaNum} className="flex items-center gap-2">
                          <Label htmlFor={`manual-${quotaNum}`} className="text-xs w-20">
                            Cuota #{quotaNum}:
                          </Label>
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-xs text-gray-600">$</span>
                            <Input
                              id={`manual-${quotaNum}`}
                              type="number"
                              step="0.01"
                              value={manualDistribution[quotaNum] || ""}
                              onChange={(e) => setManualDistribution({
                                ...manualDistribution,
                                [quotaNum]: parseFloat(e.target.value) || 0
                              })}
                              disabled={isProcessing || loadingQuotas}
                              className="text-xs h-8"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-gray-200 mt-2">
                        <p className="text-xs font-semibold">
                          Total configurado: ${Object.values(manualDistribution).reduce((a, b) => a + b, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} / ${totalSelectedAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sección: Fecha */}
          <div>
            <Label htmlFor="start-date" className="text-sm font-medium">
              Fecha inicio de redistribución
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isProcessing || loadingQuotas}
              className="mt-1"
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => setIsExpanded(false)}
              variant="outline"
              disabled={isProcessing || isUndoing || loadingQuotas}
              className="flex-1"
            >
              Cancelar
            </Button>
            {hasDistributedQuotas && (
              <Button
                onClick={handleUndoRedistribution}
                disabled={isUndoing || isProcessing || loadingQuotas}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                {isUndoing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deshaciendo...
                  </>
                ) : (
                  "↶ Deshacer"
                )}
              </Button>
            )}
            <Button
              onClick={handleRedistribute}
              disabled={isProcessing || isUndoing || loadingQuotas || selectedQuotas.length === 0 || (
                distributionMode === "lastQuota" && quotasForDistribution.length === 0
              ) || (
                distributionMode === "custom" && quotasForDistribution.length === 0
              ) || (
                distributionMode === "manual" && (
                  quotasForDistribution.length === 0 ||
                  Object.values(manualDistribution).reduce((a, b) => a + b, 0) !== totalSelectedAmount
                )
              )}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Redistribuyendo...
                </>
              ) : (
                `✓ Redistribuir (${selectedQuotas.length})`
              )}
            </Button>
          </div>

          {/* Info adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <p>
              {distributionMode === "lastQuota" && (
                <>ℹ️ Se redistribuirán <strong>${totalSelectedAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong> a la cuota <strong>#{quotasToReceive[quotasToReceive.length - 1]}</strong></>
              )}
              {distributionMode === "custom" && (
                <>ℹ️ Se redistribuirán <strong>${totalSelectedAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong> divididos entre cuotas: <strong>{quotasForDistribution.join(", ")}</strong></>
              )}
              {distributionMode === "manual" && (
                <>ℹ️ Distribución personalizada configurada. Verifica que los montos sumen correctamente.</>
              )}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}
