"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import Image from 'next/image';
import axiosInstance from "@/lib/axiosInstance"
import RegisterWithdrawal from "./formdesistimientos"
import AlertModal from "@/components/AlertModal"
import DataTable from "@/components/utils/DataTable"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Filter, Plus, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

function WithdrawalsPage() {
  const TitlePage = "Desistimientos"
  const [withdrawalData, setWithdrawalData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingWithdrawal, setEditingWithdrawal] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesWithdrawal = [
    "ID",
    "Fecha Desistimiento",
    "Penalización",
    "Motivo",
    "Cliente",
    "Documento",
    "Lote",
    "Proyecto",
    "Valor Venta",
    "Recaudo Total",
    "Estado Venta",
  ]

  const showAlert = (type, message, onSuccessCallback = null) => {
    setAlertInfo({
      isOpen: true,
      message,
      type,
      onSuccessCallback,
    })
  }

  const closeAlert = () => {
    const callback = alertInfo.onSuccessCallback
    setAlertInfo({
      isOpen: false,
      message: "",
      type: "success",
      onSuccessCallback: null,
    })
    if (callback) callback()
  }

  // Función para crear badge de estado de ventas (para desistimientos)
  const createSaleStatusBadge = (status) => {
    if (!status) status = "Desistida" // Por defecto en desistimientos

    const statusLower = status.toLowerCase()
    let badgeClass = ""
    let displayText = status

    switch (statusLower) {
      case "active":
      case "activa":
        badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200"
        displayText = "Activa"
        break
      case "desistida":
        badgeClass = "bg-red-100 text-red-800 border-red-200 hover:bg-red-200"
        displayText = "Desistida"
        break
      case "escrituras":
        badgeClass = "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
        displayText = "Escrituras"
        break
      default:
        badgeClass = "bg-gray-100 text-gray-800 border-gray-200"
    }

    return (
      <Badge variant="outline" className={`${badgeClass} font-medium`}>
        {displayText}
      </Badge>
    )
  }

  const getProjectName = (withdrawal) => {
    if (withdrawal.sale?.lot?.project?.name) return withdrawal.sale.lot.project.name
    if (withdrawal.sale?.lot?.Project?.name) return withdrawal.sale.lot.Project.name
    const projectId = withdrawal.sale?.lot?.id_Projects || withdrawal.sale?.lot?.project?.id_Projects
    if (projectId) return `Proyecto #${projectId}`
    return "Sin proyecto"
  }

  async function fetchProjectsForFilter() {
    try {
      const response = await axiosInstance.get("/api/Project/GetAllProjects")
      if (response.data && Array.isArray(response.data)) {
        const allProjects = response.data.map((project) => ({
          id_Projects: project.id_Projects,
          name: project.name,
          status: project.status || "Sin estado",
        }))
        setProjects(allProjects)
      }
    } catch (error) {
      console.error("Error al cargar proyectos para el filtro:", error)
      showAlert("error", "No se pudieron cargar los proyectos para el filtro.")
    }
  }

  async function fetchWithdrawals(projectId = null) {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Withdrawal/GetAllWithdrawals")

      if (response.status === 200) {
        let filteredWithdrawals = response.data

        if (projectId && projectId !== "all") {
          const targetProjectId = Number.parseInt(projectId, 10)
          filteredWithdrawals = response.data.filter((withdrawal) => {
            const withdrawalProjectId =
              withdrawal.sale?.lot?.project?.id_Projects ||
              withdrawal.sale?.lot?.Project?.id_Projects ||
              withdrawal.sale?.lot?.id_Projects
            return withdrawalProjectId === targetProjectId
          })
        }

        const data = filteredWithdrawals.map((withdrawal) => ({
          id: withdrawal.id_Withdrawals,
          withdrawal_date: withdrawal.withdrawal_date
            ? new Date(withdrawal.withdrawal_date).toLocaleDateString("es-CO")
            : "N/A",
          penalty:
            withdrawal.penalty?.toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }) || "N/A",
          reason: withdrawal.reason || "Sin motivo especificado",
          client: withdrawal.sale?.client
            ? `${withdrawal.sale.client.names} ${withdrawal.sale.client.surnames}`
            : "N/A",
          document: withdrawal.sale?.client?.document || "N/A",
          lot: withdrawal.sale?.lot ? `${withdrawal.sale.lot.block}-${withdrawal.sale.lot.lot_number}` : "N/A",
          project: getProjectName(withdrawal),
          sale_value:
            withdrawal.sale?.total_value?.toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }) || "N/A",
          total_raised:
            withdrawal.sale?.total_raised?.toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }) || "N/A",
          sale_status: createSaleStatusBadge(withdrawal.sale?.status || "Desistida"), // ✅ Badge del estado de la venta
          original: withdrawal,
          searchableIdentifier: `${withdrawal.id_Withdrawals} ${withdrawal.sale?.client?.names} ${withdrawal.sale?.client?.surnames} ${withdrawal.sale?.lot?.block}-${withdrawal.sale?.lot?.lot_number} ${getProjectName(withdrawal)} ${withdrawal.reason}`,
        }))

        setWithdrawalData(data)
      }
    } catch (error) {
      console.error("Error al cargar desistimientos:", error)
      setError("No se pudieron cargar los datos de desistimientos.")
      showAlert("error", "No se pudieron cargar los datos de desistimientos.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleProjectFilterChange = (value) => {
    setSelectedProjectId(value)
    fetchWithdrawals(value === "all" ? null : value)
  }

  useEffect(() => {
    fetchProjectsForFilter()
    fetchWithdrawals()
  }, [])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      const response = await axiosInstance.delete(`/api/Withdrawal/DeleteWithdrawal/${numericId}`)
      fetchWithdrawals(selectedProjectId === "all" ? null : selectedProjectId)
      showAlert(
        "success",
        response.data?.message || "Desistimiento eliminado correctamente. La venta ha sido reactivada.",
      )
    } catch (error) {
      console.error("Error al eliminar desistimiento:", error)
      const errorMessage = error.response?.data?.message || "Error al eliminar el desistimiento"
      showAlert("error", errorMessage)
    }
  }

  const handleUpdate = async (row) => {
    try {
      const withdrawalId = row.id
      const response = await axiosInstance.get(`/api/Withdrawal/GetWithdrawalID/${withdrawalId}`)

      if (response.status === 200) {
        setEditingWithdrawal(response.data)
        setIsModalOpen(true)
      } else {
        setEditingWithdrawal(row.original)
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error("Error al obtener datos completos del desistimiento:", error)
      setEditingWithdrawal(row.original)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingWithdrawal(null)
    }, 300)
  }

  // Configuración del header del DataTable
  const headerActions = {
    title: TitlePage,
    button: (
      <div className="flex items-center space-x-3">
        <div className="relative w-full max-w-xs">
          <Label htmlFor="project-filter" className="sr-only">
            Filtrar por Proyecto
          </Label>
          <Select name="project-filter" value={selectedProjectId} onValueChange={handleProjectFilterChange}>
            <SelectTrigger className="w-full">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrar por Proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Proyectos</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id_Projects} value={project.id_Projects.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Desistimiento</span>
        </Button>
      </div>
    ),
  }

  return (
    <PrivateNav>
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
          <div className="flex flex-col items-center">
            <Image
              src="/assets/img/mymsoftcom.png"
              alt="Cargando..."
              width={80}
              height={80}
              className="animate-spin"
            />
            <p className="text-lg text-gray-700 font-semibold mt-2">Cargando desistimientos...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="container mx-auto px-4 sm:px-6 py-6">

          {/* Tabla y filtros responsivos */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="w-full md:w-auto">
              <Label htmlFor="project-filter" className="sr-only">
                Filtrar por Proyecto
              </Label>
              <Select name="project-filter" value={selectedProjectId} onValueChange={handleProjectFilterChange}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar por Proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Proyectos</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id_Projects} value={project.id_Projects.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2 w-full md:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Desistimiento</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <DataTable
              Data={withdrawalData}
              TitlesTable={titlesWithdrawal}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              showDeleteButton={true}
              showToggleButton={false}
              showPdfButton={false}
              headerActions={{ title: TitlePage }} // Ya no se usa botón dentro
            />
          </div>

          {/* Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <RegisterWithdrawal
                  refreshData={() => fetchWithdrawals(selectedProjectId === "all" ? null : selectedProjectId)}
                  withdrawalToEdit={editingWithdrawal}
                  onCancelEdit={handleCloseModal}
                  closeModal={handleCloseModal}
                  showAlert={showAlert}
                />
              </div>
            </div>
          )}
        </div>
      )}


      {error && <div className="text-red-600 text-center mt-4">{error}</div>}

      <AlertModal
        isOpen={alertInfo.isOpen}
        message={alertInfo.message}
        type={alertInfo.type}
        onClose={closeAlert}
        redirectUrl={alertInfo.redirectUrl}
      />
    </PrivateNav>
  )
}

export default WithdrawalsPage
