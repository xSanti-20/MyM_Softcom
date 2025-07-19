"use client"

import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Actualizamos la firma para aceptar las nuevas funciones
export const columns = (toggleStatus, currentUserRole, handleDeleteUser, handleViewDetails) => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Rol",
  },
  {
    accessorKey: "lastActive",
    header: "Última actividad",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status")
      return (
        <Badge
          variant={status === "Activo" ? "default" : "secondary"}
          className={status === "Activo" ? "bg-green-500" : "bg-gray-500"}
        >
          {status}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original
      const isTargetAdmin = user.role.toLowerCase() === "administrador"
      const isViewerAdmin = currentUserRole?.toLowerCase() === "administrador" // Usar optional chaining por si currentUserRole es null al inicio

      // Si el usuario objetivo es un administrador, el switch está deshabilitado
      const disableSwitch = isTargetAdmin

      return (
        <div className="flex items-center justify-end gap-2">
          <Switch
            checked={user.status === "Activo"}
            onCheckedChange={() => toggleStatus(user.id)}
            aria-label="Toggle user status"
            disabled={disableSwitch}
            className={disableSwitch ? "opacity-50 cursor-not-allowed" : ""}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>Copiar ID</DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Asignamos la función handleViewDetails al onClick */}
              <DropdownMenuItem onClick={() => handleViewDetails(user.id)}>Ver detalles</DropdownMenuItem>
              {/* Asignamos la función handleDeleteUser al onClick */}
              <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteUser(user.id)}>
                Eliminar usuario
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]
