-- ============================================================
-- SCRIPT DE MIGRACIÓN: MÓDULO DE INVENTARIO DE MATERIALES
-- Sistema: M&M Softcom
-- Versión: 2.0 (SIMPLIFICADO)
-- Fecha: 2025
-- ============================================================

-- ============================================================
-- TABLA: materials
-- Descripción: Almacena los materiales con su stock
-- ============================================================

CREATE TABLE IF NOT EXISTS `materials` (
    `id_Materials` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(200) NOT NULL UNIQUE COMMENT 'Nombre del material',
    `description` VARCHAR(500) NULL COMMENT 'Descripción detallada',
    `unit_of_measure` VARCHAR(50) NOT NULL COMMENT 'Unidad de medida (Bulto, Metro³, Unidad, Kilo, etc.)',
    `unit_cost` DECIMAL(15,2) NULL COMMENT 'Costo unitario del material',
    `current_stock` DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Stock actual',
    `minimum_stock` DECIMAL(15,2) NULL COMMENT 'Stock mínimo para alertas de reposición',
    `category` VARCHAR(100) NULL COMMENT 'Categoría (Cemento, Arena, Hierro, etc.)',
    `status` VARCHAR(20) NOT NULL DEFAULT 'Activo' COMMENT 'Estado: Activo, Inactivo',
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación',
    `updated_date` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de última actualización',
    
    INDEX `idx_materials_name` (`name`),
    INDEX `idx_materials_status` (`status`),
    INDEX `idx_materials_category` (`category`),
    INDEX `idx_materials_stock_low` (`current_stock`, `minimum_stock`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Tabla de materiales de construcción con stock';

-- ============================================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ============================================================

INSERT INTO `materials` 
    (`name`, `description`, `unit_of_measure`, `unit_cost`, `minimum_stock`, `category`, `current_stock`, `status`) 
VALUES
    ('Cemento Argos X50Kg', 'Cemento gris uso general 50kg', 'Bulto', 35000.00, 50.00, 'Cemento', 0.00, 'Activo'),
    ('Arena Lavada', 'Arena de río lavada para construcción', 'Metro³', 80000.00, 10.00, 'Agregados', 0.00, 'Activo'),
    ('Gravilla', 'Gravilla triturada calibrada', 'Metro³', 75000.00, 10.00, 'Agregados', 0.00, 'Activo'),
    ('Hierro 3/8"', 'Varilla corrugada 3/8 pulgadas x 6m', 'Unidad', 28000.00, 100.00, 'Hierro', 0.00, 'Activo'),
    ('Hierro 1/2"', 'Varilla corrugada 1/2 pulgadas x 6m', 'Unidad', 45000.00, 100.00, 'Hierro', 0.00, 'Activo'),
    ('Ladrillo Tolete', 'Ladrillo tolete prensado', 'Unidad', 800.00, 1000.00, 'Mampostería', 0.00, 'Activo'),
    ('Bloque No.4', 'Bloque hueco #4 (10x20x40cm)', 'Unidad', 2500.00, 500.00, 'Mampostería', 0.00, 'Activo'),
    ('Alambre Dulce', 'Alambre dulce calibre 18', 'Kilo', 5000.00, 20.00, 'Amarres', 0.00, 'Activo'),
    ('Madera Pino 2x4x3m', 'Tabla pino cepillada 2x4 pulgadas x 3m', 'Unidad', 15000.00, 50.00, 'Madera', 0.00, 'Activo'),
    ('Tubo PVC 4" Sanitario', 'Tubo PVC sanitario 4 pulgadas x 6m', 'Unidad', 45000.00, 30.00, 'Plomería', 0.00, 'Activo');

-- ============================================================
-- VERIFICACIÓN DE INSTALACIÓN
-- ============================================================

SELECT 
    'Instalación completada' AS Status,
    (SELECT COUNT(*) FROM materials) AS Total_Materiales,
    (SELECT SUM(current_stock * COALESCE(unit_cost, 0)) FROM materials) AS Valor_Total_Inventario;

-- ============================================================
-- VISTAS ÚTILES
-- ============================================================

-- Vista: Stock actual de todos los materiales
CREATE OR REPLACE VIEW `v_stock_materiales` AS
SELECT 
    m.id_Materials AS ID,
    m.name AS Material,
    m.category AS Categoria,
    m.unit_of_measure AS Unidad,
    m.current_stock AS Stock_Actual,
    m.minimum_stock AS Stock_Minimo,
    CASE 
        WHEN m.minimum_stock IS NOT NULL AND m.current_stock < m.minimum_stock 
        THEN 'REQUIERE REPOSICIÓN' 
        WHEN m.current_stock = 0 
        THEN 'SIN STOCK'
        ELSE 'OK' 
    END AS Estado_Stock,
    m.unit_cost AS Costo_Unitario,
    (m.current_stock * COALESCE(m.unit_cost, 0)) AS Valor_Inventario,
    m.status AS Estado
FROM materials m
WHERE m.status = 'Activo'
ORDER BY m.category, m.name;

-- Vista: Materiales que requieren reposición
CREATE OR REPLACE VIEW `v_materiales_para_reponer` AS
SELECT 
    m.id_Materials AS ID,
    m.name AS Material,
    m.category AS Categoria,
    m.unit_of_measure AS Unidad,
    m.current_stock AS Stock_Actual,
    m.minimum_stock AS Stock_Minimo,
    (m.minimum_stock - m.current_stock) AS Cantidad_Requerida,
  m.unit_cost AS Costo_Unitario,
    ((m.minimum_stock - m.current_stock) * COALESCE(m.unit_cost, 0)) AS Costo_Reposicion_Estimado
FROM materials m
WHERE m.status = 'Activo' 
  AND m.minimum_stock IS NOT NULL 
  AND m.current_stock < m.minimum_stock
ORDER BY (m.minimum_stock - m.current_stock) DESC;

-- Vista: Resumen de inventario por categoría
CREATE OR REPLACE VIEW `v_inventario_por_categoria` AS
SELECT 
  COALESCE(m.category, 'Sin Categoría') AS Categoria,
    COUNT(*) AS Total_Materiales,
    SUM(m.current_stock * COALESCE(m.unit_cost, 0)) AS Valor_Total,
    SUM(CASE WHEN m.current_stock > 0 THEN 1 ELSE 0 END) AS Materiales_Con_Stock,
    SUM(CASE WHEN m.minimum_stock IS NOT NULL AND m.current_stock < m.minimum_stock THEN 1 ELSE 0 END) AS Materiales_Para_Reponer
FROM materials m
WHERE m.status = 'Activo'
GROUP BY m.category
ORDER BY Valor_Total DESC;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
