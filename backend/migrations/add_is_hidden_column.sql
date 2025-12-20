-- Add is_hidden column to frames table
-- This allows admin to hide frames from user view while keeping them in database

ALTER TABLE frames
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_frames_is_hidden ON frames(is_hidden);
CREATE INDEX IF NOT EXISTS idx_frames_active_hidden ON frames(is_active, is_hidden);

-- Update migration tracking (if using migration system)
INSERT INTO migrations (name, executed_at) 
VALUES ('add_is_hidden_column', NOW())
ON CONFLICT DO NOTHING;
