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
  Filter,
  Eye,
  EyeOff,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { useMobile } from "@/hooks/use-mobile"

// Mock PDFExportService for demo
const PDFExportService = {
  exportSinglePiglet: async (id) => {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    console.log(`Exporting PDF for piglet ${id}`)
  },
}

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
  showInactiveRecords = true,
  showPdfButton = true,
  headerActions = null,
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [exportingPDF, setExportingPDF] = useState(new Set())
  const { isMobile, isTablet } = useMobile()
  const [showAllDetails, setShowAllDetails] = useState(false)

  const safeData = Array.isArray(Data) ? Data : []
  const itemsPerPage = isMobile ? 3 : isTablet ? 4 : 6

  // Función para renderizar el contenido de una celda
  const renderCellContent = (value) => {
    // Si es un componente React (tiene props), renderizarlo directamente
    if (value && typeof value === "object" && value.props) {
      return value
    }

    // Si es null, undefined o string vacío
    if (!value || value === "") {
      return "N/A"
    }

    // Para cualquier otro valor, convertir a string
    return value.toString()
  }

  // Función para obtener texto plano para búsqueda
  const getSearchableText = (value) => {
    if (value && typeof value === "object" && value.props) {
      // Si es un Badge, extraer el texto del children
      return value.props.children || ""
    }
    return value ? value.toString() : ""
  }

  // Filtrar datos basado en búsqueda
  const filteredData = safeData.filter((row) => {
    const matchesSearch = Object.values(row).some((cell) => {
      const searchableText = getSearchableText(cell)
      return searchableText.toLowerCase().includes(searchTerm.toLowerCase())
    })
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
      onToggleStatus(row.id, row)
    }
  }

  const truncateText = (text, maxLength = 20) => {
    if (!text) return "N/A"

    // Si es un componente React, no truncar
    if (typeof text === "object" && text.props) {
      return text
    }

    const textStr = text.toString()
    if (!isMobile) return textStr
    return textStr.length > maxLength ? textStr.substring(0, maxLength) + "..." : textStr
  }

  const renderNoData = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Search className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        {safeData.length === 0 ? "No hay datos disponibles" : "No se encontraron resultados"}
      </h3>
      <p className="text-slate-500 text-center max-w-sm">
        {safeData.length === 0
          ? "Aún no se han agregado registros a esta tabla."
          : "Intenta ajustar tu búsqueda o filtros para encontrar lo que buscas."}
      </p>
    </div>
  )

  const renderMobileCards = () => {
    if (currentItems.length === 0) {
      return renderNoData()
    }

    return (
      <div className="space-y-4">
        {currentItems.map((row, rowIndex) => {
          const pigletId = row.original?.id_Piglet || row.id
          const isExporting = pigletId ? exportingPDF.has(pigletId) : false

          const allFields = Object.keys(row)
            .filter((key) => key !== "original" && key !== "searchableIdentifier" && key !== "isActive")
            .map((key, index) => ({
              title: TitlesTable[index] || key,
              value: row[key],
              key: key,
            }))

          const mainFields = allFields.slice(0, 4)
          const additionalFields = allFields.slice(4)

          return (
            <Card
              key={row.id || `mobile-${rowIndex}-${Math.random()}`}
              className="transition-all duration-200 hover:shadow-md border-l-4 border-l-blue-500 hover:border-l-blue-600"
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-semibold text-slate-900">Registro #{row.id || rowIndex + 1}</span>
                    </div>
                  </div>

                  {/* Campos principales */}
                  <div className="grid grid-cols-1 gap-2">
                    {mainFields.map((field, index) => (
                      <div key={`main-${row.id}-${index}`} className="flex justify-between items-center py-1">
                        <span className="text-sm font-medium text-slate-600 flex-shrink-0 mr-3">{field.title}:</span>
                        <span className="text-sm text-slate-900 text-right font-medium">
                          {renderCellContent(field.value)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Campos adicionales expandibles */}
                  {additionalFields.length > 0 && showAllDetails && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-1 gap-2">
                        {additionalFields.map((field, index) => (
                          <div key={`additional-${row.id}-${index}`} className="flex justify-between items-center py-1">
                            <span className="text-sm font-medium text-slate-600 flex-shrink-0 mr-3">
                              {field.title}:
                            </span>
                            <span className="text-sm text-slate-900 text-right">{renderCellContent(field.value)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Botón Ver más/menos */}
                  {additionalFields.length > 0 && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllDetails(!showAllDetails)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 text-xs h-8"
                      >
                        {showAllDetails ? (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            Ver menos
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            Ver más detalles
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-slate-50 border-slate-200 bg-transparent"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {onUpdate && (
                          <DropdownMenuItem onClick={() => onUpdate(row)} className="text-sm">
                            <Edit className="w-4 h-4 mr-2 text-blue-600" />
                            Editar
                          </DropdownMenuItem>
                        )}

                        {showToggleButton && onToggleStatus && (
                          <DropdownMenuItem onClick={() => handleToggleStatus(row)} className="text-sm">
                            <ToggleLeft className="w-4 h-4 mr-2 text-orange-600" />
                            Cambiar Estado
                          </DropdownMenuItem>
                        )}

                        {showPdfButton && pigletId && (
                          <DropdownMenuItem
                            onClick={() => handleExportPDF(row)}
                            disabled={isExporting}
                            className="text-sm"
                          >
                            <FileText className="w-4 h-4 mr-2 text-red-600" />
                            {isExporting ? "Exportando..." : "Exportar PDF"}
                          </DropdownMenuItem>
                        )}

                        {extraActions.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            {extraActions.map((action, index) => (
                              <DropdownMenuItem
                                key={index}
                                onClick={() => action.onClick(row)}
                                className="text-sm"
                                title={action.tooltip}
                              >
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}

                        {showDeleteButton && onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(row.id)}
                              className="text-sm text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
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
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                {TitlesTable.map((title, index) => (
                  <TableHead key={index} className="font-semibold text-slate-900 h-12 px-4">
                    {title}
                  </TableHead>
                ))}
                <TableHead className="font-semibold text-slate-900 h-12 px-4 text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((row, rowIndex) => {
                const pigletId = row.original?.id_Piglet || row.id
                const isExporting = pigletId ? exportingPDF.has(pigletId) : false

                return (
                  <TableRow
                    key={row.id || `table-${rowIndex}-${Math.random()}`}
                    className="transition-colors hover:bg-slate-50 border-b border-slate-100"
                  >
                    {TitlesTable.map((title, cellIndex) => {
                      const key = Object.keys(row).filter(
                        (k) => k !== "original" && k !== "searchableIdentifier" && k !== "isActive",
                      )[cellIndex]
                      const value = row[key]
                      return (
                        <TableCell
                          key={`table-${row.id}-${cellIndex}`}
                          className="px-4 py-3 font-medium text-slate-900"
                        >
                          {renderCellContent(value)}
                        </TableCell>
                      )
                    })}

                    <TableCell className="px-4 py-3">
                      <div className="flex items-center justify-center space-x-1">
                        {onUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onUpdate(row)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}

                        {showToggleButton && onToggleStatus && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(row)}
                            className="h-8 w-8 p-0 text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                            title="Cambiar Estado"
                          >
                            <ToggleLeft className="w-4 h-4" />
                          </Button>
                        )}

                        {showPdfButton && pigletId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportPDF(row)}
                            disabled={isExporting}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                            title="Exportar PDF"
                          >
                            {isExporting ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </Button>
                        )}

                        {(extraActions.length > 0 || (showDeleteButton && onDelete)) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {extraActions.map((action, index) => (
                                <DropdownMenuItem
                                  key={index}
                                  onClick={() => action.onClick(row)}
                                  className="text-sm"
                                  title={action.tooltip}
                                >
                                  {action.label}
                                </DropdownMenuItem>
                              ))}

                              {extraActions.length > 0 && showDeleteButton && onDelete && <DropdownMenuSeparator />}

                              {showDeleteButton && onDelete && (
                                <DropdownMenuItem
                                  onClick={() => onDelete(row.id)}
                                  className="text-sm text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full shadow-sm border-slate-200">
      <CardHeader className="pb-4 border-b border-slate-100">
        <div className="flex flex-col space-y-4">
          {/* Fila superior: Título y botón de acción */}
          {headerActions && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{headerActions.title || "Datos"}</h2>
              </div>
              <div className="flex-shrink-0">{headerActions.button}</div>
            </div>
          )}

          {/* Fila inferior: Búsqueda y filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar en todos los campos..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <Filter className="w-4 h-4" />
              <span>
                {filteredData.length} de {safeData.length} registros
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className={isMobile ? "p-4" : "p-6"}>{isMobile ? renderMobileCards() : renderTable()}</div>
      </CardContent>

      {totalPages > 1 && filteredData.length > 0 && (
        <CardFooter className="flex flex-col items-center space-y-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-9 w-9 p-0 border-slate-200 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (!isMobile) return true
                  return Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages
                })
                .map((page, index, array) => (
                  <div key={page} className="flex items-center">
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2 text-slate-400 text-sm">...</span>
                    )}
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className={`h-9 min-w-9 ${
                        currentPage === page
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </Button>
                  </div>
                ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-9 w-9 p-0 border-slate-200 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-sm text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">
            Página {currentPage} de {totalPages} • {indexOfFirstItem + 1}-
            {Math.min(indexOfLastItem, filteredData.length)} de {filteredData.length} resultados
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

export default DataTable
