"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import axiosInstance from "@/lib/axiosInstance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, DollarSign, Search, User, MapPin, Loader2, X, Building, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function RegisterSale({ refreshData, saleToEdit, onCancelEdit, closeModal, showAlert }) {
  const [formData, setFormData] = useState({
    sale_date: "",
    total_value: "",
    initial_payment: "",
    id_Clients: "",
    id_Lots: "",
    id_Users: "",
    id_Plans: "",
    paymentPlanType: "automatic",
    houseInitialPercentage: "30",
    customQuotas: [],
  })

  // ... (incluir aquí todos los estados y funciones necesarios) ...

  return (
    <div className="max-w-full mx-auto p-6 bg-white rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {isEditing ? "Editar Venta" : "Registrar Nueva Venta"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Layout de 2 columnas limpio y profesional */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Columna Izquierda: Detalles de la Venta */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Detalles de la Venta</h3>
              
              {/* Campos de la venta aquí */}
              <div className="space-y-4">
                {/* Fecha de Venta */}
                <div>
                  <Label htmlFor="sale_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Venta *
                  </Label>
                  <div className="relative">
                    <Input
                      type="date"
                      id="sale_date"
                      name="sale_date"
                      value={formData.sale_date}
                      onChange={handleChange}
                      required
                      className="w-full pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                </div>

                {/* Valor Total */}
                <div>
                  <Label htmlFor="total_value" className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Total *
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      id="total_value"
                      name="total_value"
                      placeholder="Valor total de la venta"
                      value={formData.total_value}
                      onChange={handleChange}
                      required
                      className="w-full pl-8"
                    />
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                </div>

                {/* Cuota Inicial */}
                <div>
                  <Label htmlFor="initial_payment" className="block text-sm font-medium text-gray-700 mb-1">
                    Cuota Inicial *
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      id="initial_payment"
                      name="initial_payment"
                      placeholder="Cuota inicial"
                      value={formData.initial_payment}
                      onChange={handleChange}
                      required
                      className="w-full pl-8"
                    />
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                </div>

                {/* Tipo de Plan de Pago */}
                <div>
                  <Label htmlFor="paymentPlanType" className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Plan de Pago *
                  </Label>
                  <RadioGroup
                    value={formData.paymentPlanType}
                    onValueChange={(value) => handleSelectChange("paymentPlanType", value)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="automatic" id="automatic" />
                      <Label htmlFor="automatic" className="text-sm">
                        Automático (fórmula estándar)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label htmlFor="custom" className="text-sm">
                        Personalizado (cuotas definidas)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="house" id="house" />
                      <Label htmlFor="house" className="text-sm">
                        Para casas (30% inicial)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Asociaciones y Resumen */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Asociaciones</h3>
              
              <div className="space-y-4">
                {/* Cliente */}
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">
                    Documento del Cliente *
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Documento del cliente"
                      value={clientDocument}
                      onChange={(e) => setClientDocument(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleClientSearch} size="sm">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Proyecto */}
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">
                    Proyecto *
                  </Label>
                  <Select value={selectedProject} onValueChange={handleProjectChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id_Projects} value={project.id_Projects.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Usuario */}
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">
                    Usuario *
                  </Label>
                  <Select value={formData.id_Users} onValueChange={(value) => handleSelectChange("id_Users", value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id_Users} value={user.id_Users.toString()}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Plan */}
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan *
                  </Label>
                  <Select value={formData.id_Plans} onValueChange={(value) => handleSelectChange("id_Plans", value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id_Plans} value={plan.id_Plans.toString()}>
                          {plan.name} ({plan.number_quotas} cuotas)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Resumen de Pago */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Resumen de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-600 text-xs block">Valor Total</span>
                      <span className="font-medium">${formData.total_value || '0'}</span>
                    </div>
                    <div className="bg-green-50 p-2 rounded border border-green-200">
                      <span className="text-green-600 text-xs block">Cuota Inicial</span>
                      <span className="font-semibold text-green-700">${formData.initial_payment || '0'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button type="button" onClick={onCancelEdit} variant="outline" disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Actualizando..." : "Registrando..."}
              </>
            ) : isEditing ? (
              "Actualizar"
            ) : (
              "Registrar"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default RegisterSale