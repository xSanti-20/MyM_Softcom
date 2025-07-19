"use client"
import { useEffect, useState } from "react"
import NavPrivada from "@/components/nav/PrivateNav"
import UserManagement from "./user-management"

export default function Home() {
  const [role, setRole] = useState("")

  useEffect(() => {
    const storedRole = localStorage.getItem("role")
    setRole(storedRole || "")
  }, [])

  if (role !== "Administrador") {
    return <div>No tienes permisos para ver esta página</div>
  }
  return (
    <NavPrivada>
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">Gestión de Usuarios</h1>
        <UserManagement />
      </div>
    </NavPrivada>
  )
}
