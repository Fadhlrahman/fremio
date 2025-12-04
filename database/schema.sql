-- ============================================
-- FREMIO DATABASE SCHEMA
-- PostgreSQL
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    photo_url TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'kreator')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTION PLANS
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'IDR',
    features JSONB DEFAULT '[]',
    limits JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing')),
    billing_cycle VARCHAR(10) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    gateway VARCHAR(50),
    gateway_subscription_id VARCHAR(255),
    gateway_customer_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PAYMENT TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('subscription', 'one_time', 'refund', 'credit')),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IDR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'expired')),
    gateway VARCHAR(50) NOT NULL,
    gateway_transaction_id VARCHAR(255),
    gateway_response JSONB,
    invoice_number VARCHAR(50) UNIQUE,
    invoice_url TEXT,
    receipt_url TEXT,
    payment_method VARCHAR(50),
    payment_method_details JSONB,
    paid_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER USAGE TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS user_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    downloads_count INTEGER DEFAULT 0,
    frames_created INTEGER DEFAULT 0,
    storage_used_mb DECIMAL(10,2) DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, period_start)
);

-- ============================================
-- FRAMES TABLE (Admin uploaded)
-- ============================================
CREATE TABLE IF NOT EXISTS frames (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(50) DEFAULT 'custom',
    image_path TEXT NOT NULL,
    thumbnail_path TEXT,
    slots JSONB DEFAULT '[]',
    max_captures INTEGER DEFAULT 1,
    is_premium BOOLEAN DEFAULT false,
    required_plan VARCHAR(50) DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DRAFTS TABLE (User created)
-- ============================================
CREATE TABLE IF NOT EXISTS drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT 'Untitled',
    elements JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    thumbnail_path TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONTACT MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PAGE VIEWS & SESSIONS (Analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    page_path VARCHAR(500) NOT NULL,
    page_title VARCHAR(255),
    referrer TEXT,
    device_type VARCHAR(20),
    browser VARCHAR(50),
    browser_version VARCHAR(20),
    os VARCHAR(50),
    os_version VARCHAR(20),
    screen_width INTEGER,
    screen_height INTEGER,
    country VARCHAR(100),
    city VARCHAR(100),
    ip_address INET,
    time_on_page INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER SESSIONS (Analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    page_count INTEGER DEFAULT 0,
    entry_page VARCHAR(500),
    exit_page VARCHAR(500),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    referrer_domain VARCHAR(255),
    device_type VARCHAR(20),
    browser VARCHAR(50),
    os VARCHAR(50),
    country VARCHAR(100),
    is_bounce BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER EVENTS (Analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS user_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_name VARCHAR(100) NOT NULL,
    event_category VARCHAR(50),
    event_data JSONB DEFAULT '{}',
    page_path VARCHAR(500),
    element_id VARCHAR(100),
    element_class VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DOWNLOAD LOGS (Analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS download_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    frame_id VARCHAR(100) REFERENCES frames(id) ON DELETE SET NULL,
    frame_name VARCHAR(255),
    file_format VARCHAR(20),
    file_size_kb INTEGER,
    download_source VARCHAR(50),
    user_plan VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DAILY STATS (Aggregated Analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stat_date DATE NOT NULL UNIQUE,
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    returning_users INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    total_page_views INTEGER DEFAULT 0,
    avg_session_duration INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    total_downloads INTEGER DEFAULT 0,
    unique_downloaders INTEGER DEFAULT 0,
    new_subscriptions INTEGER DEFAULT 0,
    cancelled_subscriptions INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER COHORTS (Retention Analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS user_cohorts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cohort_date DATE NOT NULL,
    cohort_type VARCHAR(20) DEFAULT 'weekly',
    day_0_active BOOLEAN DEFAULT true,
    day_1_active BOOLEAN DEFAULT false,
    day_7_active BOOLEAN DEFAULT false,
    day_14_active BOOLEAN DEFAULT false,
    day_30_active BOOLEAN DEFAULT false,
    day_60_active BOOLEAN DEFAULT false,
    day_90_active BOOLEAN DEFAULT false,
    activated BOOLEAN DEFAULT false,
    activation_date TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, cohort_type)
);

-- ============================================
-- AUDIT LOG (Important changes)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON user_subscriptions(current_period_end);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_gateway ON payment_transactions(gateway, gateway_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON payment_transactions(invoice_number);

CREATE INDEX IF NOT EXISTS idx_usage_user_period ON user_usage(user_id, period_start);

CREATE INDEX IF NOT EXISTS idx_frames_category ON frames(category);
CREATE INDEX IF NOT EXISTS idx_frames_premium ON frames(is_premium);
CREATE INDEX IF NOT EXISTS idx_frames_active ON frames(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_frames_created ON frames(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_drafts_user ON drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_updated ON drafts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);

CREATE INDEX IF NOT EXISTS idx_contact_read ON contact_messages(is_read);

CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(page_path);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON user_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON user_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_events_session ON user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_user ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_name ON user_events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_date ON user_events(created_at);

CREATE INDEX IF NOT EXISTS idx_downloads_user ON download_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_frame ON download_logs(frame_id);
CREATE INDEX IF NOT EXISTS idx_downloads_date ON download_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(stat_date);

CREATE INDEX IF NOT EXISTS idx_cohorts_user ON user_cohorts(user_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_date ON user_cohorts(cohort_date);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log(table_name, record_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Get user's active subscription
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS TABLE (
    plan_id VARCHAR(50),
    plan_name VARCHAR(100),
    status VARCHAR(20),
    period_end TIMESTAMP WITH TIME ZONE,
    limits JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.plan_id,
        p.name,
        s.status,
        s.current_period_end,
        p.limits
    FROM user_subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
    AND s.current_period_end > NOW()
    ORDER BY p.price_monthly DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Check if user can download
CREATE OR REPLACE FUNCTION can_user_download(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit INTEGER;
    v_used INTEGER;
BEGIN
    SELECT (p.limits->>'downloads_per_month')::INTEGER
    INTO v_limit
    FROM user_subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND s.current_period_end > NOW();
    
    IF v_limit IS NULL THEN
        v_limit := 5;
    END IF;
    
    IF v_limit = -1 THEN
        RETURN TRUE;
    END IF;
    
    SELECT downloads_count
    INTO v_used
    FROM user_usage
    WHERE user_id = p_user_id
    AND period_start = date_trunc('month', CURRENT_DATE)::DATE;
    
    IF v_used IS NULL THEN
        v_used := 0;
    END IF;
    
    RETURN v_used < v_limit;
END;
$$ LANGUAGE plpgsql;

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    v_year VARCHAR(4);
    v_month VARCHAR(2);
    v_sequence INTEGER;
    v_invoice VARCHAR(50);
BEGIN
    v_year := to_char(CURRENT_DATE, 'YYYY');
    v_month := to_char(CURRENT_DATE, 'MM');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 12) AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM payment_transactions
    WHERE invoice_number LIKE 'INV-' || v_year || v_month || '-%';
    
    v_invoice := 'INV-' || v_year || v_month || '-' || LPAD(v_sequence::TEXT, 5, '0');
    
    RETURN v_invoice;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_frames_updated_at ON frames;
CREATE TRIGGER update_frames_updated_at
    BEFORE UPDATE ON frames
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drafts_updated_at ON drafts;
CREATE TRIGGER update_drafts_updated_at
    BEFORE UPDATE ON drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON payment_transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger for subscription changes
CREATE OR REPLACE FUNCTION log_subscription_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        TG_OP,
        'user_subscriptions',
        COALESCE(NEW.id, OLD.id)::TEXT,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_subscription_changes ON user_subscriptions;
CREATE TRIGGER audit_subscription_changes
    AFTER INSERT OR UPDATE OR DELETE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION log_subscription_changes();

-- Audit trigger for payment changes
CREATE OR REPLACE FUNCTION log_payment_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        TG_OP,
        'payment_transactions',
        COALESCE(NEW.id, OLD.id)::TEXT,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_payment_changes ON payment_transactions;
CREATE TRIGGER audit_payment_changes
    AFTER INSERT OR UPDATE OR DELETE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION log_payment_changes();

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Default subscription plans
INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, limits) VALUES
('free', 'Free', 'Fitur dasar untuk pengguna biasa', 0, 0, 
 '["5 downloads/bulan", "Frame basic", "Watermark"]',
 '{"downloads_per_month": 5, "storage_mb": 100, "watermark": true}'),
('pro', 'Pro', 'Untuk content creator', 49000, 490000,
 '["Unlimited downloads", "Semua frame premium", "Tanpa watermark", "Priority support"]',
 '{"downloads_per_month": -1, "storage_mb": 5000, "watermark": false}'),
('business', 'Business', 'Untuk bisnis dan agency', 149000, 1490000,
 '["Semua fitur Pro", "Custom branding", "API access", "Team members", "Analytics"]',
 '{"downloads_per_month": -1, "storage_mb": 50000, "watermark": false, "team_members": 5}')
ON CONFLICT (id) DO NOTHING;

-- Default admin user
-- Email: admin@fremio.com
-- Password: admin123 (bcrypt hash)
INSERT INTO users (email, password_hash, display_name, role)
VALUES (
    'admin@fremio.com', 
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.M5nwZvvGNHhHxm', 
    'Admin Fremio', 
    'admin'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- VIEWS
-- ============================================

-- Active subscribers view
CREATE OR REPLACE VIEW active_subscribers AS
SELECT 
    u.id as user_id,
    u.email,
    u.display_name,
    s.plan_id,
    p.name as plan_name,
    p.price_monthly,
    s.status,
    s.billing_cycle,
    s.current_period_start,
    s.current_period_end,
    s.gateway
FROM users u
JOIN user_subscriptions s ON u.id = s.user_id
JOIN subscription_plans p ON s.plan_id = p.id
WHERE s.status IN ('active', 'trialing')
AND s.current_period_end > NOW();

-- Revenue summary view
CREATE OR REPLACE VIEW revenue_summary AS
SELECT 
    date_trunc('month', paid_at) as month,
    COUNT(*) as transaction_count,
    SUM(amount) as total_revenue,
    gateway,
    (SELECT name FROM subscription_plans sp 
     JOIN user_subscriptions us ON sp.id = us.plan_id 
     WHERE us.id = pt.subscription_id LIMIT 1) as plan_name
FROM payment_transactions pt
WHERE pt.status = 'completed'
GROUP BY date_trunc('month', paid_at), gateway, pt.subscription_id
ORDER BY month DESC;

-- ============================================
-- SAMPLE FRAME (Optional)
-- ============================================
-- INSERT INTO frames (id, name, description, category, image_path, slots, max_captures)
-- VALUES (
--     'sample-frame-001',
--     'Sample Frame',
--     'This is a sample frame for testing',
--     'sample',
--     '/uploads/frames/sample.webp',
--     '[{"id": "slot_1", "left": 0.05, "top": 0.1, "width": 0.4, "height": 0.35}]',
--     1
-- )
-- ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFY SETUP
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Database schema created successfully!';
    RAISE NOTICE '✅ Default admin user: admin@fremio.com / admin123';
END $$;
