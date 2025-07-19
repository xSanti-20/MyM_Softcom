"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

export function MobileList({ data, toggleStatus, currentUserRole }) {
  return (
    <div className="space-y-4">
      {data.map((user) => {
        const isTargetAdmin = user.role.toLowerCase() === "administrador"
        const isViewerAdmin = currentUserRole?.toLowerCase() === "administrador"
        const disableSwitch = isTargetAdmin

        return (
          <Card key={user.id} className="p-4 shadow rounded-xl border space-y-2">
            <p>
              <span className="font-semibold">Nombre:</span> {user.name}
            </p>
            <p>
              <span className="font-semibold">Correo:</span> {user.email}
            </p>
            <p>
              <span className="font-semibold">Rol:</span> {user.role}
            </p>
            <p>
              <span className="font-semibold">Última actividad:</span> {user.lastActive}
            </p>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Estado:</span>
              <Badge
                variant={user.status === "Activo" ? "default" : "secondary"}
                className={user.status === "Activo" ? "bg-green-500" : "bg-gray-500"}
              >
                {user.status}
              </Badge>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">Cambiar estado</span>
              <Switch
                checked={user.status === "Activo"}
                onCheckedChange={() => toggleStatus(user.id)}
                disabled={disableSwitch}
                className={disableSwitch ? "opacity-50 cursor-not-allowed" : ""}
              />
            </div>
          </Card>
        )
      })}
    </div>
  )
}
