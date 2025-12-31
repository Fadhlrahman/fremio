-- Adds per-frame flow type: 'fixed' (default) or 'personalized'

ALTER TABLE frames
ADD COLUMN IF NOT EXISTS flow_type TEXT NOT NULL DEFAULT 'fixed';

-- Optional: enforce allowed values (safe to apply repeatedly)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'frames_flow_type_check'
  ) THEN
    ALTER TABLE frames
    ADD CONSTRAINT frames_flow_type_check
    CHECK (flow_type IN ('fixed', 'personalized'));
  END IF;
END $$;
