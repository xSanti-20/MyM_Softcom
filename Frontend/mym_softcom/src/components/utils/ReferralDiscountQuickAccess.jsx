"use client"

import { useState } from "react"
import Link from "next/link"
import ReferralDiscountModal from "@/components/utils/ReferralDiscountModal"
import { Button } from "@/components/ui/button"
import { Gift } from "lucide-react"

/**
 * Componente Acceso Rápido para Descuentos por Referidos
 * 
 * USAGE:
 * 
 * En tu navegación o navbar, importa e incluye:
 * import ReferralDiscountQuickAccess from "@/components/utils/ReferralDiscountQuickAccess"
 * 
 * <ReferralDiscountQuickAccess showAlert={showAlert} />
 */

function ReferralDiscountQuickAccess({ showAlert = null }) {
  const [showModal, setShowModal] = useState(false)

  const handleSuccess = () => {
    if (showAlert) {
      showAlert("success", "Éxito", "Descuento registrado correctamente")
    }
  }

  return (
    <>
      <div className="flex gap-2">
        {/* Botón de Acceso Rápido */}
        <Button
          onClick={() => setShowModal(true)}
          variant="outline"
          size="sm"
          className="gap-2 hover:bg-blue-50 border-blue-200"
        >
          <Gift className="w-4 h-4 text-blue-600" />
          <span className="hidden sm:inline">Nuevo Referido</span>
        </Button>

        {/* Link a la página de gestión */}
        <Link href="/dashboard/referidos">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 hover:bg-blue-50 border-blue-200"
          >
            <Gift className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Ver Referidos</span>
          </Button>
        </Link>
      </div>

      {/* Modal */}
      <ReferralDiscountModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
        showAlert={showAlert || (() => {})}
      />
    </>
  )
}

export default ReferralDiscountQuickAccess
