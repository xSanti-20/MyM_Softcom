"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PrivateNav from "@/components/nav/PrivateNav"
import { Database, Download, Upload, History, Shield } from "lucide-react"
import CreateBackup from "@/components/utils/CreateBackup"
import BackupList from "@/components/utils/BackupList"
import RestoreBackup from "@/components/utils/RestoreBackup"
import BackupStats from "@/components/utils/BackupStats"

const BackupPage = () => {
  const [activeTab, setActiveTab] = useState("create")
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <PrivateNav>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sistema de Backup</h1>
              <p className="text-gray-600">Gestiona copias de seguridad de tu base de datos</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <BackupStats refreshTrigger={refreshTrigger} />

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Gestión de Backups</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="create" className="flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Crear Backup</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center space-x-2">
                  <History className="h-4 w-4" />
                  <span>Historial</span>
                </TabsTrigger>
                <TabsTrigger value="restore" className="flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>Restaurar</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="mt-6">
                <CreateBackup onBackupCreated={handleRefresh} />
              </TabsContent>

              <TabsContent value="list" className="mt-6">
                <BackupList refreshTrigger={refreshTrigger} onBackupDeleted={handleRefresh} />
              </TabsContent>

              <TabsContent value="restore" className="mt-6">
                <RestoreBackup onBackupRestored={handleRefresh} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PrivateNav>
  )
}

export default BackupPage
