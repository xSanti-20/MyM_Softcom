"use client"

import { useState, useEffect } from "react"
import { columns } from "./columns"
import { DataTable } from "./data-table"
import axiosInstance from "@/lib/axiosInstance"
import { useMobile } from "@/hooks/use-mobile"
import { MobileList } from "./MobileList"
// Importar componentes de shadcn/ui para el diálogo
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

export default function UserManagement() {
  const { isMobile } = useMobile()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUserRole, setCurrentUserRole] = useState(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false) // Estado para controlar el diálogo
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null) // Estado para el usuario seleccionado

  useEffect(() => {
    const role = localStorage.getItem("role")
    setCurrentUserRole(role)
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get("api/User/ConsultAllUser")
      const users = response.data.map((user) => ({
        id: user.id_Users,
        name: user.nom_Users,
        email: user.email,
        role: user.tip_Users,
        lastActive: user.ultimaVez,
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

  useEffect(() => {
    fetchUsers()
  }, [])

  const toggleUserStatus = async (userId) => {
    const user = data.find((u) => u.id === userId)
    const newStatus = user.status === "Activo" ? "Inactivo" : "Activo"

    setData((prevData) => prevData.map((user) => (user.id === userId ? { ...user, status: newStatus } : user)))

    try {
      await axiosInstance.put(`api/User/status/${userId}`, JSON.stringify(newStatus))
    } catch (error) {
      if (error.response && error.response.status === 400) {
        alert(error.response.data.message || "Error 400: Bad Request")
      } else {
        alert("Error desconocido al actualizar estado")
      }
      setData((prevData) =>
        prevData.map((user) =>
          user.id === userId ? { ...user, status: user.status === "Activo" ? "Inactivo" : "Activo" } : user,
        ),
      )
    }
  }

  const handleDeleteUser = async (userId) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este usuario? Esta acción es irreversible.")) {
      try {
        // CAMBIO AQUÍ: Enviar el ID como parámetro de consulta para DELETE
        const response = await axiosInstance.delete("api/User/DeleteUser", {
          params: { id_Users: userId },
        })
        if (response.status === 200) {
          // Asumiendo un 200 OK para éxito
          alert("Usuario eliminado exitosamente.")
          fetchUsers() // Recargar la lista de usuarios
        } else {
          // Manejar otros códigos de estado si el backend los envía
          alert(`Error al eliminar usuario: ${response.data?.message || "Respuesta inesperada del servidor."}`)
        }
      } catch (error) {
        if (error.response && error.response.data && error.response.data.message) {
          alert(`Error al eliminar usuario: ${error.response.data.message}`)
        } else if (error.response && error.response.status) {
          alert(`Error al eliminar usuario: Request failed with status code ${error.response.status}`)
        } else {
          alert("Error al eliminar usuario: No se pudo conectar con el servidor.")
        }
        console.error("Error al eliminar usuario:", error)
      }
    }
  }

  const handleViewDetails = async (userId) => {
    try {
      // Ya configurado para enviar el ID como parámetro de consulta
      const response = await axiosInstance.get("api/User/GetUserId", {
        params: { id_Users: userId },
      })
      setSelectedUserForDetails(response.data) // Guarda los detalles del usuario
      setIsDetailsDialogOpen(true) // Abre el diálogo
    } catch (error) {
      alert("Error al cargar los detalles del usuario.")
      console.error("Error al cargar detalles:", error)
    }
  }

  if (loading) return <div>Cargando usuarios...</div>
  if (error) return <div>{error}</div>

  return (
    <div className="space-y-4">
      {isMobile ? (
        <MobileList
          data={data}
          toggleStatus={toggleUserStatus}
          currentUserRole={currentUserRole}
          // No se pasan handleDeleteUser ni handleViewDetails a MobileList ya que el menú desplegable no está allí
        />
      ) : (
        <div className="overflow-x-auto">
          <DataTable
            columns={columns(toggleUserStatus, currentUserRole, handleDeleteUser, handleViewDetails)}
            data={data}
          />
        </div>
      )}

      {/* Diálogo para mostrar detalles del usuario */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Detalles del Usuario</DialogTitle>
            <DialogDescription>Información completa del usuario seleccionado.</DialogDescription>
          </DialogHeader>
          {selectedUserForDetails ? (
            <div className="grid gap-4 py-4">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold">ID:</TableCell>
                    <TableCell>{selectedUserForDetails.id_Users}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">Nombre:</TableCell>
                    <TableCell>{selectedUserForDetails.nom_Users}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">Email:</TableCell>
                    <TableCell>{selectedUserForDetails.email}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">Rol:</TableCell>
                    <TableCell>{selectedUserForDetails.tip_Users}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">Estado:</TableCell>
                    <TableCell>{selectedUserForDetails.status}</TableCell>
                  </TableRow>
                  {/* Puedes añadir más campos aquí según la estructura de tu respuesta de GetUserIdAttachment */}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div>Cargando detalles...</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
