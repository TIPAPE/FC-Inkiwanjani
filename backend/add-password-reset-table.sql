-- ============================================
-- PASSWORD RESET TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `tokenID` int NOT NULL AUTO_INCREMENT,
  `userID` int DEFAULT NULL,
  `adminUserID` int DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` timestamp NOT NULL,
  `used` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tokenID`),
  KEY `idx_token` (`token`),
  KEY `idx_email` (`email`),
  KEY `idx_user` (`userID`),
  KEY `idx_admin` (`adminUserID`),
  CONSTRAINT `fk_reset_user` FOREIGN KEY (`userID`) REFERENCES `users` (`userID`) ON DELETE CASCADE,
  CONSTRAINT `fk_reset_admin` FOREIGN KEY (`adminUserID`) REFERENCES `admin_users` (`adminUserID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
