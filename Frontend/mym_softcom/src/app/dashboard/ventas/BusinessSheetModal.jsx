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

export function BusinessSheetModal({ isOpen, onClose, onConfirm, saleData }) {
  const [formData, setFormData] = useState({
    lugarExpedicion: "",
    direccion: "",
    ciudad: "",
    proyecto: "",
    tipoContrato: "",
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!formData.proyecto || !formData.tipoContrato}>
            Generar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
