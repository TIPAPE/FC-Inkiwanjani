-- ============================================
-- MIGRATION: Fix comments table for guest comments
-- Run this if your database already exists
-- ============================================

USE fc_inkiwanjani;

-- Drop existing foreign key first
ALTER TABLE comments
DROP FOREIGN KEY comments_ibfk_1;

-- Make userID nullable for guest comments
ALTER TABLE comments
MODIFY COLUMN userID INT NULL;

-- Re-add foreign key with ON DELETE SET NULL
ALTER TABLE comments
ADD CONSTRAINT fk_comments_user
FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE SET NULL;

SELECT 'Comments table updated for guest comments!' AS message;
