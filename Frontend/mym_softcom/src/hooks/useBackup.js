"use client"

import { useState } from "react"

const API_BASE_URL = "http://192.168.1.27:5000/api" 

export const useBackup = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 B"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const handleRequest = async (requestFn) => {
    setLoading(true)
    clearMessages()

    try {
      const result = await requestFn()
      if (result.success) {
        setSuccess(result.message)
      } else {
        setError(result.message)
      }
      return result
    } catch (err) {
      const errorMessage = err.message || "Error de conexión"
      setError(errorMessage)
      return { success: false, message: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token")
    const headers = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }

  const createBackup = async (backupData) => {
    return handleRequest(async () => {
      const response = await fetch(`${API_BASE_URL}/Backup/create`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(backupData),
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    })
  }

  const getBackupList = async () => {
    return handleRequest(async () => {
      const response = await fetch(`${API_BASE_URL}/Backup/list`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success && result.backups) {
        result.backups = result.backups.map((backup) => ({
          ...backup,
          formattedFileSize: formatFileSize(backup.fileSizeBytes),
        }))
      }

      return result
    })
  }

  const downloadBackup = async (fileName) => {
    return handleRequest(async () => {
      const response = await fetch(`${API_BASE_URL}/Backup/download/${fileName}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
      })

      // Crear blob y descargar
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      return { success: true, message: "Archivo descargado exitosamente" }
    })
  }

  const deleteBackup = async (fileName) => {
    return handleRequest(async () => {
      const response = await fetch(`${API_BASE_URL}/Backup/delete/${fileName}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    })
  }

  const restoreBackup = async (restoreData) => {
    return handleRequest(async () => {
      const mappedData = {
        BackupFileName: restoreData.backupFileName,
        RestoredBy: restoreData.restoredBy,
        OverwriteExisting: restoreData.overwriteExisting,
        ValidateData: restoreData.validateData,
        CreateBackupBeforeRestore: restoreData.createBackupBeforeRestore,
        TablesToRestore: restoreData.tablesToRestore || [],
      }

      const response = await fetch(`${API_BASE_URL}/Backup/restore`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(mappedData),
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    })
  }

  const uploadBackup = async (file) => {
    return handleRequest(async () => {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${API_BASE_URL}/Backup/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    })
  }

  return {
    createBackup,
    getBackupList,
    downloadBackup,
    deleteBackup,
    restoreBackup,
    uploadBackup,
    loading,
    error,
    success,
    clearMessages,
    formatFileSize, // Export the utility function
  }
}
