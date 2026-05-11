"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function EditTransfer({ isOpen, transfer, onClose, onSuccess }) {
  const [accountingNote, setAccountingNote] = useState(transfer?.accounting_note || "")
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      // Aquí se llamará onSuccess que debe manejar la API desde el componente padre
      onSuccess({
        idTransfer: transfer.id_Transfers,
        accountingNote,
      })
    } catch (error) {
      console.error("Error:", error)
      setErrors({ submit: "Error al actualizar el traslado" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Nota Contable</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Traslado ID: {transfer?.id_Transfers}</Label>
            <p className="text-sm text-gray-600">
              Monto: {new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                minimumFractionDigits: 0,
              }).format(transfer?.amount_transferred || 0)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountingNote">Nota Contable</Label>
            <Textarea
              id="accountingNote"
              placeholder="Ingrese la nota contable (opcional)"
              value={accountingNote}
              onChange={(e) => setAccountingNote(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {errors.submit && (
            <p className="text-red-500 text-sm">{errors.submit}</p>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isLoading ? "Actualizando..." : "Actualizar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
