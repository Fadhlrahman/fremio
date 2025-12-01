-- ================================================
-- FREMIO SUPABASE MIGRATION
-- Migrasi Analytics dan Users dari Firebase ke Supabase
-- ================================================

-- 1. Tabel untuk registered users (dari Firebase Auth)
CREATE TABLE IF NOT EXISTS fremio_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    uid TEXT UNIQUE,                    -- Firebase UID
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    display_name TEXT,
    role TEXT DEFAULT 'user',           -- 'user' atau 'admin'
    status TEXT DEFAULT 'active',       -- 'active' atau 'inactive'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel untuk user sessions (tracking visitor)
CREATE TABLE IF NOT EXISTS fremio_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,              -- Firebase UID atau anonymous ID
    first_visit DATE NOT NULL,
    last_visit DATE NOT NULL,
    visit_days TEXT[] DEFAULT '{}',     -- Array of dates visited
    total_sessions INTEGER DEFAULT 1,
    has_downloaded BOOLEAN DEFAULT FALSE,
    first_download_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel untuk daily analytics
CREATE TABLE IF NOT EXISTS fremio_daily_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    unique_users TEXT[] DEFAULT '{}',   -- Array of user IDs
    total_visits INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    frame_views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel untuk analytics events
CREATE TABLE IF NOT EXISTS fremio_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT,
    event_type TEXT NOT NULL,           -- 'download', 'frame_view', 'registration', etc
    event_data JSONB DEFAULT '{}',      -- Additional data (frame_id, etc)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel untuk frame usage tracking
CREATE TABLE IF NOT EXISTS fremio_frame_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    frame_id TEXT NOT NULL,
    frame_name TEXT,
    usage_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(frame_id)
);

-- 6. Tabel untuk funnel tracking
CREATE TABLE IF NOT EXISTS fremio_funnel (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    stage TEXT NOT NULL,                -- 'visit', 'view_frames', 'select_frame', 'take_photo', 'download'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON fremio_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_visit ON fremio_sessions(last_visit);
CREATE INDEX IF NOT EXISTS idx_daily_date ON fremio_daily_analytics(date);
CREATE INDEX IF NOT EXISTS idx_events_type ON fremio_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON fremio_events(created_at);
CREATE INDEX IF NOT EXISTS idx_funnel_stage ON fremio_funnel(stage);
CREATE INDEX IF NOT EXISTS idx_funnel_created ON fremio_funnel(created_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON fremio_users(email);
CREATE INDEX IF NOT EXISTS idx_frame_usage_frame_id ON fremio_frame_usage(frame_id);

-- Enable RLS (Row Level Security)
ALTER TABLE fremio_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE fremio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fremio_daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE fremio_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fremio_frame_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE fremio_funnel ENABLE ROW LEVEL SECURITY;

-- Policies untuk anon access (karena app ini public)
-- Allow insert for all (untuk tracking)
CREATE POLICY "Allow insert for all" ON fremio_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for all" ON fremio_daily_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for all" ON fremio_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for all" ON fremio_frame_usage FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for all" ON fremio_funnel FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for all" ON fremio_users FOR INSERT WITH CHECK (true);

-- Allow update for all (untuk tracking updates)
CREATE POLICY "Allow update for all" ON fremio_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow update for all" ON fremio_daily_analytics FOR UPDATE USING (true);
CREATE POLICY "Allow update for all" ON fremio_frame_usage FOR UPDATE USING (true);
CREATE POLICY "Allow update for all" ON fremio_users FOR UPDATE USING (true);

-- Allow select for all (untuk admin dashboard)
CREATE POLICY "Allow select for all" ON fremio_sessions FOR SELECT USING (true);
CREATE POLICY "Allow select for all" ON fremio_daily_analytics FOR SELECT USING (true);
CREATE POLICY "Allow select for all" ON fremio_events FOR SELECT USING (true);
CREATE POLICY "Allow select for all" ON fremio_frame_usage FOR SELECT USING (true);
CREATE POLICY "Allow select for all" ON fremio_funnel FOR SELECT USING (true);
CREATE POLICY "Allow select for all" ON fremio_users FOR SELECT USING (true);

-- ================================================
-- MIGRATE EXISTING DATA (Optional)
-- Jalankan ini setelah migrasi selesai untuk insert data existing
-- ================================================

-- Insert 9 existing users from Firebase (based on conversation history)
-- INSERT INTO fremio_users (uid, email, name, role, status) VALUES
-- ('uid1', 'user1@email.com', 'User 1', 'user', 'active'),
-- ... add your existing users here
