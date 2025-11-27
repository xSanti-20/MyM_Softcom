"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Database, HardDrive, Calendar, TrendingUp } from "lucide-react"
import { useBackup } from "@/hooks/useBackup"

const BackupStats = ({ refreshTrigger }) => {
  const [stats, setStats] = useState({
    totalBackups: 0,
    totalSize: 0,
    lastBackup: null,
    totalRecords: 0,
  })

  const { getBackupList } = useBackup()

  const loadStats = useCallback(async () => {
    const result = await getBackupList()
    if (result.success) {
      const backups = result.backups
      const totalSize = backups.reduce((sum, backup) => sum + backup.fileSizeMB, 0)
      const totalRecords = backups.reduce((sum, backup) => sum + backup.recordCount, 0)
      const lastBackup = backups.length > 0 ? backups[0] : null

      setStats({
        totalBackups: backups.length,
        totalSize: totalSize,
        lastBackup: lastBackup,
        totalRecords: totalRecords,
      })
    }
  }, [getBackupList])

  useEffect(() => {
    loadStats()
  }, [refreshTrigger])

  const formatDate = (dateString) => {
    if (!dateString) return "Nunca"
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Backups</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBackups}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <HardDrive className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Espacio Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSize.toFixed(3)} MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Último Backup</p>
              <p className="text-2xl font-bold text-gray-900">{formatDate(stats.lastBackup?.createdDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Registros</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRecords.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default BackupStats
