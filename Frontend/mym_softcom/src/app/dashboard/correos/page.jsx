"use client"

import NavPrivada from "@/components/nav/PrivateNav"
import OverdueEmailsButton from "./OverdueEmailsButton"

export default function CorreosPage() {
  return (
    <NavPrivada>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Correos</h1>
          <p className="text-gray-600">Administra y envía notificaciones por correo electrónico a clientes con mora</p>
        </div>
        
        <OverdueEmailsButton />
      </div>
    </NavPrivada>
  )
}
