"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import BusinessSheetModal from "@/app/dashboard/ventas/BusinessSheetModal"

export default function BusinessSheetButton({ saleData, onSuccess, className = "" }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  return (
    <>
      <Button
        onClick={handleOpenModal}
        variant="outline"
        size="sm"
        className={`flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-200 ${className}`}
      >
        <FileText className="h-4 w-4" />
        Hoja de Negocio
      </Button>

      <BusinessSheetModal isOpen={isModalOpen} onClose={handleCloseModal} saleData={saleData} onSuccess={onSuccess} />
    </>
  )
}
