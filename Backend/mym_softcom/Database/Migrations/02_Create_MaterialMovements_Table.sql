-- ============================================================
-- SCRIPT DE MIGRACION: TRAZABILIDAD DE MOVIMIENTOS DE MATERIALES
-- Sistema: M&M Softcom
-- Fecha: 2026-03-18
-- ============================================================

CREATE TABLE IF NOT EXISTS `material_movements` (
    `id_MaterialMovements` INT AUTO_INCREMENT PRIMARY KEY,
    `id_Materials` INT NOT NULL,
    `movement_type` VARCHAR(20) NOT NULL COMMENT 'entrada | salida | ajuste',
    `old_stock` DECIMAL(15,2) NOT NULL,
    `new_stock` DECIMAL(15,2) NOT NULL,
    `difference` DECIMAL(15,2) NOT NULL,
    `observations` VARCHAR(1000) NULL,
    `supplier` VARCHAR(200) NULL,
    `id_Projects` INT NULL,
    `user_name` VARCHAR(200) NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX `idx_mat_mov_material` (`id_Materials`),
    INDEX `idx_mat_mov_project` (`id_Projects`),
    INDEX `idx_mat_mov_type` (`movement_type`),
    INDEX `idx_mat_mov_date` (`created_date`),

    CONSTRAINT `fk_material_movements_materials`
        FOREIGN KEY (`id_Materials`) REFERENCES `materials`(`id_Materials`)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT `fk_material_movements_projects`
        FOREIGN KEY (`id_Projects`) REFERENCES `projects`(`id_Projects`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Trazabilidad de cambios de stock por material';
