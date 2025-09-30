"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Loader2, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react"
import { useBackup } from "@/hooks/useBackup"

const RestoreBackup = ({ onBackupRestored }) => {
  const [selectedBackup, setSelectedBackup] = useState("")
  const [backups, setBackups] = useState([])
  const [restoreOptions, setRestoreOptions] = useState({
    overwriteExisting: false,
    validateData: true,
    createBackupBeforeRestore: true,
  })

  const { getBackupList, restoreBackup, uploadBackup, loading, error, success } = useBackup()

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  const loadBackups = useCallback(async () => {
    const result = await getBackupList()
    if (result.success) {
      setBackups(result.backups.filter((b) => b.status === "Completed"))
    }
  }, [getBackupList])

  const handleRestore = async () => {
    if (!selectedBackup) {
      alert("Por favor selecciona un backup para restaurar")
      return
    }

    const confirmMessage = restoreOptions.overwriteExisting
      ? "⚠️ ADVERTENCIA: Esto SOBRESCRIBIRÁ todos los datos existentes. ¿Estás seguro?"
      : "¿Estás seguro de que quieres restaurar este backup?"

    if (window.confirm(confirmMessage)) {
      const result = await restoreBackup({
        backupFileName: selectedBackup,
        restoredBy: "Usuario",
        ...restoreOptions,
      })

      if (result.success) {
        setSelectedBackup("")
        onBackupRestored?.()
      }
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (file) {
      const result = await uploadBackup(file)
      if (result.success) {
        loadBackups()
      }
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Selección de backup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seleccionar Backup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="backup-select">Backup disponible</Label>
              <Select value={selectedBackup} onValueChange={setSelectedBackup}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un backup..." />
                </SelectTrigger>
                <SelectContent>
                  {backups.map((backup) => (
                    <SelectItem key={backup.fileName} value={backup.fileName}>
                      <div className="flex flex-col">
                        <span className="font-medium">{backup.fileName}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(backup.createdDate).toLocaleString()} - {backup.fileSizeMB} MB
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <Label htmlFor="file-upload" className="block mb-2">
                O subir nuevo backup
              </Label>
              <input
                id="file-upload"
                type="file"
                accept=".zip"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </CardContent>
        </Card>

        {/* Opciones de restauración */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Opciones de Restauración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="createBackup"
                  checked={restoreOptions.createBackupBeforeRestore}
                  onCheckedChange={(checked) =>
                    setRestoreOptions((prev) => ({ ...prev, createBackupBeforeRestore: checked }))
                  }
                />
                <div>
                  <Label htmlFor="createBackup" className="font-medium text-green-700">
                    Crear backup antes de restaurar (Recomendado)
                  </Label>
                  <p className="text-sm text-gray-500">
                    Crea una copia de seguridad de los datos actuales antes de restaurar
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="validateData"
                  checked={restoreOptions.validateData}
                  onCheckedChange={(checked) => setRestoreOptions((prev) => ({ ...prev, validateData: checked }))}
                />
                <div>
                  <Label htmlFor="validateData" className="font-medium">
                    Validar datos antes de restaurar
                  </Label>
                  <p className="text-sm text-gray-500">Verifica la integridad de los datos antes de proceder</p>
                </div>
              </div> 

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="overwrite"
                  checked={restoreOptions.overwriteExisting}
                  onCheckedChange={(checked) => setRestoreOptions((prev) => ({ ...prev, overwriteExisting: checked }))}
                />
                <div>
                  <Label htmlFor="overwrite" className="font-medium text-red-700">
                    Sobrescribir datos existentes
                  </Label>
                  <p className="text-sm text-gray-500">⚠️ PELIGROSO: Elimina todos los datos actuales y los reemplaza</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advertencia */}
      {restoreOptions.overwriteExisting && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>¡ADVERTENCIA!</strong> Has seleccionado sobrescribir datos existentes. Esta acción eliminará
            permanentemente todos los datos actuales y los reemplazará con los del backup seleccionado. Asegúrate de
            tener una copia de seguridad reciente.
          </AlertDescription>
        </Alert>
      )}

      {/* Botón de restaurar */}
      <div className="flex justify-center">
        <Button
          onClick={handleRestore}
          disabled={loading || !selectedBackup}
          className="px-8 py-2"
          size="lg"
          variant={restoreOptions.overwriteExisting ? "destructive" : "default"}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Restaurando...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Restaurar Backup
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default RestoreBackup
