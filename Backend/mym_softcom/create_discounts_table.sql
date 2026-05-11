-- ============================================
-- Tabla de Descuentos por Referidos
-- Base de datos: mym_softcom
-- ============================================

CREATE TABLE IF NOT EXISTS discounts (
    id_Discount INT PRIMARY KEY AUTO_INCREMENT,
    id_Clients INT NOT NULL,
    id_Sales INT DEFAULT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    discount_type VARCHAR(50) DEFAULT 'referral',
    apply_to VARCHAR(50) NOT NULL COMMENT 'cartera o cuota',
    notes VARCHAR(500) DEFAULT NULL,
    discount_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    KEY idx_discount_client (id_Clients),
    KEY idx_discount_type (discount_type),
    KEY idx_discount_apply_to (apply_to),
    KEY idx_discount_date (discount_date),
    CONSTRAINT fk_discount_client FOREIGN KEY (id_Clients) 
        REFERENCES clients(id_Clients) ON DELETE CASCADE,
    CONSTRAINT fk_discount_sale FOREIGN KEY (id_Sales) 
        REFERENCES sales(id_Sales) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Verificación
-- ============================================

-- Ver estructura de la tabla creada
-- DESCRIBE discounts;

-- Insertar datos de prueba (opcional)
-- INSERT INTO discounts (id_Clients, discount_amount, apply_to, notes, discount_date) 
-- VALUES (1, 100000, 'cartera', 'Descuento por referido de prueba', NOW());

-- Ver todos los descuentos
-- SELECT * FROM discounts;
