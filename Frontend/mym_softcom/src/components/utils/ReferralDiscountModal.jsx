"use client"

import { useState, useEffect } from "react"
import axiosInstance from "@/lib/axiosInstance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Search, AlertCircle, Gift, DollarSign, Calendar } from "lucide-react"

function ReferralDiscountModal({ isOpen, onClose, onSuccess, showAlert, discountToEdit }) {
  // Estados del formulario
  const [step, setStep] = useState("search") // search, selectSale, details, confirm
  const isEditing = !!discountToEdit
  const [clientDocument, setClientDocument] = useState("")
  const [foundClient, setFoundClient] = useState(null)
  const [clientSearchLoading, setClientSearchLoading] = useState(false)
  const [clientSearchError, setClientSearchError] = useState(null)
  const [clientSales, setClientSales] = useState([])
  const [selectedSaleId, setSelectedSaleId] = useState(null)

  const [discountData, setDiscountData] = useState({
    discount_amount: "",
    apply_to: "cartera",
    notes: "",
  })

  const [saleInfo, setSaleInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  // Cargar datos cuando estamos editando
  useEffect(() => {
    const loadEditData = async () => {
      if (isOpen && isEditing && discountToEdit) {
        setStep("details")
        setClientDocument(discountToEdit.document || "")
        setFoundClient({
          id_Clients: discountToEdit.id_Clients,
          names: discountToEdit.client_name?.split(" ")[0] || "",
          surnames: discountToEdit.client_name?.split(" ").slice(1).join(" ") || "",
          document: discountToEdit.document,
        })
        setDiscountData({
          discount_amount: discountToEdit.discount_amount.toString(),
          apply_to: discountToEdit.apply_to,
          notes: discountToEdit.notes || "",
        })
        
        // Cargar información de la venta si existe
        if (discountToEdit.id_Sales) {
          setSelectedSaleId(discountToEdit.id_Sales)
          // Obtener también la lista de ventas del cliente por si quiere cambiarla
          try {
            const saleResponse = await axiosInstance.get(
              `/api/Sale/GetByClientId/${discountToEdit.id_Clients}`
            )
            if (saleResponse.data && Array.isArray(saleResponse.data)) {
              setClientSales(saleResponse.data)
              const selectedSale = saleResponse.data.find(s => s.id_Sales === discountToEdit.id_Sales)
              if (selectedSale) {
                setSaleInfo(selectedSale)
              }
            }
          } catch (error) {
            console.log("No se pudieron cargar las ventas para editar")
          }
        }
      }
    }
    
    loadEditData()
  }, [isOpen, isEditing, discountToEdit])
  const handleSearchClient = async () => {
    if (!clientDocument.trim()) {
      setClientSearchError("Por favor ingrese un número de documento")
      return
    }

    setClientSearchLoading(true)
    setClientSearchError(null)

    try {
      const response = await axiosInstance.get(`/api/Client/GetByDocument/${clientDocument}`)
      
      if (response.data) {
        setFoundClient(response.data)
        
        // Obtener información de ventas del cliente
        try {
          const saleResponse = await axiosInstance.get(
            `/api/Sale/GetByClientId/${response.data.id_Clients}`
          )
          
          if (saleResponse.data && Array.isArray(saleResponse.data) && saleResponse.data.length > 0) {
            setClientSales(saleResponse.data)
            
            // Si hay solo 1 venta, ir directamente a details
            if (saleResponse.data.length === 1) {
              setSaleInfo(saleResponse.data[0])
              setSelectedSaleId(saleResponse.data[0].id_Sales)
              setStep("details")
            } else {
              // Si hay múltiples ventas, mostrar selector
              setStep("selectSale")
            }
          } else {
            // Si no hay ventas, igual continuar (para cuotas)
            setClientSales([])
            setStep("details")
          }
        } catch (saleError) {
          console.log("No se encontraron ventas para este cliente")
          setClientSales([])
          setStep("details")
        }
      } else {
        setClientSearchError("Cliente no encontrado")
      }
    } catch (error) {
      setClientSearchError(
        error.response?.data?.message || "Error al buscar el cliente. Intente nuevamente."
      )
    } finally {
      setClientSearchLoading(false)
    }
  }

  const handleSelectSale = (saleId) => {
    const selected = clientSales.find(s => s.id_Sales === saleId)
    setSelectedSaleId(saleId)
    setSaleInfo(selected)
    setStep("details")
  }

  // Validar y procesar descuento
  const handleSubmitDiscount = async () => {
    // Validaciones
    if (!discountData.discount_amount || parseFloat(discountData.discount_amount) <= 0) {
      showAlert("error", "Por favor ingrese un monto válido para el descuento")
      return
    }

    if (!discountData.apply_to) {
      showAlert("error", "Por favor seleccione dónde aplicar el descuento")
      return
    }

    setStep("confirm")
  }

  // Confirmar y guardar descuento
  const handleConfirmDiscount = async () => {
    setLoading(true)

    try {
      const payload = {
        id_Clients: foundClient.id_Clients,
        id_Sales: selectedSaleId || null,
        discount_amount: parseFloat(discountData.discount_amount),
        discount_type: "referral",
        apply_to: discountData.apply_to,
        notes: discountData.notes || `Descuento por referido - Cliente: ${foundClient.names} ${foundClient.surnames}`,
        discount_date: new Date().toISOString().split("T")[0],
      }

      // Si es edición, usa PUT; si es nuevo, usa POST
      if (isEditing) {
        await axiosInstance.put(`/api/Discount/UpdateDiscount/${discountToEdit.id_Discount}`, payload)
        showAlert("success", "Descuento actualizado exitosamente")
      } else {
        await axiosInstance.post("/api/Discount/CreateReferralDiscount", payload)
        showAlert("success", "Descuento por referido registrado exitosamente")
      }
      
      handleReset()
      onSuccess?.()
    } catch (error) {
      showAlert(
        "error",
        error.response?.data?.message || "Error al registrar el descuento. Intente nuevamente."
      )
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep("search")
    setClientDocument("")
    setFoundClient(null)
    setClientSearchError(null)
    setSaleInfo(null)
    setClientSales([])
    setSelectedSaleId(null)
    setDiscountData({
      discount_amount: "",
      apply_to: "cartera",
      notes: "",
    })
    onClose()
  }

  const handleClose = () => {
    handleReset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-blue-600" />
            Descuento por Referido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* PASO 1: BUSCAR CLIENTE */}
          {step === "search" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientDoc">Documento del Cliente</Label>
                <div className="flex gap-2">
                  <Input
                    id="clientDoc"
                    type="number"
                    placeholder="Ingrese número de documento"
                    value={clientDocument}
                    onChange={(e) => {
                      setClientDocument(e.target.value)
                      setClientSearchError(null)
                    }}
                    onKeyPress={(e) => e.key === "Enter" && handleSearchClient()}
                    disabled={clientSearchLoading}
                  />
                  <Button
                    onClick={handleSearchClient}
                    disabled={clientSearchLoading || !clientDocument}
                    className="gap-2"
                  >
                    {clientSearchLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {clientSearchError && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{clientSearchError}</AlertDescription>
                </Alert>
              )}

              {foundClient && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <p>
                      <strong>Cliente:</strong> {foundClient.names} {foundClient.surnames}
                    </p>
                    <p>
                      <strong>Documento:</strong> {foundClient.document}
                    </p>
                    <p>
                      <strong>Email:</strong> {foundClient.email}
                    </p>
                    {saleInfo && (
                      <>
                        <p>
                          <strong>Valor Total Contrato:</strong> ${saleInfo.total_value?.toLocaleString()}
                        </p>
                        <p>
                          <strong>Valor Cuota:</strong> ${saleInfo.quota_value?.toLocaleString()}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* PASO 2: SELECCIONAR VENTA (Si hay múltiples) */}
          {step === "selectSale" && foundClient && clientSales.length > 0 && (
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setStep("search")}
              >
                ← Cambiar Cliente
              </Button>

              <div className="bg-blue-50 p-3 rounded-md text-sm">
                <p className="font-semibold text-blue-900">
                  {foundClient.names} {foundClient.surnames}
                </p>
                <p className="text-blue-700">Doc: {foundClient.document}</p>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Seleccione la venta a descontar:</Label>
                <div className="space-y-2">
                  {clientSales.map((sale) => {
                    const projectName = sale?.lot?.project?.name || sale?.lot?.Project?.name || "Sin proyecto"
                    return (
                      <button
                        key={sale.id_Sales}
                        onClick={() => handleSelectSale(sale.id_Sales)}
                        className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                          selectedSaleId === sale.id_Sales
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {sale.lot?.block} - Lote {sale.lot?.lot_number}
                            </p>
                            <p className="text-sm text-gray-600">
                              {projectName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              Cartera: ${sale.total_debt?.toLocaleString("es-CO")}
                            </p>
                            <p className="text-sm text-gray-600">
                              Abonado: ${sale.total_raised?.toLocaleString("es-CO")}
                            </p>
                            <p className="text-sm text-gray-600">
                              Cuota: ${sale.quota_value?.toLocaleString("es-CO")}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: DETALLES DEL DESCUENTO */}
          {step === "details" && foundClient && (
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  if (clientSales.length > 1) {
                    setStep("selectSale")
                  } else {
                    setStep("search")
                  }
                }}
              >
                ← {clientSales.length > 1 ? "Cambiar Venta" : "Cambiar Cliente"}
              </Button>

              <div className="bg-blue-50 p-3 rounded-md text-sm">
                <p className="font-semibold text-blue-900">
                  {foundClient.names} {foundClient.surnames}
                </p>
                <p className="text-blue-700">Doc: {foundClient.document}</p>
              </div>

              {/* Monto del Descuento */}
              <div className="space-y-2">
                <Label htmlFor="discountAmount">Monto de Descuento ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <Input
                    id="discountAmount"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={discountData.discount_amount}
                    onChange={(e) =>
                      setDiscountData((prev) => ({
                        ...prev,
                        discount_amount: e.target.value,
                      }))
                    }
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Donde Aplicar */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">¿Dónde aplicar el descuento?</Label>
                <RadioGroup
                  value={discountData.apply_to}
                  onValueChange={(value) =>
                    setDiscountData((prev) => ({ ...prev, apply_to: value }))
                  }
                >
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="cartera" id="cartera" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="cartera" className="font-semibold cursor-pointer">
                        A la Cartera Pendiente
                      </Label>
                      <p className="text-sm text-gray-600">
                        Reduce el saldo total que el cliente debe pagar
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="cuota" id="cuota" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="cuota" className="font-semibold cursor-pointer">
                        A la Próxima Cuota
                      </Label>
                      <p className="text-sm text-gray-600">
                        Reduce solo el monto de la siguiente cuota a pagar
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (Opcional)</Label>
                <Input
                  id="notes"
                  placeholder="Ej: Referido de Juan Pérez..."
                  value={discountData.notes}
                  onChange={(e) =>
                    setDiscountData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
            </div>
          )}

          {/* PASO 4: CONFIRMACIÓN */}
          {step === "confirm" && foundClient && (
            <div className="space-y-4">
              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gift className="w-4 h-4 text-green-600" />
                    Resumen del Descuento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="font-semibold">
                      {foundClient.names} {foundClient.surnames}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Documento:</span>
                    <span className="font-semibold">{foundClient.document}</span>
                  </div>
                  <div className="border-t border-green-200 my-2"></div>
                  <div className="flex justify-between text-base">
                    <span className="font-semibold">Monto Descuento:</span>
                    <span className="font-bold text-green-700">
                      ${parseFloat(discountData.discount_amount).toLocaleString("es-CO", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Se aplicará a:</span>
                    <span className="font-semibold capitalize">
                      {discountData.apply_to === "cartera" ? "Cartera Pendiente" : "Próxima Cuota"}
                    </span>
                  </div>
                  {discountData.notes && (
                    <div>
                      <span className="text-gray-600">Nota:</span>
                      <p className="font-semibold mt-1">{discountData.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Confirme que desea registrar este descuento por referido.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {/* BOTONES DE ACCIÓN */}
        <DialogFooter className="gap-2 flex justify-end">
          {step !== "search" && (
            <Button
              variant="outline"
              onClick={() => {
                if (step === "confirm") {
                  setStep("details")
                } else if (step === "details" && clientSales.length > 1) {
                  setStep("selectSale")
                } else {
                  setStep("search")
                }
              }}
              disabled={loading}
            >
              ← Atrás
            </Button>
          )}

          {step === "search" && (
            <Button onClick={handleClose} variant="outline">
              Cancelar
            </Button>
          )}

          {step === "details" && (
            <>
              <Button onClick={handleClose} variant="outline">
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitDiscount}
                disabled={!discountData.discount_amount || loading}
                className="gap-2"
              >
                Siguiente →
              </Button>
            </>
          )}

          {step === "confirm" && (
            <>
              <Button onClick={handleClose} variant="outline" disabled={loading}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmDiscount}
                disabled={loading}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    Confirmar Descuento
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ReferralDiscountModal
