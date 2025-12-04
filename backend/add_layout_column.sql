-- Add layout column to frames table
ALTER TABLE frames ADD COLUMN IF NOT EXISTS layout JSONB DEFAULT '{}';

-- Verify column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'frames' AND column_name = 'layout';
