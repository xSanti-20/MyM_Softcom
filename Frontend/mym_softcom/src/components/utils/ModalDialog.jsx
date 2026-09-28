"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import { Button } from "../ui/button"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useMobile } from "@/hooks/use-mobile"
import { Plus } from "lucide-react"

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
      <Button 
        onClick={handleOpenForCreate} 
        className="w-full sm:w-auto font-semibold gap-2"
      >
        <Plus className="w-5 h-5" />
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
          className={`overflow-y-auto rounded-xl shadow-2xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 ${
            isMobile
              ? "w-[90vw] h-auto max-h-[85vh] p-4 md:p-6"
              : "w-[85vw] lg:w-[60vw] max-w-4xl max-h-[85vh] p-6 md:p-8"
          }`}
        >
          <DialogHeader className="border-b-0 pb-0">
            <VisuallyHidden>
              <DialogTitle>{isEditing ? `Editar ${TitlePage}` : `Agregar ${TitlePage}`}</DialogTitle>
            </VisuallyHidden>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-7 bg-gradient-to-b from-pink-500 to-rose-600 rounded-full"></div>
              <DialogTitle className="text-2xl font-bold">
                {isEditing ? `✏️ Editar ${TitlePage}` : `➕ Nuevo ${TitlePage}`}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="overflow-x-auto py-4">{FormPage && FormPage()}</div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ModalDialog
