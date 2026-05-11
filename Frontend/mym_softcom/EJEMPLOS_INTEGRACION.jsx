// EJEMPLO 1: Integrar en tu PrivateNav.jsx
// ============================================

import ReferralDiscountQuickAccess from "@/components/utils/ReferralDiscountQuickAccess"

function PrivateNav({ showAlert }) {
  return (
    <nav className="navbar">
      {/* ... tu código existente ... */}
      
      {/* Agregar en la sección de acciones rápidas */}
      <div className="navbar-actions">
        <ReferralDiscountQuickAccess showAlert={showAlert} />
      </div>
      
      {/* ... más código ... */}
    </nav>
  )
}


// EJEMPLO 2: Integrar en tu página Dashboard
// ============================================

"use client"

import { useState } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import ReferralDiscountQuickAccess from "@/components/utils/ReferralDiscountQuickAccess"
import { AlertModal } from "@/components/AlertModal"

function Dashboard() {
  const [alertConfig, setAlertConfig] = useState({
    show: false,
    type: "info",
    title: "",
    message: "",
  })

  const showAlert = (type, title, message = "") => {
    setAlertConfig({
      show: true,
      type,
      title,
      message,
    })
  }

  const closeAlert = () => {
    setAlertConfig({ ...alertConfig, show: false })
  }

  return (
    <div>
      {/* Navbar con acceso rápido */}
      <PrivateNav showAlert={showAlert} />

      {/* O de forma independiente en cualquier lugar */}
      <div className="p-4">
        <ReferralDiscountQuickAccess showAlert={showAlert} />
      </div>

      {/* ... resto del contenido ... */}

      <AlertModal
        isOpen={alertConfig.show}
        onClose={closeAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  )
}

export default Dashboard


// EJEMPLO 3: Integrar como Card en Dashboard
// ============================================

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Gift, Plus } from "lucide-react"

function ReferralCard({ onNewClick }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-blue-600" />
            <CardTitle>Descuentos por Referidos</CardTitle>
          </div>
        </div>
        <CardDescription>
          Gestiona los descuentos por clientes referidos
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-3">
        <p className="text-sm text-gray-600">
          Registra descuentos cuando un cliente trae un nuevo cliente.
          Elige si aplicar el descuento a la cartera o a la próxima cuota.
        </p>
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onNewClick}
            size="sm"
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nuevo Descuento
          </Button>
          <Link href="/dashboard/referidos">
            <Button variant="outline" size="sm">
              Ver Todos
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}


// EJEMPLO 4: Integrar como botón flotante (FAB)
// ===============================================

"use client"

import { useState } from "react"
import ReferralDiscountModal from "@/components/utils/ReferralDiscountModal"
import { Button } from "@/components/ui/button"
import { Gift } from "lucide-react"

function FloatingReferralButton({ showAlert }) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      {/* Botón flotante */}
      <Button
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-8 rounded-full h-14 w-14 shadow-lg gap-2 bg-blue-600 hover:bg-blue-700 z-40"
        title="Nuevo descuento por referido"
      >
        <Gift className="w-6 h-6" />
      </Button>

      {/* Modal */}
      <ReferralDiscountModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          showAlert("success", "Descuento registrado")
        }}
        showAlert={showAlert}
      />
    </>
  )
}

export default FloatingReferralButton


// EJEMPLO 5: Mega Menú Lateral en Nav
// ====================================

import ReferralDiscountQuickAccess from "@/components/utils/ReferralDiscountQuickAccess"

function NavMenu({ showAlert }) {
  return (
    <nav className="space-y-2">
      {/* ... items del menú ... */}
      
      <hr className="my-4" />
      
      <div className="px-4 py-3 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Operaciones Rápidas</h3>
        <ReferralDiscountQuickAccess showAlert={showAlert} />
      </div>
    </nav>
  )
}
