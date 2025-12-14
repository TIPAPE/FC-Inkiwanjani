-- Create Database
CREATE DATABASE IF NOT EXISTS fc_inkiwanjani 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Use the database
USE fc_inkiwanjani;

-- Create tables
CREATE TABLE players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    jersey_number INT NOT NULL UNIQUE,
    position ENUM('goalkeeper', 'defender', 'midfielder', 'forward') NOT NULL,
    age INT NOT NULL,
    goals INT DEFAULT 0,
    assists INT DEFAULT 0,
    appearances INT DEFAULT 0,
    yellow_cards INT DEFAULT 0,
    red_cards INT DEFAULT 0,
    date_joined DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_position (position),
    INDEX idx_active (is_active)
);

CREATE TABLE matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_date (match_date)
);

CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    ticket_type ENUM('vip', 'regular', 'student') NOT NULL,
    quantity INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    payment_status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    INDEX idx_match (match_id),
    INDEX idx_email (customer_email),
    INDEX idx_status (payment_status)
);

CREATE TABLE news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category ENUM('match-report', 'transfer', 'announcement', 'community') NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(100) DEFAULT 'FC Inkiwanjani',
    published_date DATE NOT NULL,
    is_published BOOLEAN DEFAULT TRUE,
    views INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_published (is_published, published_date)
);

CREATE TABLE gallery (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    upload_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL,
    INDEX idx_match (match_id),
    INDEX idx_date (upload_date)
);

CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    commenter_name VARCHAR(100) NOT NULL,
    comment_text TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_approved (is_approved)
);

CREATE TABLE polls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT,
    question VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    INDEX idx_active (is_active)
);

CREATE TABLE poll_votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poll_id INT NOT NULL,
    player_id INT NOT NULL,
    voter_ip VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_poll (poll_id),
    INDEX idx_player (player_id)
);

CREATE TABLE memberships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    membership_number VARCHAR(50) UNIQUE NOT NULL,
    membership_fee DECIMAL(10, 2) NOT NULL,
    join_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_active (is_active)
);

CREATE TABLE revenue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source ENUM('tickets', 'merchandise', 'membership', 'sponsorship', 'other') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description VARCHAR(255),
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_source (source),
    INDEX idx_date (transaction_date)
);

CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('super_admin', 'admin', 'editor') DEFAULT 'editor',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_active (is_active)
);

-- Insert default settings
INSERT INTO settings (setting_key, setting_value) VALUES
('ticket_price_vip', '20'),
('ticket_price_regular', '10'),
('ticket_price_student', '5'),
('membership_fee', '50'),
('club_name', 'FC Inkiwanjani'),
('club_slogan', 'The Pride of Mile 46'),
('club_nickname', 'The Wolves'),
('club_location', 'Mile 46, Nakuru County'),
('club_email', 'info@fcinkiwanjani.com'),
('club_phone', '+254 700 000 000');

-- Insert sample players
INSERT INTO players (name, jersey_number, position, age, goals, assists, appearances, yellow_cards) VALUES
('James Mwangi', 10, 'forward', 24, 18, 5, 22, 2),
('David Kamau', 1, 'goalkeeper', 28, 0, 0, 22, 1),
('Peter Ochieng', 5, 'defender', 26, 2, 1, 20, 5),
('Michael Kiprop', 7, 'midfielder', 23, 8, 12, 21, 3),
('John Mutua', 9, 'forward', 25, 15, 4, 22, 1),
('Samuel Wanjiru', 3, 'defender', 27, 1, 2, 19, 4),
('Patrick Otieno', 6, 'midfielder', 24, 5, 8, 21, 2),
('Joseph Korir', 11, 'forward', 22, 10, 6, 20, 1);

-- Insert sample matches
INSERT INTO matches (opponent, match_date, venue, competition, status, home_score, away_score) VALUES
('Rift Valley FC', '2025-11-20 15:00:00', 'home', 'league', 'upcoming', NULL, NULL),
('Molo Warriors', '2025-11-27 16:00:00', 'away', 'league', 'upcoming', NULL, NULL),
('Nakuru United', '2025-10-08 15:00:00', 'home', 'league', 'completed', 3, 1),
('Baringo Rangers', '2025-10-01 16:00:00', 'away', 'league', 'completed', 2, 2),
('Kabarnet FC', '2025-09-24 15:00:00', 'home', 'league', 'completed', 4, 0);

-- Create application user
CREATE USER IF NOT EXISTS 'inkiwanjani_app'@'localhost' IDENTIFIED BY 'InkiApp@2025';
GRANT ALL PRIVILEGES ON fc_inkiwanjani.* TO 'inkiwanjani_app'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SELECT 'Database setup completed successfully!' AS message;
SHOW TABLES;