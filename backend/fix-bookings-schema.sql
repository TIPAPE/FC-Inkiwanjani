-- ============================================
-- FIX: Allow NULL for userID in bookings table
-- This enables guest checkout (non-authenticated users)
-- ============================================

USE fc_inkiwanjani;

-- Alter the bookings table to allow NULL for userID
ALTER TABLE bookings 
MODIFY COLUMN userID INT NULL;

-- Verify the change
DESCRIBE bookings;

SELECT 'Bookings table updated successfully! userID is now optional.' AS message;
