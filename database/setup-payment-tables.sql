-- ========================================
-- FREMIO PAYMENT SYSTEM - DATABASE SETUP
-- ========================================
-- Run this to create payment tables in PostgreSQL
-- Usage: psql -U postgres -d fremio -f setup-payment-tables.sql

-- Drop existing tables if needed (CAREFUL in production!)
-- DROP TABLE IF EXISTS user_package_access CASCADE;
-- DROP TABLE IF EXISTS payment_transactions CASCADE;
-- DROP TABLE IF EXISTS frame_packages CASCADE;

-- ========================================
-- 1. Frame Packages Table
-- ========================================
CREATE TABLE IF NOT EXISTS frame_packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    frame_count INTEGER DEFAULT 0,
    price INTEGER DEFAULT 10000, -- in Rupiah
    duration_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 2. Payment Transactions Table
-- ========================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- temp-xxx or UUID
    order_id VARCHAR(255) UNIQUE NOT NULL,
    gross_amount INTEGER NOT NULL,
    transaction_status VARCHAR(50) DEFAULT 'pending',
    payment_type VARCHAR(50),
    transaction_time TIMESTAMP,
    settlement_time TIMESTAMP,
    midtrans_transaction_id VARCHAR(255),
    midtrans_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_transactions(transaction_status);

-- ========================================
-- 3. User Package Access Table
-- ========================================
CREATE TABLE IF NOT EXISTS user_package_access (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    transaction_id INTEGER REFERENCES payment_transactions(id),
    package_ids INTEGER[] DEFAULT '{}', -- Array of package IDs
    access_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_end TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster access checks
CREATE INDEX IF NOT EXISTS idx_access_user_id ON user_package_access(user_id);
CREATE INDEX IF NOT EXISTS idx_access_active ON user_package_access(is_active);
CREATE INDEX IF NOT EXISTS idx_access_end ON user_package_access(access_end);

-- ========================================
-- 4. Insert Default Frame Packages
-- ========================================
INSERT INTO frame_packages (name, description, frame_count, price, duration_days)
VALUES 
    ('Fremio Series Package', 'Akses ke semua Fremio Series frames', 10, 10000, 30),
    ('Music Package', 'Akses ke semua Music-inspired frames', 10, 10000, 30),
    ('Sport Package', 'Akses ke semua Sport frames', 5, 10000, 30)
ON CONFLICT DO NOTHING;

-- ========================================
-- 5. Create Helper Functions
-- ========================================

-- Function to check if user has active access
CREATE OR REPLACE FUNCTION has_active_access(p_user_id VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_package_access
        WHERE user_id = p_user_id
        AND is_active = true
        AND access_end > CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get user accessible frames (placeholder for future use)
CREATE OR REPLACE FUNCTION get_user_accessible_frames(p_user_id VARCHAR)
RETURNS INTEGER[] AS $$
DECLARE
    frame_ids INTEGER[];
BEGIN
    SELECT COALESCE(array_agg(DISTINCT unnest(package_ids)), '{}')
    INTO frame_ids
    FROM user_package_access
    WHERE user_id = p_user_id
    AND is_active = true
    AND access_end > CURRENT_TIMESTAMP;
    
    RETURN frame_ids;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. Create Triggers for updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
DROP TRIGGER IF EXISTS update_frame_packages_updated_at ON frame_packages;
CREATE TRIGGER update_frame_packages_updated_at
    BEFORE UPDATE ON frame_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_package_access_updated_at ON user_package_access;
CREATE TRIGGER update_user_package_access_updated_at
    BEFORE UPDATE ON user_package_access
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- DONE! Tables created successfully
-- ========================================
SELECT 'Payment tables created successfully!' AS status;
SELECT 'Run this to verify:' AS next_step;
SELECT '  SELECT * FROM frame_packages;' AS command;
