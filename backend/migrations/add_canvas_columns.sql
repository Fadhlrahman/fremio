-- Add canvas dimension/background columns used by the current frames API
ALTER TABLE frames
  ADD COLUMN IF NOT EXISTS canvas_background TEXT DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS canvas_width INTEGER DEFAULT 1080,
  ADD COLUMN IF NOT EXISTS canvas_height INTEGER DEFAULT 1920;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'frames'
  AND column_name IN ('canvas_background','canvas_width','canvas_height');
