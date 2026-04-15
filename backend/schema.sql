-- ============================================
-- FC INKIWANJANI DATABASE SCHEMA
-- Generated: 2026-04-08T05:14:30.864Z
-- ============================================

-- Create Database
CREATE DATABASE IF NOT EXISTS fc_inkiwanjani
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- Use the database
USE fc_inkiwanjani;

-- ============================================
-- TABLE: admin_users
-- ============================================
CREATE TABLE `admin_users` (
  `adminUserID` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('super_admin','admin','editor') COLLATE utf8mb4_unicode_ci DEFAULT 'editor',
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`adminUserID`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: bookings
-- ============================================
CREATE TABLE `bookings` (
  `bookingID` int NOT NULL AUTO_INCREMENT,
  `matchID` int NOT NULL,
  `userID` int DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticket_type` enum('vip','regular','student') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `booking_reference` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_status` enum('pending','paid','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `booking_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`bookingID`),
  UNIQUE KEY `booking_reference` (`booking_reference`),
  KEY `idx_match` (`matchID`),
  KEY `idx_user` (`userID`),
  KEY `idx_email` (`customer_email`),
  KEY `idx_status` (`payment_status`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`matchID`) REFERENCES `matches` (`matchID`) ON DELETE CASCADE,
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`userID`) REFERENCES `users` (`userID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: comments
-- ============================================
CREATE TABLE `comments` (
  `commentID` int NOT NULL AUTO_INCREMENT,
  `userID` int DEFAULT NULL,
  `commenter_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_approved` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`commentID`),
  KEY `idx_user` (`userID`),
  KEY `idx_approved` (`is_approved`),
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`userID`) REFERENCES `users` (`userID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: gallery
-- ============================================
CREATE TABLE `gallery` (
  `galleryID` int NOT NULL AUTO_INCREMENT,
  `adminUserID` int NOT NULL,
  `matchID` int DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `upload_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`galleryID`),
  KEY `idx_admin` (`adminUserID`),
  KEY `idx_date` (`upload_date`),
  KEY `idx_match` (`matchID`),
  CONSTRAINT `fk_gallery_match` FOREIGN KEY (`matchID`) REFERENCES `matches` (`matchID`) ON DELETE SET NULL,
  CONSTRAINT `gallery_ibfk_1` FOREIGN KEY (`adminUserID`) REFERENCES `admin_users` (`adminUserID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: matches
-- ============================================
CREATE TABLE `matches` (
  `matchID` int NOT NULL AUTO_INCREMENT,
  `opponent` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `match_date` datetime NOT NULL,
  `venue` enum('home','away') COLLATE utf8mb4_unicode_ci NOT NULL,
  `competition` enum('league','cup','friendly') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('upcoming','live','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'upcoming',
  `home_score` int DEFAULT NULL,
  `away_score` int DEFAULT NULL,
  `summary` text COLLATE utf8mb4_unicode_ci,
  `attendance` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`matchID`),
  KEY `idx_status` (`status`),
  KEY `idx_date` (`match_date`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: memberships
-- ============================================
CREATE TABLE `memberships` (
  `membershipID` int NOT NULL AUTO_INCREMENT,
  `userID` int NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `membership_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `membership_fee` decimal(10,2) NOT NULL,
  `join_date` date NOT NULL,
  `expiry_date` date NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`membershipID`),
  UNIQUE KEY `userID` (`userID`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `membership_number` (`membership_number`),
  KEY `idx_user` (`userID`),
  KEY `idx_email` (`email`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `memberships_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `users` (`userID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: news
-- ============================================
CREATE TABLE `news` (
  `newsID` int NOT NULL AUTO_INCREMENT,
  `adminUserID` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('match-report','transfer','announcement','community') COLLATE utf8mb4_unicode_ci NOT NULL,
  `excerpt` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `author` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'FC Inkiwanjani',
  `published_date` date NOT NULL,
  `is_published` tinyint(1) DEFAULT '1',
  `views` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`newsID`),
  KEY `idx_admin` (`adminUserID`),
  KEY `idx_category` (`category`),
  KEY `idx_published` (`is_published`,`published_date`),
  CONSTRAINT `news_ibfk_1` FOREIGN KEY (`adminUserID`) REFERENCES `admin_users` (`adminUserID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: players
-- ============================================
CREATE TABLE `players` (
  `playerID` int NOT NULL AUTO_INCREMENT,
  `matchID` int DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jersey_number` int NOT NULL,
  `position` enum('goalkeeper','defender','midfielder','forward') COLLATE utf8mb4_unicode_ci NOT NULL,
  `age` int NOT NULL,
  `goals` int DEFAULT '0',
  `assists` int DEFAULT '0',
  `appearances` int DEFAULT '0',
  `yellow_cards` int DEFAULT '0',
  `red_cards` int DEFAULT '0',
  `date_joined` date DEFAULT (curdate()),
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`playerID`),
  UNIQUE KEY `jersey_number` (`jersey_number`),
  KEY `idx_match` (`matchID`),
  KEY `idx_position` (`position`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `players_ibfk_1` FOREIGN KEY (`matchID`) REFERENCES `matches` (`matchID`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: poll_votes
-- ============================================
CREATE TABLE `poll_votes` (
  `pollVoteID` int NOT NULL AUTO_INCREMENT,
  `pollID` int NOT NULL,
  `playerID` int NOT NULL,
  `voter_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`pollVoteID`),
  KEY `idx_poll` (`pollID`),
  KEY `idx_player` (`playerID`),
  CONSTRAINT `poll_votes_ibfk_1` FOREIGN KEY (`pollID`) REFERENCES `polls` (`pollID`) ON DELETE CASCADE,
  CONSTRAINT `poll_votes_ibfk_2` FOREIGN KEY (`playerID`) REFERENCES `players` (`playerID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: polls
-- ============================================
CREATE TABLE `polls` (
  `pollID` int NOT NULL AUTO_INCREMENT,
  `adminUserID` int NOT NULL,
  `question` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`pollID`),
  KEY `idx_admin` (`adminUserID`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `polls_ibfk_1` FOREIGN KEY (`adminUserID`) REFERENCES `admin_users` (`adminUserID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: revenue
-- ============================================
CREATE TABLE `revenue` (
  `revenueID` int NOT NULL AUTO_INCREMENT,
  `bookingID` int DEFAULT NULL,
  `source` enum('tickets','merchandise','membership','sponsorship','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transaction_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`revenueID`),
  KEY `idx_booking` (`bookingID`),
  KEY `idx_source` (`source`),
  KEY `idx_date` (`transaction_date`),
  CONSTRAINT `revenue_ibfk_1` FOREIGN KEY (`bookingID`) REFERENCES `bookings` (`bookingID`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: settings
-- ============================================
CREATE TABLE `settings` (
  `settingID` int NOT NULL AUTO_INCREMENT,
  `adminUserID` int NOT NULL,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`settingID`),
  UNIQUE KEY `setting_key` (`setting_key`),
  KEY `idx_admin` (`adminUserID`),
  CONSTRAINT `settings_ibfk_1` FOREIGN KEY (`adminUserID`) REFERENCES `admin_users` (`adminUserID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE `users` (
  `userID` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userID`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Table admin_users: 3 rows
-- Table bookings: 0 rows
-- Table comments: 0 rows
-- Table gallery: 0 rows
-- Table matches: 3 rows
-- Table memberships: 0 rows
-- Table news: 2 rows
-- Table players: 20 rows
-- Table poll_votes: 4 rows
-- Table polls: 1 rows
-- Table revenue: 4 rows
-- Table settings: 4 rows
-- Table users: 2 rows
