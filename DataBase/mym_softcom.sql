CREATE DATABASE  IF NOT EXISTS `mym_softcom` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `mym_softcom`;
-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: localhost    Database: mym_softcom
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cesions`
--

DROP TABLE IF EXISTS `cesions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cesions` (
  `id_Cesiones` int NOT NULL AUTO_INCREMENT,
  `cesion_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cesion_reason` varchar(500) NOT NULL,
  `cesion_cost` decimal(15,2) DEFAULT '0.00',
  `status` varchar(50) NOT NULL DEFAULT 'Completada',
  `id_Client_Cedente` int NOT NULL,
  `id_Client_Cesionario` int NOT NULL,
  `id_Sales` int NOT NULL,
  `id_Users` int NOT NULL,
  `valor_pagado_antes_cesion` decimal(15,2) DEFAULT NULL,
  `deuda_antes_cesion` decimal(15,2) DEFAULT NULL,
  `observaciones` text,
  PRIMARY KEY (`id_Cesiones`),
  KEY `fk_cesions_users` (`id_Users`),
  KEY `idx_cesions_cedente` (`id_Client_Cedente`),
  KEY `idx_cesions_cesionario` (`id_Client_Cesionario`),
  KEY `idx_cesions_sale` (`id_Sales`),
  KEY `idx_cesions_date` (`cesion_date`),
  KEY `idx_cesions_status` (`status`),
  CONSTRAINT `fk_cesions_client_cedente` FOREIGN KEY (`id_Client_Cedente`) REFERENCES `clients` (`id_Clients`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cesions_client_cesionario` FOREIGN KEY (`id_Client_Cesionario`) REFERENCES `clients` (`id_Clients`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cesions_sales` FOREIGN KEY (`id_Sales`) REFERENCES `sales` (`id_Sales`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cesions_users` FOREIGN KEY (`id_Users`) REFERENCES `users` (`id_Users`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cesions`
--

LOCK TABLES `cesions` WRITE;
/*!40000 ALTER TABLE `cesions` DISABLE KEYS */;
INSERT INTO `cesions` VALUES (6,'2025-08-19 09:15:03','no presents',0.00,'Completada',6,7,2,1,40000000.00,9000000.00,'no presenta');
/*!40000 ALTER TABLE `cesions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `id_Clients` int NOT NULL AUTO_INCREMENT,
  `names` varchar(250) NOT NULL,
  `surnames` varchar(250) NOT NULL,
  `document` int NOT NULL,
  `phone` bigint DEFAULT NULL,
  `email` varchar(250) NOT NULL,
  `status` enum('Activo','Inactivo') NOT NULL,
  PRIMARY KEY (`id_Clients`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES (6,'Santiago','Puentes',1006126738,3112604880,'puentessantiago2003@gmail.com','Activo'),(7,'Carito','Barreto',55555,55555,'carito@gmail.com','Activo');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `details`
--

DROP TABLE IF EXISTS `details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `details` (
  `id_Details` int NOT NULL AUTO_INCREMENT,
  `id_Payments` int NOT NULL,
  `id_Sales` int NOT NULL,
  `number_quota` int NOT NULL,
  `covered_amount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id_Details`),
  KEY `id_Payments` (`id_Payments`),
  KEY `id_Sales` (`id_Sales`),
  CONSTRAINT `details_ibfk_1` FOREIGN KEY (`id_Payments`) REFERENCES `payments` (`id_Payments`) ON DELETE CASCADE,
  CONSTRAINT `details_ibfk_2` FOREIGN KEY (`id_Sales`) REFERENCES `sales` (`id_Sales`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `details`
--

LOCK TABLES `details` WRITE;
/*!40000 ALTER TABLE `details` DISABLE KEYS */;
INSERT INTO `details` VALUES (1,2,1,1,1194444.00),(2,2,1,2,1194444.00),(3,2,1,3,1194444.00),(4,2,1,4,1194444.00),(5,2,1,5,1194444.00),(6,2,1,6,1194444.00),(7,2,1,7,1194444.00),(8,2,1,8,1194444.00),(9,2,1,9,1194444.00),(10,2,1,10,1194444.00),(11,2,1,11,1194444.00),(12,2,1,12,1194444.00),(13,2,1,13,1194444.00),(14,2,1,14,1194444.00),(15,2,1,15,1194444.00),(16,2,1,16,83340.00),(39,7,3,1,1055556.00),(40,7,3,2,944444.00),(41,8,3,2,111112.00),(42,8,3,3,1055556.00),(43,8,3,4,1055556.00),(44,8,3,5,777776.00),(45,9,1,16,1111104.00),(46,9,1,17,1194444.00),(47,9,1,18,1194444.00),(48,9,1,19,1194444.00),(49,9,1,20,305564.00),(50,10,3,5,277780.00),(51,10,3,6,1055556.00),(52,10,3,7,1055556.00),(53,10,3,8,1055556.00),(54,10,3,9,1055556.00),(55,10,3,10,499996.00);
/*!40000 ALTER TABLE `details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lots`
--

DROP TABLE IF EXISTS `lots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lots` (
  `id_Lots` int NOT NULL AUTO_INCREMENT,
  `id_Projects` int NOT NULL,
  `block` varchar(250) NOT NULL,
  `lot_number` int NOT NULL,
  `lot_area` int NOT NULL,
  `status` enum('Libre','Vendido') DEFAULT 'Libre',
  PRIMARY KEY (`id_Lots`),
  KEY `lots_ibfk_1` (`id_Projects`),
  CONSTRAINT `lots_ibfk_1` FOREIGN KEY (`id_Projects`) REFERENCES `projects` (`id_Projects`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lots`
--

LOCK TABLES `lots` WRITE;
/*!40000 ALTER TABLE `lots` DISABLE KEYS */;
INSERT INTO `lots` VALUES (1,1,'A',22,90,'Vendido'),(2,2,'B',22,90,'Vendido'),(3,2,'C',14,90,'Vendido');
/*!40000 ALTER TABLE `lots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id_Payments` int NOT NULL AUTO_INCREMENT,
  `id_Sales` int NOT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `payment_method` varchar(250) NOT NULL,
  PRIMARY KEY (`id_Payments`),
  KEY `fk_payment_sale` (`id_Sales`),
  CONSTRAINT `fk_payment_sale` FOREIGN KEY (`id_Sales`) REFERENCES `sales` (`id_Sales`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,1,'2025-08-11',2000000.00,'Cuota Inicial'),(2,1,'2025-08-12',18000000.00,'BANCO'),(4,2,'2025-08-19',40000000.00,'Cuota Inicial'),(6,3,'2025-04-15',2000000.00,'Cuota Inicial'),(7,3,'2025-05-07',2000000.00,'EFECTIVO'),(8,3,'2025-06-11',3000000.00,'EFECTIVO'),(9,1,'2025-07-10',5000000.00,'BANCO'),(10,3,'2025-07-10',5000000.00,'BANCO');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans` (
  `id_Plans` int NOT NULL AUTO_INCREMENT,
  `name` varchar(250) NOT NULL,
  `number_quotas` int NOT NULL,
  PRIMARY KEY (`id_Plans`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES (1,'Plan 1',36);
/*!40000 ALTER TABLE `plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id_Projects` int NOT NULL AUTO_INCREMENT,
  `name` varchar(250) NOT NULL,
  PRIMARY KEY (`id_Projects`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES (1,'Luxury Malibu'),(2,'Reservas del Poblado'),(3,'Malibu');
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales` (
  `id_Sales` int NOT NULL AUTO_INCREMENT,
  `id_Clients` int NOT NULL,
  `id_Lots` int NOT NULL,
  `id_Users` int NOT NULL,
  `id_Plans` int NOT NULL,
  `sale_date` date NOT NULL,
  `total_value` decimal(15,2) NOT NULL,
  `initial_payment` decimal(15,2) NOT NULL,
  `status` enum('Active','Desistida','Escriturar') DEFAULT NULL,
  `total_raised` decimal(10,2) NOT NULL DEFAULT '0.00',
  `quota_value` decimal(10,0) NOT NULL,
  `total_debt` decimal(18,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id_Sales`),
  KEY `fk_sale_client` (`id_Clients`),
  KEY `fk_sale_lot` (`id_Lots`),
  KEY `fk_sale_plan` (`id_Plans`),
  KEY `fk_sales_users` (`id_Users`),
  CONSTRAINT `fk_sale_client` FOREIGN KEY (`id_Clients`) REFERENCES `clients` (`id_Clients`),
  CONSTRAINT `fk_sale_lot` FOREIGN KEY (`id_Lots`) REFERENCES `lots` (`id_Lots`),
  CONSTRAINT `fk_sale_plan` FOREIGN KEY (`id_Plans`) REFERENCES `plans` (`id_Plans`),
  CONSTRAINT `fk_sales_users` FOREIGN KEY (`id_Users`) REFERENCES `users` (`id_Users`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales`
--

LOCK TABLES `sales` WRITE;
/*!40000 ALTER TABLE `sales` DISABLE KEYS */;
INSERT INTO `sales` VALUES (1,6,1,1,1,'2025-08-11',45000000.00,2000000.00,'Active',25000000.00,1194444,20000000.00),(2,7,2,1,1,'2025-08-19',49000000.00,40000000.00,'Active',40000000.00,250000,9000000.00),(3,6,3,1,1,'2025-04-15',40000000.00,2000000.00,'Active',12000000.00,1055556,28000000.00);
/*!40000 ALTER TABLE `sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id_Users` int NOT NULL AUTO_INCREMENT,
  `Nom_Users` varchar(45) NOT NULL,
  `Tip_Users` varchar(45) NOT NULL,
  `Email` varchar(45) NOT NULL,
  `Blockade` tinyint DEFAULT '0',
  `Attempts` int DEFAULT '0',
  `Token` varchar(500) DEFAULT NULL,
  `Hashed_Password` varchar(60) DEFAULT NULL,
  `Salt` varchar(250) DEFAULT NULL,
  `ResetToken` varchar(250) DEFAULT NULL,
  `ResetTokenExpiration` datetime DEFAULT NULL,
  `Status` enum('Activo','Inactivo') DEFAULT NULL,
  `LastActive` datetime DEFAULT NULL,
  PRIMARY KEY (`id_Users`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'SantiagoP','Administrador','santi2203@gmail.com',0,0,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InNhbnRpMjIwM0BnbWFpbC5jb20iLCJVc2VySWQiOiIxIiwicm9sZSI6IkFkbWluaXN0cmFkb3IiLCJuYmYiOjE3NTU5NTYzOTEsImV4cCI6MTc1NTk1OTk5MSwiaWF0IjoxNzU1OTU2MzkxLCJpc3MiOiJNeU1zb2Z0Y29tQVBJIiwiYXVkIjoiTXlNc29mdGNvbUZyb250ZW5kIn0.08yAiOUUAuZ_T4rrrnK9xZDoyDbkvn4Bj7X93zHoq-Q','$2a$11$2HEFSaSPBacUHkL6x95z4uhhQcZlNbQG3YoJ8m7YKJFVjQEmmXYfe','$2a$11$e.JP7nE1TcfL8NtyXq1DLO','urslmKMwm0eYCV67+moLpA==','2025-07-16 18:53:43','Activo','2025-08-23 13:39:51'),(5,'prueba','Vendedor','prueba@gmail.com',0,0,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InBydWViYUBnbWFpbC5jb20iLCJVc2VySWQiOiI1Iiwicm9sZSI6IlZlbmRlZG9yIiwibmJmIjoxNzU0OTQ0NDAyLCJleHAiOjE3NTQ5NDgwMDIsImlhdCI6MTc1NDk0NDQwMiwiaXNzIjoiTXlNc29mdGNvbUFQSSIsImF1ZCI6Ik15TXNvZnRjb21Gcm9udGVuZCJ9.P7CNjYTZmhlaeKb_Abtrju0qgrl0iVv8GAxrr4Y96n8','$2a$11$Iv4.XvpLvzkzF3lSHrgexuO5oVOKtZdxedY9O9J0iQ.HMFoWoiSdK','$2a$11$WXq79aGw5KNmLAhBcqHJau','HHXdAGXV4UayxXdd+fFxiQ==','2025-08-11 17:58:14','Activo','2025-08-11 20:33:23');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `withdrawals`
--

DROP TABLE IF EXISTS `withdrawals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `withdrawals` (
  `id_Withdrawals` int NOT NULL AUTO_INCREMENT,
  `id_Sales` int NOT NULL,
  `reason` varchar(255) NOT NULL,
  `withdrawal_date` date NOT NULL,
  `penalty` decimal(18,2) NOT NULL,
  PRIMARY KEY (`id_Withdrawals`),
  KEY `fk_withdrawal_sale` (`id_Sales`),
  CONSTRAINT `fk_withdrawal_sale` FOREIGN KEY (`id_Sales`) REFERENCES `sales` (`id_Sales`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `withdrawals`
--

LOCK TABLES `withdrawals` WRITE;
/*!40000 ALTER TABLE `withdrawals` DISABLE KEYS */;
/*!40000 ALTER TABLE `withdrawals` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-08-23  9:11:28
