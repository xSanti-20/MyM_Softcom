"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import ContentPage from "@/components/utils/ContentPage"
import axiosInstance from "@/lib/axiosInstance"
import RegisterWithdrawal from "./formdesistimientos"
import AlertModal from "@/components/AlertModal"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Filter, AlertTriangle } from "lucide-react"

function WithdrawalsPage() {
  const TitlePage = "Desistimientos"
  const [withdrawalData, setWithdrawalData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingWithdrawal, setEditingWithdrawal] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const [projects, setProjects] = useState([]) // Para el filtro de proyectos
  const [selectedProjectId, setSelectedProjectId] = useState("") // ID del proyecto seleccionado para filtrar

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

  // Función auxiliar para obtener el nombre del proyecto
  const getProjectName = (withdrawal) => {
    if (withdrawal.sale?.lot?.project?.name) {
      return withdrawal.sale.lot.project.name
    }
    if (withdrawal.sale?.lot?.Project?.name) {
      return withdrawal.sale.lot.Project.name
    }
    const projectId = withdrawal.sale?.lot?.id_Projects || withdrawal.sale?.lot?.project?.id_Projects
    if (projectId) {
      return `Proyecto #${projectId}`
    }
    return "Sin proyecto"
  }

  // Función para cargar todos los proyectos para el filtro
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

  // Función para cargar desistimientos, con o sin filtro de proyecto
  async function fetchWithdrawals(projectId = null) {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Withdrawal/GetAllWithdrawals")

      if (response.status === 200) {
        console.log("Total de desistimientos recibidos:", response.data.length)

        let filteredWithdrawals = response.data

        // Aplicar filtro de proyecto si se seleccionó uno
        if (projectId && projectId !== "all") {
          const targetProjectId = Number.parseInt(projectId, 10)
          console.log("Filtrando por proyecto ID:", targetProjectId)

          filteredWithdrawals = response.data.filter((withdrawal) => {
            const withdrawalProjectId =
              withdrawal.sale?.lot?.project?.id_Projects ||
              withdrawal.sale?.lot?.Project?.id_Projects ||
              withdrawal.sale?.lot?.id_Projects

            return withdrawalProjectId === targetProjectId
          })

          console.log("Desistimientos filtrados:", filteredWithdrawals.length)
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

          sale_status: withdrawal.sale?.status || "N/A",

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

  // Manejar cambio en el filtro de proyecto
  const handleProjectFilterChange = (value) => {
    setSelectedProjectId(value)
    fetchWithdrawals(value === "all" ? null : value)
  }

  useEffect(() => {
    fetchProjectsForFilter()
    fetchWithdrawals() // Cargar todos los desistimientos inicialmente
  }, [])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      const response = await axiosInstance.delete(`/api/Withdrawal/DeleteWithdrawal/${numericId}`)
      fetchWithdrawals(selectedProjectId === "all" ? null : selectedProjectId) // Refrescar con el filtro actual
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

  return (
    <PrivateNav>
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
          <div className="flex flex-col items-center">
            <img src="/assets/img/mymsoftcom.png" alt="Cargando..." className="w-20 h-20 animate-spin" />
            <p className="text-lg text-gray-700 font-semibold mt-2">Cargando desistimientos...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Alerta informativa sobre desistimientos */}
          <div className="bg-amber-50 border-l-4 border-amber-400 text-amber-700 p-4 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm">
                  <strong>Información:</strong> Los desistimientos aplican una penalización del 10% y liberan
                  automáticamente el lote. El cliente solo se desactiva si no tiene otras ventas activas.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-4 flex-wrap">
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
            {selectedProjectId && selectedProjectId !== "all" && (
              <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
                Mostrando desistimientos del proyecto:{" "}
                {projects.find((p) => p.id_Projects.toString() === selectedProjectId)?.name}
              </div>
            )}
          </div>

          <ContentPage
            TitlePage={TitlePage}
            Data={withdrawalData}
            TitlesTable={titlesWithdrawal}
            showDeleteButton={true}
            showToggleButton={false}
            showStatusColumn={false}
            showPdfButton={false}
            FormPage={() => (
              <RegisterWithdrawal
                refreshData={() => fetchWithdrawals(selectedProjectId === "all" ? null : selectedProjectId)}
                withdrawalToEdit={editingWithdrawal}
                onCancelEdit={handleCloseModal}
                closeModal={handleCloseModal}
                showAlert={showAlert}
              />
            )}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            endpoint="/api/Withdrawal/DeleteWithdrawal"
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            refreshData={() => fetchWithdrawals(selectedProjectId === "all" ? null : selectedProjectId)}
          />
        </>
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
