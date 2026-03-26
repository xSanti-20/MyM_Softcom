-- ============================================================
-- SCRIPT PARA LIMPIAR TABLA DE TRAZABILIDAD
-- Ejecutar solo si se creó la tabla material_movements
-- ============================================================

-- Eliminar foreign keys primero
ALTER TABLE material_movements DROP FOREIGN KEY IF EXISTS fk_material_movements_materials;
ALTER TABLE material_movements DROP FOREIGN KEY IF EXISTS fk_material_movements_projects;
ALTER TABLE material_movements DROP FOREIGN KEY IF EXISTS fk_material_movements_users;

-- Eliminar la tabla
DROP TABLE IF EXISTS material_movements;

-- Eliminar vistas relacionadas
DROP VIEW IF EXISTS v_material_movements_history;
DROP VIEW IF EXISTS v_material_movements_summary;
DROP VIEW IF EXISTS v_movements_by_project;
DROP VIEW IF EXISTS v_recent_movements;

SELECT 'Tabla material_movements y vistas relacionadas eliminadas' AS Status;
