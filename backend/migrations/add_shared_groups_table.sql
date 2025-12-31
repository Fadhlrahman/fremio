-- Create shared_groups table for sharing draft frame groups

CREATE TABLE IF NOT EXISTS shared_groups (
  id SERIAL PRIMARY KEY,
  share_id VARCHAR(32) UNIQUE NOT NULL,
  title VARCHAR(255),
  frames JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_groups_share_id ON shared_groups(share_id);
