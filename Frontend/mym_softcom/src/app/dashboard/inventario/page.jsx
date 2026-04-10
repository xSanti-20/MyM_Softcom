"use client"

import { useState, useEffect, useCallback } from "react"
import PrivateNav from "@/components/nav/PrivateNav"
import axiosInstance from "@/lib/axiosInstance"
import AlertModal from "@/components/AlertModal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2,
  Archive, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Box,
  Search,
  Filter,
  XCircle,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  Tag
} from "lucide-react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

function InventarioPage() {
  const TitlePage = "Inventario de Materiales"
  const [materials, setMaterials] = useState([])
  const [restockMaterials, setRestockMaterials] = useState([])
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isStockModalOpen, setIsStockModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [movementHistory, setMovementHistory] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isEditMovementModalOpen, setIsEditMovementModalOpen] = useState(false)
  const [selectedMovement, setSelectedMovement] = useState(null)
  const [editMovementForm, setEditMovementForm] = useState({
    newStock: "",
    observations: "",
    supplier: "",
    projectId: ""
  })
  
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    unitOfMeasure: "",
    unitCost: "",
    minimumStock: "",
    category: ""
  })
  
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    unitOfMeasure: "",
    unitCost: "",
    minimumStock: "",
    category: ""
  })
  
  const [stockForm, setStockForm] = useState({
    newStock: "",
    observations: "",
    supplier: "",
    projectId: ""
  })
  const [newCategoryName, setNewCategoryName] = useState("")
  const [categoryOptions, setCategoryOptions] = useState([])
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    message: "",
    type: "success",
  })

  const unitOfMeasureOptions = [
    "Bulto", "Metro³", "Unidad", "Kilo", "Litro", "Metro", "Galón", "Otro"
  ]

  const showAlert = (type, message) => {
    setAlertInfo({
      isOpen: true,
      message,
      type,
    })
  }

  const closeAlert = () => {
    setAlertInfo({
      isOpen: false,
      message: "",
      type: "success",
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  const formatNumber = (number) => {
    return new Intl.NumberFormat("es-CO").format(number || 0)
  }

  const fetchMaterials = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get("/api/Material/GetStockInfo")
      
      if (response.status === 200 && Array.isArray(response.data)) {
        setMaterials(response.data)
      }
    } catch (error) {
      console.error("Error al cargar materiales:", error)
      showAlert("error", "No se pudieron cargar los materiales del inventario.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchRestockMaterials = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/api/Material/GetRequiringRestock")
      
      if (response.status === 200 && Array.isArray(response.data)) {
        setRestockMaterials(response.data)
      }
    } catch (error) {
      console.error("Error al cargar materiales con stock bajo:", error)
    }
  }, [])

  const fetchProjects = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/api/Project/GetAllProjects")
      if (response.data && Array.isArray(response.data)) {
        setProjects(response.data)
      }
    } catch (error) {
      console.error("Error al cargar proyectos:", error)
    }
  }, [])

  const mergeCategories = useCallback((incoming = []) => {
    setCategoryOptions((prev) => {
      const merged = [...prev]
      incoming.forEach((cat) => {
        if (!cat) return
        const normalized = cat.trim()
        if (!normalized) return
        if (!merged.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
          merged.push(normalized)
        }
        
      })
      return merged
    })
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/api/Material/GetCategories")
      if (response.status === 200 && Array.isArray(response.data)) {
        const names = response.data.map((category) => category.name || category.Nombre || "")
        mergeCategories(names)
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error)
    }
  }, [mergeCategories])

  useEffect(() => {
    fetchMaterials()
    fetchRestockMaterials()
    fetchProjects()
    fetchCategories()
  }, [fetchMaterials, fetchRestockMaterials, fetchProjects, fetchCategories])

  const getFilteredMaterials = () => {
    let filtered = [...materials]

    if (searchTerm && searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(material => 
        material.nombre?.toLowerCase().includes(term) ||
        material.descripcion?.toLowerCase().includes(term) ||
        material.categoria?.toLowerCase().includes(term)
      )
    }

    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter(material => 
        material.categoria?.toLowerCase() === selectedCategory.toLowerCase()
      )
    }

    if (selectedStatus && selectedStatus !== "all") {
      filtered = filtered.filter(material => 
        material.status?.toLowerCase() === selectedStatus.toLowerCase()
      )
    }

    if (showLowStockOnly) {
      filtered = filtered.filter(material => material.requiere_Reposicion === true)
    }

    return filtered
  }

  const filteredMaterials = getFilteredMaterials()

  const totalInventoryValue = materials.reduce((total, material) => {
    return total + (Number(material.valor_Total_Inventario) || 0)
  }, 0)

  const getStockBadge = (material) => {
    if (material.requiere_Reposicion) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Stock Bajo
      </Badge>
    }
    if (material.stock_Actual === 0) {
      return <Badge className="bg-amber-500 flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Sin Stock
      </Badge>
    }
    return <Badge className="bg-green-600 flex items-center gap-1">
      <CheckCircle className="h-3 w-3" />
      OK
    </Badge>
  }

  const handleCreateMaterial = async () => {
    if (!createForm.name || !createForm.unitOfMeasure) {
      showAlert("error", "El nombre y la unidad de medida son obligatorios.")
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        name: createForm.name,
        description: createForm.description || null,
        unitOfMeasure: createForm.unitOfMeasure,
        unitCost: createForm.unitCost ? parseFloat(createForm.unitCost) : null,
        minimumStock: createForm.minimumStock ? parseFloat(createForm.minimumStock) : null,
        category: createForm.category || null
      }

      const response = await axiosInstance.post("/api/Material/Create", payload)

      if (response.data.success) {
        showAlert("success", response.data.message || "Material creado exitosamente.")
        setIsCreateModalOpen(false)
        resetCreateForm()
        await fetchMaterials()
        await fetchRestockMaterials()
      }
    } catch (error) {
      console.error("Error al crear material:", error)
      const errorMessage = error.response?.data?.message || "Error al crear el material."
      showAlert("error", errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddCategory = async () => {
    const trimmedName = newCategoryName.trim()

    if (!trimmedName) {
      showAlert("error", "Ingresa un nombre válido para la categoría.")
      return
    }

    const alreadyExists = categoryOptions.some(
      (category) => category.toLowerCase() === trimmedName.toLowerCase(),
    )

    if (alreadyExists) {
      showAlert("error", "Esa categoría ya existe en la lista.")
      return
    }

    try {
      setIsCategorySubmitting(true)
      const payload = { name: trimmedName }
      const response = await axiosInstance.post("/api/Material/CreateCategory", payload)
      const createdName = response.data?.category?.name || trimmedName
      mergeCategories([createdName])
      setNewCategoryName("")
      setIsCategoryModalOpen(false)
      const successMessage = response.data?.message || "Categoría creada correctamente."
      showAlert("success", successMessage)
    } catch (error) {
      console.error("Error al crear categoría:", error)
      const errorMessage = error.response?.data?.message || "No se pudo crear la categoría."
      showAlert("error", errorMessage)
    } finally {
      setIsCategorySubmitting(false)
    }
  }

  const handleOpenEditModal = async (material) => {
    try {
      setIsSubmitting(true)
      const response = await axiosInstance.get(`/api/Material/GetById/${material.id_Material}`)
      
      if (response.status === 200) {
        const data = response.data
        setSelectedMaterial(data)
        setEditForm({
          name: data.name || "",
          description: data.description || "",
          unitOfMeasure: data.unit_of_measure || "",
          unitCost: data.unit_cost?.toString() || "",
          minimumStock: data.minimum_stock?.toString() || "",
          category: data.category || ""
        })
        setIsEditModalOpen(true)
      }
    } catch (error) {
      console.error("Error al cargar material:", error)
      showAlert("error", "No se pudo cargar la información del material.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateMaterial = async () => {
    if (!editForm.name || !editForm.unitOfMeasure) {
      showAlert("error", "El nombre y la unidad de medida son obligatorios.")
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        name: editForm.name,
        description: editForm.description || null,
        unitOfMeasure: editForm.unitOfMeasure,
        unitCost: editForm.unitCost ? parseFloat(editForm.unitCost) : null,
        minimumStock: editForm.minimumStock ? parseFloat(editForm.minimumStock) : null,
        category: editForm.category || null
      }

      const response = await axiosInstance.put(
        `/api/Material/Update/${selectedMaterial.id_Materials || selectedMaterial.id_Material}`, 
        payload
      )

      if (response.data.success) {
        showAlert("success", response.data.message || "Material actualizado exitosamente.")
        setIsEditModalOpen(false)
        setSelectedMaterial(null)
        resetEditForm()
        await fetchMaterials()
        await fetchRestockMaterials()
      }
    } catch (error) {
      console.error("Error al actualizar material:", error)
      const errorMessage = error.response?.data?.message || "Error al actualizar el material."
      showAlert("error", errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenStockModal = (material) => {
    setSelectedMaterial(material)
    setStockForm({
      newStock: material.stock_Actual.toString(),
      observations: "",
      supplier: "",
      projectId: ""
    })
    setIsStockModalOpen(true)
  }

  const handleOpenHistoryModal = async (material) => {
    setSelectedMaterial(material)
    setMovementHistory([])
    setIsHistoryModalOpen(true)
    setIsHistoryLoading(true)

    try {
      const materialId = material.id_Materials || material.id_Material
      const response = await axiosInstance.get(`/api/Material/GetMovementHistory/${materialId}?limit=300`)

      if (response.status === 200 && Array.isArray(response.data)) {
        setMovementHistory(response.data)
      } else {
        setMovementHistory([])
      }
    } catch (error) {
      console.error("Error al cargar historial de movimientos:", error)
      showAlert("error", "No se pudo cargar la trazabilidad del material.")
      setMovementHistory([])
    } finally {
      setIsHistoryLoading(false)
    }
  }

  const handleUpdateStock = async () => {
    const newStock = parseFloat(stockForm.newStock)
    
    if (isNaN(newStock) || newStock < 0) {
      showAlert("error", "El stock debe ser un número positivo.")
      return
    }

    const currentStock = selectedMaterial.stock_Actual
    const isIncrease = newStock > currentStock
    const isDecrease = newStock < currentStock

    if (isIncrease && !stockForm.supplier) {
      showAlert("error", "Debes especificar el proveedor al aumentar el stock.")
      return
    }

    if (isDecrease && !stockForm.projectId) {
      showAlert("error", "Debes seleccionar el proyecto al retirar material.")
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        idMaterial: selectedMaterial.id_Material,
        newStock: newStock,
        observations: stockForm.observations || 'Sin observaciones',
        supplier: stockForm.supplier || null,
        projectId: stockForm.projectId ? parseInt(stockForm.projectId, 10) : null
      }

      const response = await axiosInstance.put(
        `/api/Material/UpdateStock/${selectedMaterial.id_Material}`, 
        payload
      )

      if (response.data.success) {
        showAlert("success", response.data.message || "Stock actualizado exitosamente.")
        setIsStockModalOpen(false)
        setSelectedMaterial(null)
        resetStockForm()
        await fetchMaterials()
        await fetchRestockMaterials()
      }
    } catch (error) {
      console.error("Error al actualizar stock:", error)
      const errorMessage = error.response?.data?.message || "Error al actualizar el stock."
      showAlert("error", errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEditMovementModal = (movement) => {
    setSelectedMovement(movement)
    setEditMovementForm({
      newStock: movement.newStock?.toString() || "0",
      observations: movement.observations || "",
      supplier: movement.supplier || "",
      projectId: movement.projectId?.toString() || ""
    })
    setIsEditMovementModalOpen(true)
  }

  const getMovementTypeFromStocks = (oldStock, newStock) => {
    const diff = newStock - oldStock
    if (diff > 0) return "entrada"
    if (diff < 0) return "salida"
    return "ajuste"
  }

  const handleUpdateMovement = async () => {
    if (!selectedMovement) return

    const parsedNewStock = parseFloat(editMovementForm.newStock)
    if (isNaN(parsedNewStock) || parsedNewStock < 0) {
      showAlert("error", "El nuevo stock debe ser un número válido mayor o igual a 0.")
      return
    }

    const resultingType = getMovementTypeFromStocks(selectedMovement.oldStock, parsedNewStock)
    if (resultingType === "entrada" && !editMovementForm.supplier.trim()) {
      showAlert("error", "Debes especificar el proveedor para una entrada de stock.")
      return
    }

    if (resultingType === "salida" && (!editMovementForm.projectId || editMovementForm.projectId === "0")) {
      showAlert("error", "Debes seleccionar el proyecto para una salida de stock.")
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        idMovement: selectedMovement.id,
        newStock: parsedNewStock,
        observations: editMovementForm.observations || "Sin observaciones",
        supplier: resultingType === "entrada" ? (editMovementForm.supplier || null) : null,
        projectId: resultingType === "salida" && editMovementForm.projectId && editMovementForm.projectId !== "0"
          ? parseInt(editMovementForm.projectId, 10)
          : null
      }

      const response = await axiosInstance.put("/api/Material/UpdateMovement", payload)

      if (response.data.success) {
        showAlert("success", "Movimiento actualizado exitosamente.")
        setIsEditMovementModalOpen(false)
        setSelectedMovement(null)
        setEditMovementForm({ newStock: "", observations: "", supplier: "", projectId: "" })
        
        if (selectedMaterial) {
          const materialId = selectedMaterial.id_Materials || selectedMaterial.id_Material
          const updatedHistory = await axiosInstance.get(`/api/Material/GetMovementHistory/${materialId}?limit=300`)
          if (updatedHistory.status === 200 && Array.isArray(updatedHistory.data)) {
            setMovementHistory(updatedHistory.data)
          }
        }

        await fetchMaterials()
        await fetchRestockMaterials()
      }
    } catch (error) {
      console.error("Error al actualizar movimiento:", error)
      const errorMessage = error.response?.data?.message || "Error al actualizar el movimiento."
      showAlert("error", errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteMovement = async (movement) => {
    if (!selectedMaterial) return

    const confirmDelete = window.confirm(
      "¿Seguro que deseas eliminar este movimiento? El stock del material y los movimientos posteriores se recalcularán."
    )
    if (!confirmDelete) return

    try {
      setIsSubmitting(true)
      const response = await axiosInstance.delete(`/api/Material/DeleteMovement/${movement.id}`)

      if (response.data.success) {
        showAlert("success", response.data.message || "Movimiento eliminado exitosamente.")

        const materialId = selectedMaterial.id_Materials || selectedMaterial.id_Material
        const updatedHistory = await axiosInstance.get(`/api/Material/GetMovementHistory/${materialId}?limit=300`)
        if (updatedHistory.status === 200 && Array.isArray(updatedHistory.data)) {
          setMovementHistory(updatedHistory.data)
        }

        await fetchMaterials()
        await fetchRestockMaterials()
      }
    } catch (error) {
      console.error("Error al eliminar movimiento:", error)
      const errorMessage = error.response?.data?.message || "Error al eliminar el movimiento."
      showAlert("error", errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (material) => {
    const confirmMessage = material.status?.toLowerCase() === "activo"
      ? `¿Deseas desactivar el material "${material.nombre || material.name}"?`
      : `¿Deseas activar el material "${material.nombre || material.name}"?`
    
    if (!window.confirm(confirmMessage)) return

    try {
      const materialId = material.id_Materials || material.id_Material
      const response = await axiosInstance.patch(
        `/api/Material/ToggleStatus/${materialId}`
      )

      if (response.data.success) {
        showAlert("success", response.data.message || "Estado actualizado exitosamente.")
        await fetchMaterials()
        await fetchRestockMaterials()
      }
    } catch (error) {
      console.error("Error al cambiar estado:", error)
      const errorMessage = error.response?.data?.message || "Error al cambiar el estado."
      showAlert("error", errorMessage)
    }
  }

  const adjustStock = (amount) => {
    const currentStock = parseFloat(stockForm.newStock) || 0
    const newValue = Math.max(0, currentStock + amount)
    setStockForm(prev => ({ ...prev, newStock: newValue.toString() }))
  }

  const resetCreateForm = () => {
    setCreateForm({
      name: "",
      description: "",
      unitOfMeasure: "",
      unitCost: "",
      minimumStock: "",
      category: ""
    })
  }

  const resetEditForm = () => {
    setEditForm({
      name: "",
      description: "",
      unitOfMeasure: "",
      unitCost: "",
      minimumStock: "",
      category: ""
    })
  }

  const resetStockForm = () => {
    setStockForm({
      newStock: "",
      observations: "",
      supplier: "",
      projectId: ""
    })
  }

  const getStockDifference = () => {
    if (!selectedMaterial || !stockForm.newStock) return null
    
    const currentStock = selectedMaterial.stock_Actual
    const newStock = parseFloat(stockForm.newStock)
    const difference = newStock - currentStock
    
    return {
      value: difference,
      isIncrease: difference > 0,
      isDecrease: difference < 0
    }
  }

  return (
    <PrivateNav>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Package className="h-8 w-8 text-blue-600" />
                {TitlePage}
              </h1>
              <p className="text-gray-600 mt-2">Gestión de materiales y control de stock</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCategoryModalOpen(true)}
                className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Tag className="h-4 w-4" />
                Nueva Categoría
              </Button>
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Material
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <Card className="w-full max-w-sm border border-emerald-200 bg-emerald-50/60">
            <CardContent className="py-4 px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Valor Total Inventario
                  </p>
                  <p className="text-2xl font-bold text-emerald-900 mt-1">
                    {formatCurrency(totalInventoryValue)}
                  </p>
                </div>
                <div className="rounded-full bg-emerald-100 p-2.5">
                  <DollarSign className="h-5 w-5 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <Label htmlFor="search">Buscar Material</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Buscar por nombre, descripción o categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category-filter">Categoría</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category-filter">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-filter">Estado</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="activo">Activos</SelectItem>
                    <SelectItem value="inactivo">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLowStockOnly}
                  onChange={(e) => setShowLowStockOnly(e.target.checked)}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Mostrar solo materiales con stock bajo
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Materiales ({filteredMaterials.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Cargando materiales...</p>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {searchTerm ? 'No se encontraron materiales con esos criterios' : 'No hay materiales registrados'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead className="text-right">Stock Actual</TableHead>
                      <TableHead className="text-right">Stock Mínimo</TableHead>
                      <TableHead className="text-right">Costo Unit.</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-center">Estado Stock</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.map((material) => (
                      <TableRow key={material.id_Material} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{material.nombre}</p>
                            {material.descripcion && (
                              <p className="text-xs text-gray-500">{material.descripcion}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{material.categoria || "Sin categoría"}</Badge>
                        </TableCell>
                        <TableCell>{material.unidad_Medida}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatNumber(material.stock_Actual)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(material.stock_Minimo || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(material.costo_Unitario || 0)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-700">
                          {formatCurrency(material.valor_Total_Inventario || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStockBadge(material)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            className={material.status?.toLowerCase() === "activo" 
                              ? "bg-blue-600" 
                              : "bg-gray-400"
                            }
                          >
                            {material.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenStockModal(material)}
                              title="Actualizar Stock"
                            >
                              <TrendingUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenHistoryModal(material)}
                              title="Ver Historial"
                              className="text-purple-600 border-purple-600 hover:bg-purple-50"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditModal(material)}
                              title="Editar Material"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(material)}
                              title={material.status?.toLowerCase() === "activo" ? "Desactivar" : "Activar"}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Crear Nuevo Material
              </DialogTitle>
              <DialogDescription>
                Completa la información del nuevo material para el inventario
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="create-name">
                  Nombre del Material <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Cemento Portland Tipo I"
                />
              </div>

              <div>
                <Label htmlFor="create-description">Descripción</Label>
                <Textarea
                  id="create-description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción detallada del material"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-unit">
                    Unidad de Medida <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={createForm.unitOfMeasure}
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, unitOfMeasure: value }))}
                  >
                    <SelectTrigger id="create-unit">
                      <SelectValue placeholder="Seleccionar unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOfMeasureOptions.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="create-category">Categoría</Label>
                  <Select
                    value={createForm.category}
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger id="create-category">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-cost">Costo Unitario (COP)</Label>
                  <Input
                    id="create-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.unitCost}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, unitCost: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="create-min-stock">Stock Mínimo</Label>
                  <Input
                    id="create-min-stock"
                    type="number"
                    min="0"
                    value={createForm.minimumStock}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, minimumStock: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false)
                  resetCreateForm()
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateMaterial}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "Creando..." : "Crear Material"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isCategoryModalOpen}
          onOpenChange={(open) => {
            setIsCategoryModalOpen(open)
            if (!open) setNewCategoryName("")
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Crear nueva categoría
              </DialogTitle>
              <DialogDescription>
                Define categorías personalizadas para clasificarlas en el inventario.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <div>
                <Label htmlFor="category-name">
                  Nombre de la categoría <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="category-name"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Ej: Seguridad industrial"
                />
              </div>
              <p className="text-xs text-gray-500">
                Se añadirá a los filtros y formularios de materiales. No se permiten duplicados.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCategoryModalOpen(false)
                  setNewCategoryName("")
                }}
                disabled={isCategorySubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddCategory}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isCategorySubmitting}
              >
                {isCategorySubmitting ? "Guardando..." : "Guardar categoría"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Editar Material
              </DialogTitle>
              <DialogDescription>
                Actualiza la información del material (el stock se actualiza desde "Actualizar Stock")
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="edit-name">
                  Nombre del Material <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Cemento Portland Tipo I"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción detallada del material"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-unit">
                    Unidad de Medida <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={editForm.unitOfMeasure}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, unitOfMeasure: value }))}
                  >
                    <SelectTrigger id="edit-unit">
                      <SelectValue placeholder="Seleccionar unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOfMeasureOptions.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-category">Categoría</Label>
                  <Select
                    value={editForm.category}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-cost">Costo Unitario (COP)</Label>
                  <Input
                    id="edit-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.unitCost}
                    onChange={(e) => setEditForm(prev => ({ ...prev, unitCost: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-min-stock">Stock Mínimo</Label>
                  <Input
                    id="edit-min-stock"
                    type="number"
                    min="0"
                    value={editForm.minimumStock}
                    onChange={(e) => setEditForm(prev => ({ ...prev, minimumStock: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false)
                  setSelectedMaterial(null)
                  resetEditForm()
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateMaterial}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Actualizar Stock
              </DialogTitle>
              <DialogDescription>
                Ajusta la cantidad en inventario de {selectedMaterial?.nombre}
              </DialogDescription>
            </DialogHeader>

            {selectedMaterial && (
              <div className="grid gap-4 py-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Material</p>
                  <p className="font-semibold text-lg">{selectedMaterial.nombre}</p>
                  <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                    <div>
                      <p className="text-gray-600">Stock Actual</p>
                      <p className="font-semibold text-blue-600">
                        {formatNumber(selectedMaterial.stock_Actual)} {selectedMaterial.unidad_Medida}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Stock Mínimo</p>
                      <p className="font-semibold">
                        {formatNumber(selectedMaterial.stock_Minimo || 0)} {selectedMaterial.unidad_Medida}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Ajustes Rápidos</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => adjustStock(10)}
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      +10
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => adjustStock(50)}
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      +50
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => adjustStock(100)}
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      +100
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => adjustStock(-10)}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      -10
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => adjustStock(-50)}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      -50
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="new-stock">
                    Nuevo Stock <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="new-stock"
                    type="number"
                    min="0"
                    value={stockForm.newStock}
                    onChange={(e) => setStockForm(prev => ({ ...prev, newStock: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                {stockForm.newStock && getStockDifference() && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Stock Actual</p>
                        <p className="text-xl font-bold">{formatNumber(selectedMaterial.stock_Actual)}</p>
                      </div>
                      <div className="flex items-center">
                        {getStockDifference().isIncrease && (
                          <div className="flex items-center text-green-600">
                            <TrendingUp className="h-6 w-6 mr-2" />
                            <span className="text-lg font-semibold">+{formatNumber(Math.abs(getStockDifference().value))}</span>
                          </div>
                        )}
                        {getStockDifference().isDecrease && (
                          <div className="flex items-center text-red-600">
                            <TrendingDown className="h-6 w-6 mr-2" />
                            <span className="text-lg font-semibold">-{formatNumber(Math.abs(getStockDifference().value))}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Nuevo Stock</p>
                        <p className="text-xl font-bold text-blue-600">{formatNumber(parseFloat(stockForm.newStock))}</p>
                      </div>
                    </div>
                  </div>
                )}

                {stockForm.newStock && getStockDifference() && getStockDifference().isIncrease && (
                  <div>
                    <Label htmlFor="supplier">
                      Proveedor <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="supplier"
                      type="text"
                      value={stockForm.supplier}
                      onChange={(e) => setStockForm(prev => ({ ...prev, supplier: e.target.value }))}
                      placeholder="Nombre del proveedor"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Especifica de dónde proviene el material que ingresa
                    </p>
                  </div>
                )}

                {stockForm.newStock && getStockDifference() && getStockDifference().isDecrease && (
                  <div>
                    <Label htmlFor="project">
                      Proyecto <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={stockForm.projectId}
                      onValueChange={(value) => setStockForm(prev => ({ ...prev, projectId: value }))}
                    >
                      <SelectTrigger id="project">
                        <SelectValue placeholder="Seleccionar proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id_Projects} value={project.id_Projects.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Indica para qué proyecto se está retirando el material
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="observations">Observaciones</Label>
                  <Textarea
                    id="observations"
                    value={stockForm.observations}
                    onChange={(e) => setStockForm(prev => ({ ...prev, observations: e.target.value }))}
                    placeholder="Motivo de la actualización, detalles adicionales, etc."
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsStockModalOpen(false)
                  setSelectedMaterial(null)
                  resetStockForm()
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateStock}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "Actualizando..." : "Actualizar Stock"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <History className="h-6 w-6 text-purple-600" />
                Historial de Movimientos
              </DialogTitle>
              <DialogDescription className="text-base">
                Control completo de entradas y salidas de {selectedMaterial?.nombre}
              </DialogDescription>
            </DialogHeader>

            {selectedMaterial && (
              <div className="space-y-6">
                <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Material</p>
                        <p className="text-lg font-bold text-gray-900">{selectedMaterial.nombre}</p>
                        <p className="text-xs text-gray-600">{selectedMaterial.categoria || 'Sin categoría'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stock Actual</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatNumber(selectedMaterial.stock_Actual)}
                        </p>
                        <p className="text-xs text-gray-600">{selectedMaterial.unidad_Medida}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stock Mínimo</p>
                        <p className="text-2xl font-bold text-amber-600">
                          {formatNumber(selectedMaterial.stock_Minimo || 0)}
                        </p>
                        <p className="text-xs text-gray-600">{selectedMaterial.unidad_Medida}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Valor Inventario</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(selectedMaterial.valor_Total_Inventario || 0)}
                        </p>
                        <p className="text-xs text-gray-600">Valor total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {isHistoryLoading ? (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center">
                        <p className="text-gray-500 text-lg font-medium">Cargando historial...</p>
                        <p className="text-gray-400 text-sm mt-2">Consultando trazabilidad en base de datos</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : movementHistory.length === 0 ? (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center">
                        <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg font-medium">No hay movimientos registrados</p>
                        <p className="text-gray-400 text-sm mt-2">Los cambios de stock aparecerán aquí</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader className="bg-gray-50">
                      <CardTitle className="text-base font-semibold flex items-center justify-between">
                        <span>Registro de Movimientos ({movementHistory.length})</span>
                        <Badge variant="outline" className="font-normal">
                          Total: {movementHistory.length} movimientos
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-100">
                              <TableHead className="font-semibold">Fecha</TableHead>
                              <TableHead className="font-semibold">Hora</TableHead>
                              <TableHead className="text-center font-semibold">Tipo</TableHead>
                              <TableHead className="text-center font-semibold w-[280px]">Movimiento</TableHead>
                              <TableHead className="font-semibold">Origen/Destino</TableHead>
                              <TableHead className="font-semibold">Observaciones</TableHead>
                              <TableHead className="text-center font-semibold">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {movementHistory.map((movement, index) => {
                              const date = new Date(movement.date)
                              return (
                                <TableRow key={movement.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <TableCell className="font-medium">
                                    {date.toLocaleDateString('es-CO', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </TableCell>
                                  <TableCell className="text-gray-600">
                                    {date.toLocaleTimeString('es-CO', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {movement.type === 'entrada' ? (
                                      <Badge className="bg-green-600 hover:bg-green-700">
                                        <ArrowUpCircle className="h-3 w-3 mr-1" />
                                        Entrada
                                      </Badge>
                                    ) : movement.type === 'salida' ? (
                                      <Badge className="bg-red-600 hover:bg-red-700">
                                        <ArrowDownCircle className="h-3 w-3 mr-1" />
                                        Salida
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">
                                        Ajuste
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-between gap-3 py-1">
                                      <div className="text-center flex-1">
                                        <p className="text-xs text-gray-500">Anterior</p>
                                        <p className="text-base font-bold text-gray-700">
                                          {formatNumber(movement.oldStock)}
                                        </p>
                                      </div>
                                      <div className="flex items-center justify-center flex-1">
                                        {movement.difference > 0 ? (
                                          <div className="flex items-center text-green-600">
                                            <TrendingUp className="h-5 w-5 mr-1" />
                                            <span className="text-lg font-bold">+{formatNumber(Math.abs(movement.difference))}</span>
                                          </div>
                                        ) : movement.difference < 0 ? (
                                          <div className="flex items-center text-red-600">
                                            <TrendingDown className="h-5 w-5 mr-1" />
                                            <span className="text-lg font-bold">-{formatNumber(Math.abs(movement.difference))}</span>
                                          </div>
                                        ) : (
                                          <span className="text-lg font-bold text-gray-500">0</span>
                                        )}
                                      </div>
                                      <div className="text-center flex-1">
                                        <p className="text-xs text-gray-500">Nuevo</p>
                                        <p className="text-base font-bold text-blue-600">
                                          {formatNumber(movement.newStock)}
                                        </p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {movement.type === 'entrada' && movement.supplier ? (
                                      <div className="space-y-1">
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                          Proveedor
                                        </Badge>
                                        <p className="font-semibold text-sm">{movement.supplier}</p>
                                      </div>
                                    ) : movement.type === 'salida' && movement.projectName ? (
                                      <div className="space-y-1">
                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                          Proyecto
                                        </Badge>
                                        <p className="font-semibold text-sm">{movement.projectName}</p>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-sm">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="max-w-xs">
                                    <p className="text-sm text-gray-600 line-clamp-2">{movement.observations}</p>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenEditMovementModal(movement)}
                                        title="Editar movimiento"
                                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                        disabled={isSubmitting}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDeleteMovement(movement)}
                                        title="Eliminar movimiento"
                                        className="text-red-600 border-red-600 hover:bg-red-50"
                                        disabled={isSubmitting}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsHistoryModalOpen(false)
                  setSelectedMaterial(null)
                  setMovementHistory([])
                }}
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditMovementModalOpen} onOpenChange={setIsEditMovementModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Editar Movimiento
              </DialogTitle>
              <DialogDescription>
                Corrige errores o actualiza información del movimiento
              </DialogDescription>
            </DialogHeader>

            {selectedMovement && (
              <div className="grid gap-4 py-4">
                <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-semibold capitalize">{selectedMovement.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-semibold">
                      {new Date(selectedMovement.date).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stock anterior:</span>
                    <span className="font-semibold">{formatNumber(selectedMovement.oldStock)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stock nuevo:</span>
                    <span className="font-semibold">{formatNumber(selectedMovement.newStock)}</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-mov-new-stock">Nuevo stock</Label>
                  <Input
                    id="edit-mov-new-stock"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editMovementForm.newStock}
                    onChange={(e) => setEditMovementForm(prev => ({ ...prev, newStock: e.target.value }))}
                    placeholder="Ingresa el stock nuevo"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-mov-observations">Observaciones</Label>
                  <Textarea
                    id="edit-mov-observations"
                    value={editMovementForm.observations}
                    onChange={(e) => setEditMovementForm(prev => ({ ...prev, observations: e.target.value }))}
                    placeholder="Detalles del movimiento, motivo, lote, etc."
                    rows={2}
                  />
                </div>

                {getMovementTypeFromStocks(selectedMovement.oldStock, parseFloat(editMovementForm.newStock || "0")) === 'entrada' && (
                  <div>
                    <Label htmlFor="edit-mov-supplier">Proveedor</Label>
                    <Input
                      id="edit-mov-supplier"
                      type="text"
                      value={editMovementForm.supplier}
                      onChange={(e) => setEditMovementForm(prev => ({ ...prev, supplier: e.target.value }))}
                      placeholder="Nombre del proveedor"
                    />
                  </div>
                )}

                {getMovementTypeFromStocks(selectedMovement.oldStock, parseFloat(editMovementForm.newStock || "0")) === 'salida' && (
                  <div>
                    <Label htmlFor="edit-mov-project">Proyecto</Label>
                    <Select
                      value={editMovementForm.projectId}
                      onValueChange={(value) => setEditMovementForm(prev => ({ ...prev, projectId: value }))}
                    >
                      <SelectTrigger id="edit-mov-project">
                        <SelectValue placeholder="Seleccionar proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sin proyecto</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id_Projects} value={project.id_Projects.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditMovementModalOpen(false)
                  setSelectedMovement(null)
                  setEditMovementForm({ newStock: "", observations: "", supplier: "", projectId: "" })
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateMovement}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <AlertModal
        isOpen={alertInfo.isOpen}
        onClose={closeAlert}
        title={alertInfo.type === "success" ? "Éxito" : "Error"}
        message={alertInfo.message}
        type={alertInfo.type}
      />
    </PrivateNav>
  )
}

export default InventarioPage
