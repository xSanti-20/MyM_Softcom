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
  showPdfButton = true, // 👈 Nueva prop
}) {
  const { isMobile } = useMobile()

  return (
    <div className={`space-y-4 ${isMobile ? "p-2" : "p-2 sm:p-4"}`}>
      <div
        className={`flex ${isMobile ? "flex-col space-y-2" : "flex-col sm:flex-row sm:items-center sm:justify-between"} gap-4`}
      >
        <h1 className={`font-bold ${isMobile ? "text-lg" : "text-xl sm:text-2xl"}`}>{TitlePage}</h1>
        <div className="flex-shrink-0">
          <ModalDialog TitlePage={TitlePage} FormPage={FormPage} isOpen={isModalOpen} setIsOpen={setIsModalOpen} />
        </div>
      </div>
      <DataTable
        Data={Data}
        TitlesTable={TitlesTable}
        onDelete={onDelete}
        onUpdate={onUpdate}
        endpoint={endpoint}
        refreshData={refreshData}
        showPdfButton={showPdfButton} // ✅ Propagación

      />
    </div>
  )
}

export default ContentPage
