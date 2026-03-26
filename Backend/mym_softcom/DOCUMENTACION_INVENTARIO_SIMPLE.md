# ?? MÓDULO DE INVENTARIO DE MATERIALES - M&M Softcom (SIMPLIFICADO)

## ?? Descripción

Módulo simple para control de stock de materiales de construcción. **TODO SE MANEJA EN UNA SOLA TABLA: `materials`**

---

## ?? Estructura de la Base de Datos

### **Tabla: `materials`**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id_Materials` | INT | ID único |
| `name` | VARCHAR(200) | Nombre del material (único) |
| `description` | VARCHAR(500) | Descripción |
| `unit_of_measure` | VARCHAR(50) | Unidad (Bulto, Metro³, Unidad, Kilo) |
| `unit_cost` | DECIMAL(15,2) | Costo unitario |
| `current_stock` | DECIMAL(15,2) | **Stock actual** |
| `minimum_stock` | DECIMAL(15,2) | Stock mínimo para alertas |
| `category` | VARCHAR(100) | Categoría |
| `status` | VARCHAR(20) | Activo / Inactivo |
| `created_date` | DATETIME | Fecha de creación |
| `updated_date` | DATETIME | Fecha de actualización |

---

## ?? Instalación

```sql
mysql -u root -p mym_softcom < Database/Migrations/01_Create_Materials_Table.sql
```

Luego detener servidor, compilar y reiniciar.

---

## ?? API Endpoints

### **1. Obtener todos los materiales**
```http
GET /api/Material/GetAll
Authorization: Bearer {token}
```

### **2. Obtener materiales activos**
```http
GET /api/Material/GetActive
Authorization: Bearer {token}
```

### **3. Obtener material por ID**
```http
GET /api/Material/GetById/{id}
Authorization: Bearer {token}
```

### **4. Crear material**
```http
POST /api/Material/Create
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Cemento Argos X50Kg",
  "description": "Cemento gris 50kg",
  "unitOfMeasure": "Bulto",
  "unitCost": 35000,
  "minimumStock": 50,
  "category": "Cemento"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Material creado exitosamente",
  "material": {
    "id_Materials": 1,
    "name": "Cemento Argos X50Kg",
 "current_stock": 0.00,
    "status": "Activo"
  }
}
```

### **5. Actualizar material**
```http
PUT /api/Material/Update/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Cemento Argos X50Kg",
  "description": "Cemento gris 50kg - ACTUALIZADO",
  "unitOfMeasure": "Bulto",
  "unitCost": 38000,
  "minimumStock": 60,
  "category": "Cemento"
}
```

### **6. ? ACTUALIZAR STOCK**
```http
PUT /api/Material/UpdateStock/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "idMaterial": 1,
  "newStock": 150.00,
  "observations": "Compra de 150 bultos a proveedor XYZ"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Stock actualizado de 0 a 150 Bulto",
  "material": {
    "id_Materials": 1,
    "name": "Cemento Argos X50Kg",
    "current_stock": 150.00
  }
}
```

### **7. Cambiar estado (Activo/Inactivo)**
```http
PATCH /api/Material/ToggleStatus/{id}
Authorization: Bearer {token}
```

### **8. Obtener información de stock detallada**
```http
GET /api/Material/GetStockInfo
Authorization: Bearer {token}
```

**Respuesta:**
```json
[
  {
    "id_Material": 1,
    "nombre": "Cemento Argos X50Kg",
    "descripcion": "Cemento gris 50kg",
    "unidad_Medida": "Bulto",
    "costo_Unitario": 35000.00,
  "stock_Actual": 150.00,
    "stock_Minimo": 50.00,
  "categoria": "Cemento",
    "status": "Activo",
  "requiere_Reposicion": false,
    "valor_Total_Inventario": 5250000.00
  }
]
```

### **9. Obtener materiales que requieren reposición**
```http
GET /api/Material/GetRequiringRestock
Authorization: Bearer {token}
```

---

## ?? Casos de Uso

### **Caso 1: Compra de Material**

```sh
# Paso 1: Crear el material
POST /api/Material/Create
{
  "name": "Cemento Argos X50Kg",
  "unitOfMeasure": "Bulto",
  "unitCost": 35000,
  "minimumStock": 50,
  "category": "Cemento"
}

# Paso 2: Actualizar stock con la compra
PUT /api/Material/UpdateStock/1
{
  "idMaterial": 1,
  "newStock": 200,
  "observations": "Compra 200 bultos - Factura #12345"
}

# Resultado: Stock = 200 bultos
```

### **Caso 2: Uso en Obra**

```sh
# Reducir stock por uso
PUT /api/Material/UpdateStock/1
{
  "idMaterial": 1,
  "newStock": 150,
  "observations": "Usado 50 bultos en proyecto Malibu"
}

# Resultado: Stock baja de 200 a 150
```

### **Caso 3: Devolución**

```sh
# Aumentar stock por devolución
PUT /api/Material/UpdateStock/1
{
  "idMaterial": 1,
  "newStock": 160,
  "observations": "Devueltos 10 bultos sobrantes de obra"
}

# Resultado: Stock sube de 150 a 160
```

---

## ?? Integración con Frontend

### **Actualizar Stock:**

```jsx
const updateStock = async (materialId, newStock, observations) => {
  try {
    const response = await axiosInstance.put(`/api/Material/UpdateStock/${materialId}`, {
    idMaterial: materialId,
      newStock: parseFloat(newStock),
      observations: observations
    });

 if (response.data.success) {
      alert(response.data.message);
    }
  } catch (error) {
    console.error('Error:', error.response.data);
  }
};
```

---

## ?? Vistas SQL Útiles

### **Ver stock actual:**
```sql
SELECT * FROM v_stock_materiales;
```

### **Materiales para reponer:**
```sql
SELECT * FROM v_materiales_para_reponer;
```

### **Inventario por categoría:**
```sql
SELECT * FROM v_inventario_por_categoria;
```

---

## ? Ventajas de Este Diseño Simplificado

1. ? **Una sola tabla** - Fácil de entender y mantener
2. ? **Actualización directa** - Cambias el stock cuando lo necesites
3. ? **Sin complejidad** - No hay movimientos ni cálculos automáticos
4. ? **Rápido** - Consultas simples y directas
5. ? **Flexible** - Puedes agregar `observations` en cada actualización

---

## ?? Notas Importantes

- El stock se actualiza **manualmente** llamando a `UpdateStock`
- No hay historial de movimientos (si lo necesitas después, se puede agregar)
- El campo `observations` es opcional pero recomendado para auditoría
- El stock **no puede ser negativo** (validado por el backend)

---

**Sistema:** M&M Softcom - Módulo de Inventario Simplificado
**Versión:** 2.0
**Fecha:** 2025
