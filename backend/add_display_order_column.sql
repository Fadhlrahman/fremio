-- Add display_order column to frames table
ALTER TABLE frames ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS idx_frames_display_order ON frames(display_order);

-- Verify column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'frames' AND column_name = 'display_order';
