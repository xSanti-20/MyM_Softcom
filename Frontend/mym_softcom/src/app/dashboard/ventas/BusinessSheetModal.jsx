"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

function numeroALetras(num) {
  const unidades = [
    "",
    "UN",
    "DOS",
    "TRES",
    "CUATRO",
    "CINCO",
    "SEIS",
    "SIETE",
    "OCHO",
    "NUEVE",
    "DIEZ",
    "ONCE",
    "DOCE",
    "TRECE",
    "CATORCE",
    "QUINCE",
    "DIECISÉIS",
    "DIECISIETE",
    "DIECIOCHO",
    "DIECINUEVE",
    "VEINTE",
  ]

  const decenas = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"]

  const centenas = [
    "",
    "CIENTO",
    "DOSCIENTOS",
    "TRESCIENTOS",
    "CUATROCIENTOS",
    "QUINIENTOS",
    "SEISCIENTOS",
    "SETECIENTOS",
    "OCHOCIENTOS",
    "NOVECIENTOS",
  ]

  function seccion(num, divisor, strSingular, strPlural) {
    const cientos = Math.floor(num / divisor)
    const resto = num - cientos * divisor

    let letras = ""

    if (cientos > 0) {
      if (cientos > 1) letras = numeroALetras(cientos) + " " + strPlural
      else letras = strSingular
    }

    if (resto > 0) letras += " " + numeroALetras(resto)

    return letras.trim()
  }

  function miles(num) {
    return seccion(num, 1000, "MIL", "MIL")
  }

  function millones(num) {
    return seccion(num, 1000000, "UN MILLÓN", "MILLONES")
  }

  function milesDeMillones(num) {
    return seccion(num, 1000000000, "MIL MILLONES", "MIL MILLONES")
  }

  if (num === 0) return "CERO"
  else if (num < 21) return unidades[num]
  else if (num < 100) {
    if (num % 10 === 0) return decenas[Math.floor(num / 10)]
    return decenas[Math.floor(num / 10)] + " Y " + unidades[num % 10]
  } else if (num < 1000) {
    if (num === 100) return "CIEN"
    return centenas[Math.floor(num / 100)] + (num % 100 !== 0 ? " " + numeroALetras(num % 100) : "")
  } else if (num < 1000000) {
    return miles(num)
  } else if (num < 1000000000) {
    return millones(num)
  } else {
    return milesDeMillones(num)
  }
}

export function BusinessSheetModal({ isOpen, onClose, onConfirm, saleData }) {
  const [formData, setFormData] = useState({
    lugarExpedicion: "",
    direccion: "",
    ciudad: "",
    proyecto: "",
    tipoContrato: "",
    consecutivo: "",
    areaConstruida: "",
    tieneSegundoComprador: false,
    segundoCompradorNombre: "",
    segundoCompradorCedula: "",
  })

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleConfirm = () => {
    onConfirm(formData)
    onClose()
  }

  const handleCancel = () => {
    setFormData({
      lugarExpedicion: "",
      direccion: "",
      ciudad: "",
      proyecto: "",
      tipoContrato: "",
      consecutivo: "",
      areaConstruida: "",
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Información Adicional del Cliente</DialogTitle>
          <DialogDescription>Complete la información adicional para generar la hoja de negocio.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Proyecto */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="proyecto" className="text-right">
              Contrato de:
            </Label>
            <Select value={formData.proyecto} onValueChange={(value) => handleInputChange("proyecto", value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccione el proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="malibu">Malibú</SelectItem>
                <SelectItem value="reservas-del-poblado">Reservas del Poblado</SelectItem>
                <SelectItem value="luxury-malibu">Luxury Malibú</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de contrato */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tipoContrato" className="text-right">
              Tipo:
            </Label>
            <Select
              value={formData.tipoContrato}
              onValueChange={(value) => handleInputChange("tipoContrato", value)}
              disabled={!formData.proyecto}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccione tipo de contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lote">Lote</SelectItem>
                {formData.proyecto !== "luxury-malibu" && <SelectItem value="casa">Casa</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          {/* Consecutivo */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="consecutivo" className="text-right">
              Consecutivo:
            </Label>
            <Input
              id="consecutivo"
              value={formData.consecutivo}
              onChange={(e) => handleInputChange("consecutivo", e.target.value)}
              className="col-span-3"
              placeholder="Ej: 001-2024, ARR-001, etc."
            />
          </div>

          {/* Área Construida - Solo para casas */}
          {formData.tipoContrato === "casa" && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="areaConstruida" className="text-right">
                Área Construida
              </Label>
              <Input
                id="areaConstruida"
                type="number"
                value={formData.areaConstruida}
                onChange={(e) => handleInputChange("areaConstruida", e.target.value)}
                className="col-span-3"
                placeholder="Ej: 91"
                min="1"
              />
            </div>
          )}

          {/* Lugar expedición */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lugarExpedicion" className="text-right">
              Lugar Expedición
            </Label>
            <Input
              id="lugarExpedicion"
              value={formData.lugarExpedicion}
              onChange={(e) => handleInputChange("lugarExpedicion", e.target.value)}
              className="col-span-3"
              placeholder="Ej: Bogotá D.C."
            />
          </div>

          {/* Dirección */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="direccion" className="text-right">
              Dirección
            </Label>
            <Input
              id="direccion"
              value={formData.direccion}
              onChange={(e) => handleInputChange("direccion", e.target.value)}
              className="col-span-3"
              placeholder="Ej: Calle 123 #45-67"
            />
          </div>

          {/* Ciudad */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ciudad" className="text-right">
              Ciudad
            </Label>
            <Input
              id="ciudad"
              value={formData.ciudad}
              onChange={(e) => handleInputChange("ciudad", e.target.value)}
              className="col-span-3"
              placeholder="Ej: Bogotá"
            />
          </div>

          {/* Segundo Comprador */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              ¿Segundo Comprador?
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Checkbox
                id="tieneSegundoComprador"
                checked={formData.tieneSegundoComprador}
                onCheckedChange={(checked) => handleInputChange("tieneSegundoComprador", checked)}
              />
              <Label htmlFor="tieneSegundoComprador" className="text-sm font-normal">
                Sí, agregar segundo comprador
              </Label>
            </div>
          </div>

          {/* Campos del Segundo Comprador */}
          {formData.tieneSegundoComprador && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="segundoCompradorNombre" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="segundoCompradorNombre"
                  value={formData.segundoCompradorNombre}
                  onChange={(e) => handleInputChange("segundoCompradorNombre", e.target.value)}
                  className="col-span-3"
                  placeholder="Ej: Juan Pérez García"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="segundoCompradorCedula" className="text-right">
                  Cédula
                </Label>
                <Input
                  id="segundoCompradorCedula"
                  value={formData.segundoCompradorCedula}
                  onChange={(e) => handleInputChange("segundoCompradorCedula", e.target.value)}
                  className="col-span-3"
                  placeholder="Ej: 12.345.678"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={() => handleConfirm()} disabled={!formData.proyecto || !formData.tipoContrato}>
            Generar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
