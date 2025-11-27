"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Trash2, Calendar, User, HardDrive, Database, AlertCircle, Loader2 } from "lucide-react"
import { useBackup } from "@/hooks/useBackup"

const BackupList = ({ refreshTrigger, onBackupDeleted }) => {
  const [backups, setBackups] = useState([])
  const { getBackupList, downloadBackup, deleteBackup, loading, error } = useBackup()

  const loadBackups = useCallback(async () => {
    const result = await getBackupList()
    if (result.success) {
      setBackups(result.backups)
    }
  }, [getBackupList])

  useEffect(() => {
    loadBackups()
  }, [refreshTrigger])

  const handleDownload = async (fileName) => {
    await downloadBackup(fileName)
  }

  const handleDelete = async (fileName) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este backup?")) {
      const result = await deleteBackup(fileName)
      if (result.success) {
        loadBackups()
        onBackupDeleted?.()
      }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status) => {
    const variants = {
      Completed: "default",
      Corrupted: "destructive",
      Unknown: "secondary",
    }

    const labels = {
      Completed: "Completado",
      Corrupted: "Corrupto",
      Unknown: "Desconocido",
    }

    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Cargando backups...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {backups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay backups disponibles</h3>
            <p className="text-gray-500">Crea tu primer backup para comenzar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {backups.map((backup) => (
            <Card key={backup.fileName} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-900">{backup.fileName}</h3>
                      {getStatusBadge(backup.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(backup.createdDate)}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{backup.createdBy}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <HardDrive className="h-4 w-4" />
                        <span>{backup.fileSizeMB} MB</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Database className="h-4 w-4" />
                        <span>{backup.recordCount.toLocaleString()} registros</span>
                      </div>
                    </div>

                    {backup.description && <p className="text-sm text-gray-500 mt-2">{backup.description}</p>}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(backup.fileName)}
                      disabled={backup.status === "Corrupted"}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Descargar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(backup.fileName)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default BackupList
