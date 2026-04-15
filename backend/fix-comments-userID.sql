-- ============================================
-- MIGRATION: Fix comments table for guest comments
-- Run this if your database already exists
-- ============================================

USE fc_inkiwanjani;

-- Drop existing foreign key if it exists
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = 'fc_inkiwanjani' 
    AND TABLE_NAME = 'comments' 
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    AND CONSTRAINT_NAME LIKE '%user%'
);

-- Get the actual constraint name and drop it
SET @fk_name = (
    SELECT CONSTRAINT_NAME
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = 'fc_inkiwanjani' 
    AND TABLE_NAME = 'comments' 
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    AND CONSTRAINT_NAME LIKE '%user%'
    LIMIT 1
);

SET @sql = IF(@fk_name IS NOT NULL, 
    CONCAT('ALTER TABLE comments DROP FOREIGN KEY ', @fk_name), 
    'SELECT "No foreign key to drop" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Make userID nullable for guest comments
ALTER TABLE comments
MODIFY COLUMN userID INT NULL;

-- Re-add foreign key with ON DELETE SET NULL (if not exists)
SET @fk_new_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = 'fc_inkiwanjani' 
    AND TABLE_NAME = 'comments' 
    AND CONSTRAINT_NAME = 'fk_comments_user'
);

SET @sql = IF(@fk_new_exists = 0, 
    'ALTER TABLE comments ADD CONSTRAINT fk_comments_user FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE SET NULL', 
    'SELECT "Foreign key fk_comments_user already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Comments table updated for guest comments!' AS message;
