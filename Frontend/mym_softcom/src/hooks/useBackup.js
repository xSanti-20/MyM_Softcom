"use client"

import { useState } from "react"
import axiosInstance from "@/lib/axiosInstance"

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
      const response = await axiosInstance.post("/Backup/create", backupData)
      return response.data
    })
  }

  const getBackupList = async () => {
    return handleRequest(async () => {
      const response = await axiosInstance.get("/Backup/list")
      const result = response.data

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
      const response = await axiosInstance.get(`/Backup/download/${fileName}`, {
        responseType: "blob",
      })

      const blob = response.data
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
      const response = await axiosInstance.delete(`/Backup/delete/${fileName}`)
      return response.data
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

      const response = await axiosInstance.post("/Backup/restore", mappedData)
      return response.data
    })
  }

  const uploadBackup = async (file) => {
    return handleRequest(async () => {
      const formData = new FormData()
      formData.append("file", file)

      const response = await axiosInstance.post("/Backup/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      return response.data
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
