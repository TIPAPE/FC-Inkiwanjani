-- ============================================
-- MIGRATION: Add matchID to gallery table
-- Run this if your database already exists
-- ============================================

USE fc_inkiwanjani;

-- Add matchID column if it doesn't exist
ALTER TABLE gallery
ADD COLUMN IF NOT EXISTS matchID INT AFTER adminUserID;

-- Add foreign key constraint
ALTER TABLE gallery
ADD CONSTRAINT fk_gallery_match
FOREIGN KEY (matchID) REFERENCES matches(matchID) ON DELETE SET NULL;

-- Add index for match lookups
ALTER TABLE gallery
ADD INDEX IF NOT EXISTS idx_match (matchID);

SELECT 'Gallery table updated with matchID column!' AS message;
