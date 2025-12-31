-- Add preferences JSONB to shared_groups for group share page configuration

ALTER TABLE IF EXISTS shared_groups
  ADD COLUMN IF NOT EXISTS preferences JSONB;
