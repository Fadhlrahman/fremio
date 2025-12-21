-- Migration: Update user_package_access table to match code expectations
-- This aligns the table with PaymentDatabaseService queries

BEGIN;

-- 1. Add is_active column (default TRUE for new records)
ALTER TABLE user_package_access 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Rename end_date to access_end for consistency
ALTER TABLE user_package_access 
RENAME COLUMN end_date TO access_end;

-- 3. Change from single package_id to array of package_ids
-- First, create new column
ALTER TABLE user_package_access 
ADD COLUMN IF NOT EXISTS package_ids INTEGER[];

-- Migrate existing data: convert single package_id to array [package_id]
UPDATE user_package_access 
SET package_ids = ARRAY[package_id]
WHERE package_ids IS NULL AND package_id IS NOT NULL;

-- Drop the old single package_id column
ALTER TABLE user_package_access 
DROP COLUMN IF EXISTS package_id;

-- 4. Set existing access records to is_active = TRUE if access_end is in future
UPDATE user_package_access
SET is_active = TRUE
WHERE access_end > NOW();

-- 5. Set expired access to is_active = FALSE
UPDATE user_package_access
SET is_active = FALSE
WHERE access_end <= NOW();

-- 6. Add check constraint to prevent negative package arrays
ALTER TABLE user_package_access 
ADD CONSTRAINT check_package_ids_not_empty 
CHECK (array_length(package_ids, 1) > 0);

COMMIT;

-- Show updated structure
\d user_package_access
