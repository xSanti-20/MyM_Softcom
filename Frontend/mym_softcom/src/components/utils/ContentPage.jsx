"use client"

import DataTable from "./DataTable"
import ModalDialog from "./ModalDialog"
import { useMobile } from "@/hooks/use-mobile"

function ContentPage({
  TitlePage,
  Data,
  TitlesTable,
  FormPage,
  onDelete,
  onUpdate,
  endpoint,
  isModalOpen,
  setIsModalOpen,
  refreshData,
  showPdfButton = true,
  extraActions = [],
  showDeleteButton = true,
  showToggleButton = false,
  statusField = "isActive",
  showInactiveRecords = true,
  showStatusColumn = false,
  onToggleStatus,
}) {
  const { isMobile } = useMobile()

  // Configuración del header del DataTable
  const headerActions = {
    title: TitlePage,
    button: <ModalDialog TitlePage={TitlePage} FormPage={FormPage} isOpen={isModalOpen} setIsOpen={setIsModalOpen} />,
  }

  return (
    <div className={`space-y-4 ${isMobile ? "p-2" : "p-2 sm:p-4"}`}>
      <DataTable
        Data={Data}
        TitlesTable={TitlesTable}
        onDelete={onDelete}
        onUpdate={onUpdate}
        onToggleStatus={onToggleStatus}
        endpoint={endpoint}
        refreshData={refreshData}
        showPdfButton={showPdfButton}
        extraActions={extraActions}
        showDeleteButton={showDeleteButton}
        showToggleButton={showToggleButton}
        statusField={statusField}
        showInactiveRecords={showInactiveRecords}
        showStatusColumn={showStatusColumn}
        headerActions={headerActions}
      />
    </div>
  )
}

export default ContentPage
