-- Migration: Create user_drafts table for cloud draft storage
-- Run: psql -U fremio -d fremio -f 001_create_user_drafts.sql

-- ============================================
-- USER DRAFT STORAGE (Cloud saves & shares)
-- ============================================
CREATE TABLE IF NOT EXISTS user_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255),  -- Can be null for public shares, UUID string or email
    share_id VARCHAR(16) UNIQUE NOT NULL,
    title VARCHAR(255) DEFAULT 'Untitled' NOT NULL,
    frame_data TEXT NOT NULL,  -- JSON string with all elements
    preview_url TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_drafts_user_id ON user_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_drafts_share_id ON user_drafts(share_id);
CREATE INDEX IF NOT EXISTS idx_user_drafts_is_public ON user_drafts(is_public);

-- Add comment
COMMENT ON TABLE user_drafts IS 'Stores user-created frames from CreateHub for cloud sync and sharing';
