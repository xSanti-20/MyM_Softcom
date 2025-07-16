"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Search,
  Edit,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Trash2,
  FileText,
  ToggleLeft,
  ToggleRight,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useMobile } from "@/hooks/use-mobile"
import PDFExportService from "@/services/pdfExportService"

function DataTable({
  Data,
  TitlesTable,
  onDelete,
  onUpdate,
  onToggleStatus,
  endpoint,
  refreshData,
  extraActions = [],
  showDeleteButton = true,
  showToggleButton = false,
  statusField = "isActive",
  showInactiveRecords = true,
  showStatusColumn = false, // ✅ NUEVO: Controlar si mostrar columna de estado
  showPdfButton = true, // ✅ NUEVO

}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [exportingPDF, setExportingPDF] = useState(new Set())
  const { isMobile, isTablet } = useMobile()
  const [showAllDetails, setShowAllDetails] = useState(false) // ✅ MOVED: useState hook to top level

  const safeData = Array.isArray(Data) ? Data : []
  const itemsPerPage = isMobile ? 2 : isTablet ? 3 : 5

  // Filtrar datos basado en búsqueda y estado
  const filteredData = safeData.filter((row) => {
    const matchesSearch = Object.values(row).some(
      (cell) => cell && cell.toString().toLowerCase().includes(searchTerm.toLowerCase()),
    )

    // Si no se muestran registros inactivos, filtrar solo activos
    if (!showInactiveRecords && statusField in row) {
      return matchesSearch && row[statusField]
    }

    return matchesSearch
  })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem)

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
  }

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  const handleExportPDF = async (row) => {
    try {
      const pigletId = row.original?.id_Piglet || row.id

      if (!pigletId) {
        console.error("No se pudo obtener el ID del lechón:", row)
        alert("Error: No se pudo identificar el lechón para exportar")
        return
      }

      setExportingPDF((prev) => new Set(prev).add(pigletId))
      await PDFExportService.exportSinglePiglet(pigletId)
    } catch (error) {
      console.error("Error al exportar PDF:", error)
      alert(`Error al generar el PDF: ${error.message}`)
    } finally {
      const pigletId = row.original?.id_Piglet || row.id
      if (pigletId) {
        setExportingPDF((prev) => {
          const newSet = new Set(prev)
          newSet.delete(pigletId)
          return newSet
        })
      }
    }
  }

  const handleToggleStatus = (row) => {
    if (onToggleStatus) {
      const currentStatus = row[statusField] ?? true
      onToggleStatus(row.id, currentStatus)
    }
  }

  const getStatusBadge = (row) => {
    if (!(statusField in row)) return null

    const isActive = row[statusField]
    return (
      <Badge variant={isActive ? "default" : "secondary"} className="ml-2">
        {isActive ? "Activo" : "Inactivo"}
      </Badge>
    )
  }

  // ✅ NUEVO: Filtrar acciones extra basado en el estado del registro
  const getFilteredExtraActions = (row) => {
    const isActive = row[statusField] ?? true

    return extraActions.filter((action) => {
      // Si el lechón está inactivo, ocultar "Recalcular Peso" y "Verificar Etapa"
      if (!isActive && (action.label.includes("Recalcular") || action.label.includes("Verificar"))) {
        return false
      }
      return true
    })
  }

  const truncateText = (text, maxLength = 15) => {
    if (!text) return "N/A"
    const textStr = text.toString()
    if (!isMobile) return textStr
    return textStr.length > maxLength ? textStr.substring(0, maxLength) + "..." : textStr
  }

  const renderNoData = () => (
    <div className="text-center py-8">
      <p className="text-gray-500 text-sm">
        {safeData.length === 0 ? "No hay datos disponibles" : "No se encontraron resultados"}
      </p>
    </div>
  )

  const renderMobileCards = () => {
    if (currentItems.length === 0) {
      return renderNoData()
    }

    return (
      <div className="space-y-3">
        {currentItems.map((row, rowIndex) => {
          const pigletId = row.original?.id_Piglet || row.id
          const isExporting = pigletId ? exportingPDF.has(pigletId) : false
          const isActive = row[statusField] ?? true
          const filteredActions = getFilteredExtraActions(row)

          // ✅ DINÁMICO: Obtener todos los campos del objeto (excluyendo 'original')
          const allFields = Object.keys(row)
            .filter((key) => key !== "original") // Excluir el campo 'original'
            .map((key, index) => ({
              title: TitlesTable[index] || key, // Usar el título de la tabla o la key como fallback
              value: row[key],
              key: key,
            }))

          // ✅ DINÁMICO: Primeros 5 campos más importantes
          const mainFields = allFields.slice(0, 5)

          // ✅ DINÁMICO: Campos adicionales (del 6 en adelante)
          const additionalFields = allFields.slice(5)

          return (
            <Card
              key={row.id || `mobile-${rowIndex}-${Math.random()}`}
              className={`p-3 shadow-sm ${!isActive ? "opacity-60 bg-gray-50" : ""}`}
            >
              <div className="space-y-2">
                {/* Estado */}
                {showStatusColumn && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Estado:</span>
                    {getStatusBadge(row)}
                  </div>
                )}

                {/* ✅ DINÁMICO: Campos principales (primeros 5) */}
                {mainFields.map((field, index) => (
                  <div key={`main-${row.id}-${index}`} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">{field.title}:</span>
                    <span className="text-sm text-right">{truncateText(field.value)}</span>
                  </div>
                ))}

                {/* ✅ DINÁMICO: Campos adicionales (expandibles) - Solo si hay más de 5 campos */}
                {additionalFields.length > 0 &&
                  showAllDetails &&
                  additionalFields.map((field, index) => (
                    <div key={`additional-${row.id}-${index}`} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{field.title}:</span>
                      <span className="text-sm text-right">{truncateText(field.value)}</span>
                    </div>
                  ))}

                {/* ✅ DINÁMICO: Botón Ver más/menos - Solo si hay más de 5 campos */}
                {additionalFields.length > 0 && (
                  <div className="flex justify-center pt-2 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllDetails(!showAllDetails)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {showAllDetails ? "Ver menos" : "Ver más detalles"}
                    </Button>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      {onUpdate && (
                        <DropdownMenuItem onClick={() => onUpdate(row)} className="text-sm">
                          <Edit className="w-3 h-3 mr-2" />
                          Editar
                        </DropdownMenuItem>
                      )}

                      {showToggleButton && onToggleStatus && (
                        <DropdownMenuItem onClick={() => handleToggleStatus(row)} className="text-sm">
                          {isActive ? (
                            <>
                              <ToggleLeft className="w-3 h-3 mr-2" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <ToggleRight className="w-3 h-3 mr-2" />
                              Activar
                            </>
                          )}
                        </DropdownMenuItem>
                      )}

                      {showPdfButton && pigletId && (
                        <DropdownMenuItem
                          onClick={() => handleExportPDF(row)}
                          disabled={isExporting}
                          className="text-sm"
                        >
                          <FileText className="w-3 h-3 mr-2" />
                          {isExporting ? "Exportando..." : "PDF"}
                        </DropdownMenuItem>
                      )}


                      {filteredActions.map((action, index) => (
                        <DropdownMenuItem
                          key={index}
                          onClick={() => action.onClick(row)}
                          className="text-sm"
                          title={action.tooltip}
                        >
                          {action.label}
                        </DropdownMenuItem>
                      ))}

                      {showDeleteButton && onDelete && (
                        <DropdownMenuItem
                          onClick={() => onDelete(row.id)}
                          className="text-sm text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  const renderTable = () => {
    if (currentItems.length === 0) {
      return renderNoData()
    }

    return (
      <div className="rounded-md border overflow-x-auto" style={{ maxHeight: isMobile ? "300px" : "400px" }}>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {/* ✅ Solo mostrar columna Estado si showStatusColumn es true */}
              {showStatusColumn && (
                <TableHead className={`font-bold text-black ${isMobile ? "text-xs px-2" : ""}`}>Estado</TableHead>
              )}
              {TitlesTable.map((title, index) => (
                <TableHead key={index} className={`font-bold text-black ${isMobile ? "text-xs px-2" : ""}`}>
                  {isMobile ? title.substring(0, 8) : title}
                </TableHead>
              ))}
              <TableHead className={`font-bold text-black ${isMobile ? "text-xs px-2" : ""}`}>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.map((row, rowIndex) => {
              const pigletId = row.original?.id_Piglet || row.id
              const isExporting = pigletId ? exportingPDF.has(pigletId) : false
              const isActive = row[statusField] ?? true
              const filteredActions = getFilteredExtraActions(row)

              return (
                <TableRow
                  key={row.id || `table-${rowIndex}-${Math.random()}`}
                  className={`hover:bg-gray-50 ${!isActive ? "opacity-60 bg-gray-50" : ""}`}
                >
                  {/* ✅ Solo mostrar celda Estado si showStatusColumn es true */}
                  {showStatusColumn && (
                    <TableCell className={isMobile ? "text-xs px-2 py-1" : ""}>{getStatusBadge(row)}</TableCell>
                  )}

                  {TitlesTable.map((title, cellIndex) => {
                    const key = Object.keys(row)[cellIndex]
                    const value = row[key]
                    return (
                      <TableCell key={`table-${row.id}-${cellIndex}`} className={isMobile ? "text-xs px-2 py-1" : ""}>
                        {truncateText(value)}
                      </TableCell>
                    )
                  })}

                  <TableCell className={isMobile ? "px-2 py-1" : ""}>
                    <div className={`flex ${isMobile ? "flex-col space-y-1" : "space-x-2"}`}>
                      {onUpdate && (
                        <Button
                          variant="outline"
                          size={isMobile ? "sm" : "sm"}
                          onClick={() => onUpdate(row)}
                          className={`text-blue-600 hover:text-blue-800 ${isMobile ? "text-xs px-2 py-1 h-7" : ""}`}
                        >
                          <Edit className={`${isMobile ? "w-3 h-3 mr-1" : "w-4 h-4 mr-1"}`} />
                          {isMobile ? "Edit" : "Editar"}
                        </Button>
                      )}

                      {showToggleButton && onToggleStatus && (
                        <Button
                          variant="outline"
                          size={isMobile ? "sm" : "sm"}
                          onClick={() => handleToggleStatus(row)}
                          className={`${isActive ? "text-orange-600 hover:text-orange-800" : "text-green-600 hover:text-green-800"} ${isMobile ? "text-xs px-2 py-1 h-7" : ""}`}
                        >
                          {isActive ? (
                            <>
                              <ToggleLeft className={`${isMobile ? "w-3 h-3 mr-1" : "w-4 h-4 mr-1"}`} />
                              {isMobile ? "Des" : "Desactivar"}
                            </>
                          ) : (
                            <>
                              <ToggleRight className={`${isMobile ? "w-3 h-3 mr-1" : "w-4 h-4 mr-1"}`} />
                              {isMobile ? "Act" : "Activar"}
                            </>
                          )}
                        </Button>
                      )}

                      {showPdfButton && pigletId && (
                        <Button
                          variant="outline"
                          size={isMobile ? "sm" : "sm"}
                          onClick={() => handleExportPDF(row)}
                          disabled={isExporting}
                          className={`text-red-600 hover:text-red-800 ${isMobile ? "text-xs px-2 py-1 h-7" : ""}`}
                        >
                          <FileText className={`${isMobile ? "w-3 h-3 mr-1" : "w-4 h-4 mr-1"}`} />
                          {isExporting ? (isMobile ? "..." : "Exportando...") : isMobile ? "PDF" : "PDF"}
                        </Button>
                      )}


                      {/* ✅ Usar acciones filtradas */}
                      {filteredActions.map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size={isMobile ? "sm" : "sm"}
                          onClick={() => action.onClick(row)}
                          className={`text-gray-600 hover:text-gray-800 ${isMobile ? "text-xs px-2 py-1 h-7" : ""}`}
                          title={action.tooltip}
                        >
                          {action.label}
                        </Button>
                      ))}

                      {showDeleteButton && onDelete && (
                        <Button
                          variant="outline"
                          size={isMobile ? "sm" : "sm"}
                          onClick={() => onDelete(row.id)}
                          className={`text-red-600 hover:text-red-800 ${isMobile ? "text-xs px-2 py-1 h-7" : ""}`}
                        >
                          <Trash2 className={`${isMobile ? "w-3 h-3 mr-1" : "w-4 h-4 mr-1"}`} />
                          {isMobile ? "Del" : "Eliminar"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader
        className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? "pb-2 px-3 pt-3" : "pb-2"}`}
      ></CardHeader>

      <CardContent className={isMobile ? "px-3" : ""}>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className={`text-gray-400 ${isMobile ? "w-4 h-4" : ""}`} />
            <Input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={handleSearchChange}
              className={`flex-1 ${isMobile ? "text-sm h-9" : ""}`}
            />
          </div>

          {isMobile ? renderMobileCards() : renderTable()}
        </div>
      </CardContent>

      {totalPages > 1 && filteredData.length > 0 && (
        <CardFooter className={`flex flex-col items-center space-y-2 ${isMobile ? "px-3 pb-3" : ""}`}>
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size={isMobile ? "sm" : "sm"}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={isMobile ? "h-8 w-8 p-0" : ""}
            >
              <ChevronLeft className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                if (!isMobile) return true
                return Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages
              })
              .map((page, index, array) => (
                <div key={page} className="flex items-center">
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="px-1 text-gray-400 text-xs">...</span>
                  )}
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size={isMobile ? "sm" : "sm"}
                    onClick={() => handlePageChange(page)}
                    className={isMobile ? "text-xs px-2 h-8 min-w-8" : ""}
                  >
                    {page}
                  </Button>
                </div>
              ))}

            <Button
              variant="outline"
              size={isMobile ? "sm" : "sm"}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={isMobile ? "h-8 w-8 p-0" : ""}
            >
              <ChevronRight className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
            </Button>
          </div>
          <div className={`text-gray-600 ${isMobile ? "text-xs" : "text-sm"}`}>
            Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredData.length)} de {filteredData.length}{" "}
            resultados
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

export default DataTable
