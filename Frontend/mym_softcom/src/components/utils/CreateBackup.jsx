"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { useBackup } from "@/hooks/useBackup"

const CreateBackup = ({ onBackupCreated }) => {
  const [formData, setFormData] = useState({
    description: "",
    createdBy: "",
  })

  const { createBackup, loading, error, success } = useBackup()

  const handleSubmit = async (e) => {
    e.preventDefault()

    const backupData = {
      description: formData.description || `Backup ${new Date().toLocaleDateString()}`,
      createdBy: formData.createdBy || "Usuario",
    }

    const result = await createBackup(backupData)

    if (result.success) {
      setFormData({ description: "", createdBy: "" })
      onBackupCreated?.()
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-lg">Información del Backup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Ej: Backup diario, Backup antes de actualización..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                required
              />
            </div>

            <div>
              <Label htmlFor="createdBy">Creado por</Label>
              <Input
                id="createdBy"
                placeholder="Tu nombre"
                value={formData.createdBy}
                onChange={(e) => setFormData((prev) => ({ ...prev, createdBy: e.target.value }))}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Botón de crear */}
        <div className="flex justify-center">
          <Button type="submit" disabled={loading} className="px-8 py-2" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando Backup Completo...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Crear Backup Completo
              </>
            )}
          </Button>
        </div>
      </form>

      <div className="text-center text-sm text-gray-500">
        <p>Se respaldarán todas las tablas y Datos</p>
      </div>
    </div>
  )
}

export default CreateBackup
