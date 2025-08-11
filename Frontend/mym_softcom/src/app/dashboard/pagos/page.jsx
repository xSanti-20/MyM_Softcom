"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import axiosInstance from "@/lib/axiosInstance"
import RegisterPayment from "./formpagos"
import AlertModal from "@/components/AlertModal"
import Image from 'next/image';
import DataTable from "@/components/utils/DataTable"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Filter, Plus } from "lucide-react"

function Payments() {
  const TitlePage = "Pagos"
  const [paymentData, setPaymentData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const titlesPayments = ["ID", "Monto", "Fecha de Pago", "Método de Pago", "Cliente", "Documento", "Lote", "Proyecto"]

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

  const getProjectName = (payment) => {
    if (payment.sale?.lot?.project?.name) return payment.sale.lot.project.name
    if (payment.sale?.lot?.Project?.name) return payment.sale.lot.Project.name
    if (payment.sale?.Lot?.project?.name) return payment.sale.Lot.project.name
    if (payment.sale?.Lot?.Project?.name) return payment.sale.Lot.Project.name
    if (payment.sale?.lot?.project_name) return payment.sale.lot.project_name
    const projectId = payment.sale?.lot?.id_Projects || payment.sale?.lot?.project?.id_Projects
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

  async function fetchPayments(projectId = null) {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Payment/GetAllPayments")

      if (response.status === 200) {
        let filteredPayments = response.data

        if (projectId && projectId !== "all") {
          const targetProjectId = Number.parseInt(projectId, 10)
          filteredPayments = response.data.filter((payment) => {
            const paymentProjectId =
              payment.sale?.lot?.project?.id_Projects ||
              payment.sale?.lot?.Project?.id_Projects ||
              payment.sale?.lot?.id_Projects ||
              payment.sale?.Lot?.project?.id_Projects ||
              payment.sale?.Lot?.Project?.id_Projects
            return paymentProjectId === targetProjectId
          })
        }

        const data = filteredPayments.map((payment) => ({
          id: payment.id_Payments,
          monto:
            payment.amount != null
              ? payment.amount.toLocaleString("es-CO", {
                style: "currency",
                currency: "COP",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })
              : "Sin monto",
          fechaPago: payment.payment_date ? new Date(payment.payment_date).toLocaleDateString("es-CO") : "Sin fecha",
          metodoPago: payment.payment_method || "Sin método",
          cliente: payment.sale?.client
            ? `${payment.sale.client.names} ${payment.sale.client.surnames}`
            : "Sin cliente",
          documento: payment.sale?.client?.document || "Sin documento",
          lote: payment.sale?.lot ? `${payment.sale.lot.block}-${payment.sale.lot.lot_number}` : "Sin lote",
          proyecto: getProjectName(payment),
          original: payment,
          searchableIdentifier: `${payment.id_Payments} ${payment.sale?.client?.names} ${payment.sale?.client?.surnames} ${payment.sale?.lot?.block}-${payment.sale.lot?.lot_number} ${getProjectName(payment)} ${payment.payment_method}`,
        }))
        setPaymentData(data)
      }
    } catch (error) {
      console.error("Error al cargar pagos:", error)
      setError("No se pudieron cargar los datos de pagos.")
      showAlert("error", "No se pudieron cargar los datos de pagos.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleProjectFilterChange = (value) => {
    setSelectedProjectId(value)
    fetchPayments(value === "all" ? null : value)
  }

  useEffect(() => {
    fetchProjectsForFilter()
    fetchPayments()
  }, [])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      const response = await axiosInstance.delete(`/api/Payment/DeletePayment/${numericId}`)
      fetchPayments(selectedProjectId === "all" ? null : selectedProjectId)
      showAlert("success", response.data?.message || "Pago eliminado y recaudo actualizado correctamente.")
    } catch (error) {
      console.error("Error al eliminar:", error)
      const errorMessage = error.response?.data?.message || "Error al eliminar el pago"
      showAlert("error", errorMessage)
    }
  }

  const handleUpdate = async (row) => {
    try {
      const paymentId = row.original.id_Payments
      const response = await axiosInstance.get(`/api/Payment/GetPaymentID/${paymentId}`)

      if (response.status === 200) {
        setEditingPayment(response.data)
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error("Error al obtener datos del pago:", error)
      setEditingPayment(row.original)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setEditingPayment(null)
    }, 300)
  }

  // Header responsive: filtro + botón
  const headerActions = {
    title: TitlePage,
    button: (
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
        <div className="w-full sm:w-[250px]">
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
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Pago</span>
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
            <p className="text-lg text-gray-700 font-semibold mt-2">Cargando pagos...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="container mx-auto p-6">
          <DataTable
            Data={paymentData}
            TitlesTable={titlesPayments}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            showDeleteButton={true}
            showToggleButton={false}
            showStatusColumn={false}
            showPdfButton={false}
            headerActions={headerActions}
          />

          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <RegisterPayment
                  refreshData={() => fetchPayments(selectedProjectId === "all" ? null : selectedProjectId)}
                  paymentToEdit={editingPayment}
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

export default Payments
