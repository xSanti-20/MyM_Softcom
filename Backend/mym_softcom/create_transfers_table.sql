-- Tabla Transfers - Registro maestro de traslados de cartera
CREATE TABLE IF NOT EXISTS `transfers` (
  `id_Transfers` int NOT NULL AUTO_INCREMENT,
  `transfer_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `type` enum('Completo','Parcial') NOT NULL,
  `amount_transferred` decimal(15,2) NOT NULL,
  `accounting_note` longtext COLLATE utf8mb4_unicode_ci,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Completado',
  `id_Sales_Origen` int NOT NULL,
  `id_Sales_Destino` int NOT NULL,
  `id_Clients` int NOT NULL,
  `id_Users` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_Transfers`),
  KEY `fk_transfers_sales_origen` (`id_Sales_Origen`),
  KEY `fk_transfers_sales_destino` (`id_Sales_Destino`),
  KEY `fk_transfers_clients` (`id_Clients`),
  KEY `fk_transfers_users` (`id_Users`),
  CONSTRAINT `fk_transfers_clients` FOREIGN KEY (`id_Clients`) REFERENCES `clients` (`id_Clients`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transfers_sales_destino` FOREIGN KEY (`id_Sales_Destino`) REFERENCES `sales` (`id_Sales`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transfers_sales_origen` FOREIGN KEY (`id_Sales_Origen`) REFERENCES `sales` (`id_Sales`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transfers_users` FOREIGN KEY (`id_Users`) REFERENCES `users` (`id_Users`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla TransferDetails - Detalle de cómo se distribuye el dinero en las cuotas del lote destino
CREATE TABLE IF NOT EXISTS `transfer_details` (
  `id_TransferDetails` int NOT NULL AUTO_INCREMENT,
  `id_Transfers` int NOT NULL,
  `number_quota` int NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_TransferDetails`),
  KEY `fk_transferdetails_transfers` (`id_Transfers`),
  CONSTRAINT `fk_transferdetails_transfers` FOREIGN KEY (`id_Transfers`) REFERENCES `transfers` (`id_Transfers`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
