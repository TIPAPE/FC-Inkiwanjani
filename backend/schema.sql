-- ============================================
-- FC INKIWANJANI DATABASE SCHEMA (FIXED)
-- ============================================
-- Table creation order fixed to avoid FK errors
-- ============================================

-- Create Database
CREATE DATABASE IF NOT EXISTS fc_inkiwanjani 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Use the database
USE fc_inkiwanjani;

-- ============================================
-- TABLE: matches (MUST BE FIRST - referenced by players & bookings)
-- ============================================
CREATE TABLE matches (
    matchID INT AUTO_INCREMENT PRIMARY KEY,
    opponent VARCHAR(100) NOT NULL,
    match_date DATETIME NOT NULL,
    venue ENUM('home', 'away') NOT NULL,
    competition ENUM('league', 'cup', 'friendly') NOT NULL,
    status ENUM('upcoming', 'live', 'completed', 'cancelled') DEFAULT 'upcoming',
    home_score INT DEFAULT NULL,
    away_score INT DEFAULT NULL,
    summary TEXT,
    attendance INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_date (match_date)
);

-- ============================================
-- TABLE: players
-- Relationship: Matches → Players (1:N)
-- ============================================
CREATE TABLE players (
    playerID INT AUTO_INCREMENT PRIMARY KEY,
    matchID INT,
    name VARCHAR(100) NOT NULL,
    jersey_number INT NOT NULL UNIQUE,
    position ENUM('goalkeeper', 'defender', 'midfielder', 'forward') NOT NULL,
    age INT NOT NULL,
    goals INT DEFAULT 0,
    assists INT DEFAULT 0,
    appearances INT DEFAULT 0,
    yellow_cards INT DEFAULT 0,
    red_cards INT DEFAULT 0,
    date_joined DATE DEFAULT (CURRENT_DATE),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (matchID) REFERENCES matches(matchID) ON DELETE SET NULL,
    INDEX idx_match (matchID),
    INDEX idx_position (position),
    INDEX idx_active (is_active)
);

-- ============================================
-- TABLE: users (MUST BE BEFORE bookings, comments, memberships)
-- ============================================
CREATE TABLE users (
    userID INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_active (is_active)
);

-- ============================================
-- TABLE: admin_users (MUST BE BEFORE news, gallery, polls, settings)
-- ============================================
CREATE TABLE admin_users (
    adminUserID INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('super_admin', 'admin', 'editor') DEFAULT 'editor',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_active (is_active)
);

-- ============================================
-- TABLE: bookings
-- Relationships: 
--   - Matches → Bookings (1:N)
--   - Users → Bookings (1:N)
-- ============================================
CREATE TABLE bookings (
    bookingID INT AUTO_INCREMENT PRIMARY KEY,
    matchID INT NOT NULL,
    userID INT NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    ticket_type ENUM('vip', 'regular', 'student') NOT NULL,
    quantity INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    payment_status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (matchID) REFERENCES matches(matchID) ON DELETE CASCADE,
    FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE,
    INDEX idx_match (matchID),
    INDEX idx_user (userID),
    INDEX idx_email (customer_email),
    INDEX idx_status (payment_status)
);

-- ============================================
-- TABLE: revenue
-- Relationship: Bookings → Revenue (N:1)
-- ============================================
CREATE TABLE revenue (
    revenueID INT AUTO_INCREMENT PRIMARY KEY,
    bookingID INT,
    source ENUM('tickets', 'merchandise', 'membership', 'sponsorship', 'other') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description VARCHAR(255),
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bookingID) REFERENCES bookings(bookingID) ON DELETE SET NULL,
    INDEX idx_booking (bookingID),
    INDEX idx_source (source),
    INDEX idx_date (transaction_date)
);

-- ============================================
-- TABLE: news
-- Relationship: Admin_Users → News (1:N)
-- ============================================
CREATE TABLE news (
    newsID INT AUTO_INCREMENT PRIMARY KEY,
    adminUserID INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    category ENUM('match-report', 'transfer', 'announcement', 'community') NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(100) DEFAULT 'FC Inkiwanjani',
    published_date DATE NOT NULL,
    is_published BOOLEAN DEFAULT TRUE,
    views INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (adminUserID) REFERENCES admin_users(adminUserID) ON DELETE CASCADE,
    INDEX idx_admin (adminUserID),
    INDEX idx_category (category),
    INDEX idx_published (is_published, published_date)
);

-- ============================================
-- TABLE: gallery
-- Relationship: Admin_Users → Gallery (1:N)
-- ============================================
CREATE TABLE gallery (
    galleryID INT AUTO_INCREMENT PRIMARY KEY,
    adminUserID INT NOT NULL,
    matchID INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    upload_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (adminUserID) REFERENCES admin_users(adminUserID) ON DELETE CASCADE,
    FOREIGN KEY (matchID) REFERENCES matches(matchID) ON DELETE SET NULL,
    INDEX idx_admin (adminUserID),
    INDEX idx_date (upload_date),
    INDEX idx_match (matchID)
);

-- ============================================
-- TABLE: comments
-- Relationship: Users → Comments (1:N)
-- ============================================
CREATE TABLE comments (
    commentID INT AUTO_INCREMENT PRIMARY KEY,
    userID INT,
    commenter_name VARCHAR(100) NOT NULL,
    comment_text TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE SET NULL,
    INDEX idx_user (userID),
    INDEX idx_approved (is_approved)
);

-- ============================================
-- TABLE: memberships
-- Relationship: Users → Memberships (1:1)
-- ============================================
CREATE TABLE memberships (
    membershipID INT AUTO_INCREMENT PRIMARY KEY,
    userID INT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    membership_number VARCHAR(50) UNIQUE NOT NULL,
    membership_fee DECIMAL(10, 2) NOT NULL,
    join_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE SET NULL,
    INDEX idx_user (userID),
    INDEX idx_email (email),
    INDEX idx_active (is_active)
);

-- ============================================
-- TABLE: polls
-- Relationship: Admin_Users → Polls (1:N)
-- ============================================
CREATE TABLE polls (
    pollID INT AUTO_INCREMENT PRIMARY KEY,
    adminUserID INT NOT NULL,
    question VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (adminUserID) REFERENCES admin_users(adminUserID) ON DELETE CASCADE,
    INDEX idx_admin (adminUserID),
    INDEX idx_active (is_active)
);

-- ============================================
-- TABLE: poll_votes
-- Relationships: 
--   - Polls → Poll_Votes (1:N)
--   - Players → Poll_Votes (1:N)
-- ============================================
CREATE TABLE poll_votes (
    pollVoteID INT AUTO_INCREMENT PRIMARY KEY,
    pollID INT NOT NULL,
    playerID INT NOT NULL,
    voter_ip VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pollID) REFERENCES polls(pollID) ON DELETE CASCADE,
    FOREIGN KEY (playerID) REFERENCES players(playerID) ON DELETE CASCADE,
    INDEX idx_poll (pollID),
    INDEX idx_player (playerID)
);

-- ============================================
-- TABLE: settings
-- Relationship: Admin_Users → Settings (1:N)
-- ============================================
CREATE TABLE settings (
    settingID INT AUTO_INCREMENT PRIMARY KEY,
    adminUserID INT NOT NULL,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (adminUserID) REFERENCES admin_users(adminUserID) ON DELETE CASCADE,
    INDEX idx_admin (adminUserID)
);

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- First, create a default admin user
INSERT INTO admin_users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@fcinkiwanjani.com', '$2b$10$dummyhashforexample', 'System Administrator', 'super_admin');

-- Get the admin user ID
SET @admin_id = LAST_INSERT_ID();

-- Insert default settings with admin reference
INSERT INTO settings (adminUserID, setting_key, setting_value) VALUES
(@admin_id, 'ticket_price_vip', '20'),
(@admin_id, 'ticket_price_regular', '10'),
(@admin_id, 'ticket_price_student', '5'),
(@admin_id, 'membership_fee', '50'),
(@admin_id, 'club_name', 'FC Inkiwanjani'),
(@admin_id, 'club_slogan', 'The Pride of Mile 46'),
(@admin_id, 'club_nickname', 'The Wolves'),
(@admin_id, 'club_location', 'Mile 46, Nakuru County'),
(@admin_id, 'club_email', 'info@fcinkiwanjani.com'),
(@admin_id, 'club_phone', '+254 700 000 000');

-- Insert sample matches
INSERT INTO matches (opponent, match_date, venue, competition, status, home_score, away_score) VALUES
('Rift Valley FC', '2025-11-20 15:00:00', 'home', 'league', 'upcoming', NULL, NULL),
('Molo Warriors', '2025-11-27 16:00:00', 'away', 'league', 'upcoming', NULL, NULL),
('Nakuru United', '2025-10-08 15:00:00', 'home', 'league', 'completed', 3, 1),
('Baringo Rangers', '2025-10-01 16:00:00', 'away', 'league', 'completed', 2, 2),
('Kabarnet FC', '2025-09-24 15:00:00', 'home', 'league', 'completed', 4, 0);

-- Insert sample players (with matchID references)
INSERT INTO players (name, jersey_number, position, age, goals, assists, appearances, yellow_cards, matchID) VALUES
('James Mwangi', 10, 'forward', 24, 18, 5, 22, 2, 3),
('David Kamau', 1, 'goalkeeper', 28, 0, 0, 22, 1, 3),
('Peter Ochieng', 5, 'defender', 26, 2, 1, 20, 5, 3),
('Michael Kiprop', 7, 'midfielder', 23, 8, 12, 21, 3, 4),
('John Mutua', 9, 'forward', 25, 15, 4, 22, 1, 4),
('Samuel Wanjiru', 3, 'defender', 27, 1, 2, 19, 4, 4),
('Patrick Otieno', 6, 'midfielder', 24, 5, 8, 21, 2, 5),
('Joseph Korir', 11, 'forward', 22, 10, 6, 20, 1, 5);

-- ============================================
-- CREATE APPLICATION USER
-- ============================================
CREATE USER IF NOT EXISTS 'inkiwanjani_app'@'localhost' IDENTIFIED BY 'InkiApp@2025';
GRANT ALL PRIVILEGES ON fc_inkiwanjani.* TO 'inkiwanjani_app'@'localhost';
FLUSH PRIVILEGES;

-- ============================================
-- VERIFY SETUP
-- ============================================
SELECT 'Database setup completed successfully!' AS message;
SHOW TABLES;

-- Show all relationships
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    TABLE_SCHEMA = 'fc_inkiwanjani'
    AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY
    TABLE_NAME, CONSTRAINT_NAME;