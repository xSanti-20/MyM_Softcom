"use client"

import { useState, useEffect } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import ContentPage from "@/components/utils/ContentPage"
import axiosInstance from "@/lib/axiosInstance"
import RegisterPayment from "./formpagos"
import AlertModal from "@/components/AlertModal"
import { FaMoneyBillWave } from "react-icons/fa"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Filter } from "lucide-react"

function Payments() {
  const TitlePage = "Pagos"
  const [paymentData, setPaymentData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
    redirectUrl: null,
  })

  const [projects, setProjects] = useState([]) // Para el filtro de proyectos
  const [selectedProjectId, setSelectedProjectId] = useState("") // ID del proyecto seleccionado para filtrar

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

  // Función auxiliar para obtener el nombre del proyecto
  const getProjectName = (payment) => {
    // Intentar obtener el proyecto directamente del lote
    if (payment.sale?.lot?.project?.name) {
      return payment.sale.lot.project.name
    }

    // Intentar con diferentes capitalizaciones
    if (payment.sale?.lot?.Project?.name) {
      return payment.sale.lot.Project.name
    }

    // Intentar con diferentes estructuras
    if (payment.sale?.Lot?.project?.name) {
      return payment.sale.Lot.project.name
    }

    if (payment.sale?.Lot?.Project?.name) {
      return payment.sale.Lot.Project.name
    }

    // Intentar con propiedades directas
    if (payment.sale?.lot?.project_name) {
      return payment.sale.lot.project_name
    }

    // Intentar obtener el ID del proyecto y usar un mapeo
    const projectId = payment.sale?.lot?.id_Projects || payment.sale?.lot?.project?.id_Projects
    if (projectId) {
      // Aquí podrías tener un mapeo de IDs a nombres si es necesario
      // Por ahora, solo mostraremos el ID
      return `Proyecto #${projectId}`
    }

    return "Sin proyecto"
  }

  // Función para cargar todos los proyectos para el filtro
  async function fetchProjectsForFilter() {
    try {
      // Usar directamente el endpoint de proyectos
      const response = await axiosInstance.get("/api/Project/GetAllProjects")
      if (response.data && Array.isArray(response.data)) {
        console.log("Todos los proyectos desde el backend:", response.data)

        // Mostrar todos los proyectos sin filtrar por estado inicialmente
        const allProjects = response.data.map((project) => ({
          id_Projects: project.id_Projects,
          name: project.name,
          status: project.status || "Sin estado",
        }))

        console.log("Proyectos procesados:", allProjects)

        // Opcional: Si quieres filtrar por estado, descomenta la siguiente línea
        // const activeProjects = allProjects.filter(
        //   (project) => project.status === "Activo" || project.status === "Active"
        // )

        setProjects(allProjects) // Cambiar por activeProjects si quieres filtrar
      }
    } catch (error) {
      console.error("Error al cargar proyectos para el filtro:", error)
      showAlert("error", "No se pudieron cargar los proyectos para el filtro.")
    }
  }

  // Función para cargar pagos, con o sin filtro de proyecto
  async function fetchPayments(projectId = null) {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Payment/GetAllPayments")

      if (response.status === 200) {
        console.log("Total de pagos recibidos:", response.data.length)

        let filteredPayments = response.data

        // Aplicar filtro de proyecto si se seleccionó uno
        if (projectId && projectId !== "all") {
          const targetProjectId = Number.parseInt(projectId, 10)
          console.log("Filtrando por proyecto ID:", targetProjectId)

          filteredPayments = response.data.filter((payment) => {
            const paymentProjectId =
              payment.sale?.lot?.project?.id_Projects ||
              payment.sale?.lot?.Project?.id_Projects ||
              payment.sale?.lot?.id_Projects ||
              payment.sale?.Lot?.project?.id_Projects ||
              payment.sale?.Lot?.Project?.id_Projects

            console.log(`Pago ${payment.id_Payments} - Proyecto ID: ${paymentProjectId}`)
            return paymentProjectId === targetProjectId
          })

          console.log("Pagos filtrados:", filteredPayments.length)
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

  // Manejar cambio en el filtro de proyecto
  const handleProjectFilterChange = (value) => {
    setSelectedProjectId(value)
    fetchPayments(value === "all" ? null : value)
  }

  useEffect(() => {
    fetchProjectsForFilter()
    fetchPayments() // Cargar todos los pagos inicialmente
  }, [])

  const handleDelete = async (id) => {
    try {
      const numericId = Number.parseInt(id, 10)
      const response = await axiosInstance.delete(`/api/Payment/DeletePayment/${numericId}`)

      fetchPayments(selectedProjectId === "all" ? null : selectedProjectId) // Refrescar con el filtro actual
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

  return (
    <PrivateNav>
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
          <div className="flex flex-col items-center">
            <img src="/assets/img/mymsoftcom.png" alt="Cargando..." className="w-20 h-20 animate-spin" />
            <p className="text-lg text-gray-700 font-semibold mt-2">Cargando pagos...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <>
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
                Mostrando pagos del proyecto:{" "}
                {projects.find((p) => p.id_Projects.toString() === selectedProjectId)?.name}
              </div>
            )}
          </div>
          <ContentPage
            TitlePage={TitlePage}
            Data={paymentData}
            showDeleteButton={true}
            showToggleButton={false}
            showStatusColumn={false}
            showPdfButton={false}
            TitlesTable={titlesPayments}
            FormPage={() => (
              <RegisterPayment
                refreshData={fetchPayments}
                paymentToEdit={editingPayment}
                onCancelEdit={handleCloseModal}
                closeModal={handleCloseModal}
                showAlert={showAlert}
              />
            )}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            endpoint="/api/Payment/DeletePayment"
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            refreshData={() => fetchPayments(selectedProjectId === "all" ? null : selectedProjectId)}
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

export default Payments
