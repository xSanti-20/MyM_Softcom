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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'SantiagoP','Administrador','santi2203@gmail.com',0,0,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InNhbnRpMjIwM0BnbWFpbC5jb20iLCJVc2VySWQiOiIxIiwicm9sZSI6IkFkbWluaXN0cmFkb3IiLCJuYmYiOjE3NTI3MDIzMTAsImV4cCI6MTc1MjcwNTkxMCwiaWF0IjoxNzUyNzAyMzEwLCJpc3MiOiJNeU1zb2Z0Y29tQVBJIiwiYXVkIjoiTXlNc29mdGNvbUZyb250ZW5kIn0.nxgcRVhZi0YlMg13DnwZ2BAI-X2Zn3-AEdpr0_ftJsI','$2a$11$2HEFSaSPBacUHkL6x95z4uhhQcZlNbQG3YoJ8m7YKJFVjQEmmXYfe','$2a$11$e.JP7nE1TcfL8NtyXq1DLO','urslmKMwm0eYCV67+moLpA==','2025-07-16 18:53:43','Activo','2025-07-16 21:45:11');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-17  8:15:53
