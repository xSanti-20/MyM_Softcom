"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import { Button } from "../ui/button"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useMobile } from "@/hooks/use-mobile"

function ModalDialog({ TitlePage, FormPage, isOpen, setIsOpen }) {
  const [localIsOpen, setLocalIsOpen] = useState(false)
  const { isMobile } = useMobile() // Detecta si es pantalla móvil

  const open = isOpen !== undefined ? isOpen : localIsOpen
  const setOpen = setIsOpen || setLocalIsOpen

  const isEditing = FormPage && FormPage().props && FormPage().props.pigletToEdit

  const handleOpenForCreate = () => {
    if (FormPage && FormPage().props && FormPage().props.onCancelEdit) {
      FormPage().props.onCancelEdit()
    }
    setOpen(true)
  }

  return (
    <>
      <Button onClick={handleOpenForCreate} className="w-full sm:w-auto">
        <span className="hidden sm:inline">Agregar {TitlePage}</span>
        <span className="sm:hidden">+ {TitlePage}</span>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(newOpen) => {
          setOpen(newOpen)
          if (!newOpen && FormPage?.().props?.onCancelEdit) {
            FormPage().props.onCancelEdit()
          }
        }}
      >
        <DialogContent
          className={`overflow-y-auto rounded-xl shadow-xl transition-all duration-300 ${isMobile
              ? "w-[90vw] h-auto max-h-[80vh] p-4"
              : "w-[60vw] max-w-3xl max-h-[80vh] p-6"
            }`}
        >


          <DialogHeader>
            <VisuallyHidden>
              <DialogTitle>{isEditing ? `Editar ${TitlePage}` : `Agregar ${TitlePage}`}</DialogTitle>
            </VisuallyHidden>
          </DialogHeader>

          <div className="overflow-x-auto py-2">{FormPage && FormPage()}</div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ModalDialog
