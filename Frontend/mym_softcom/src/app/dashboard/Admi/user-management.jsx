"use client"

import { useState, useEffect } from "react"
import { columns } from "./columns"
import { DataTable } from "./data-table"
import axiosInstance from "@/lib/axiosInstance"
import { useMobile } from "@/hooks/use-mobile"
import { MobileList } from "./MobileList"

export default function UserManagement() {
  const {isMobile} = useMobile()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUserRole, setCurrentUserRole] = useState(null) // <-- nuevo estado
  useEffect(() => {
    // Obtenemos el rol del usuario desde localStorage (solo en cliente)
    const role = localStorage.getItem("role")
    setCurrentUserRole(role)
  }, [])
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axiosInstance.get("api/User/ConsultAllUser")
        console.log(response.data)
        // Mapeamos la respuesta para que coincida con lo que espera la tabla
        const users = response.data.map((user) => ({
          id: user.id_Users,
          name: user.nom_Users,
          email: user.email,
          role: user.tip_Users,
          lastActive: user.ultimaVez,
          // Normalizamos el status a minúsculas para el estado local (activo/inactivo)
          status: user.status.toLowerCase() === "activo" ? "Activo" : "Inactivo",
        }))
        setData(users)
      } catch (err) {
        setError("Error al cargar usuarios")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  // const currentUserRole = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const toggleUserStatus = async (userId) => {
    const user = data.find(u => u.id === userId)
    const newStatus = user.status === "Activo" ? "Inactivo" : "Activo"

    // Actualizar UI optimista
    setData((prevData) =>
      prevData.map(user =>
        user.id === userId ? { ...user, status: newStatus } : user
      )
    )

    try {
      // Aquí enviamos el string JSON (con comillas)
      const res = await axiosInstance.put(`api/User/status/${userId}`, JSON.stringify(newStatus))
      // if (res.status == 400)
      //   {
      //     alert(res.data.message)
      //   }

    } catch (error) {
      if (error.response && error.response.status === 400) {
        // Mostrar mensaje del backend cuando hay error 400
        alert(error.response.data.message || "Error 400: Bad Request")
      } else {
        // Otros errores
        // console.error("Error actualizando estado:", error)
        alert("Error desconocido al actualizar estado")
      }
      // console.error("Error actualizando estado:", error)
      // Revertir cambio si falla
      setData((prevData) =>
        prevData.map(user =>
          user.id === userId ? { ...user, status: user.status === "Activo" ? "Inactivo" : "Activo" } : user
        )
      )
    }
  }


  if (loading) return <div>Cargando usuarios...</div>
  if (error) return <div>{error}</div>



  return (
    <div className="space-y-4">
      {isMobile ? (
        <MobileList data={data} toggleStatus={toggleUserStatus} currentUserRole={currentUserRole} />
      ) : (
        <div className="overflow-x-auto">
          <DataTable columns={columns(toggleUserStatus, currentUserRole)} data={data} />
        </div>
      )}
    </div>
  )
}
