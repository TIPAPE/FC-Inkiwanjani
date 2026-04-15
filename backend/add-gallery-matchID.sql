-- ============================================
-- MIGRATION: Add matchID to gallery table
-- Run this if your database already exists
-- ============================================

USE fc_inkiwanjani;

-- Add matchID column if it doesn't exist
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'fc_inkiwanjani' 
    AND TABLE_NAME = 'gallery' 
    AND COLUMN_NAME = 'matchID'
);

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE gallery ADD COLUMN matchID INT AFTER adminUserID', 
    'SELECT "Column matchID already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint if it doesn't exist
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = 'fc_inkiwanjani' 
    AND TABLE_NAME = 'gallery' 
    AND CONSTRAINT_NAME = 'fk_gallery_match'
);

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE gallery ADD CONSTRAINT fk_gallery_match FOREIGN KEY (matchID) REFERENCES matches(matchID) ON DELETE SET NULL', 
    'SELECT "Foreign key fk_gallery_match already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for match lookups if it doesn't exist
SET @idx_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = 'fc_inkiwanjani' 
    AND TABLE_NAME = 'gallery' 
    AND INDEX_NAME = 'idx_match'
);

SET @sql = IF(@idx_exists = 0, 
    'ALTER TABLE gallery ADD INDEX idx_match (matchID)', 
    'SELECT "Index idx_match already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Gallery table updated with matchID column!' AS message;
