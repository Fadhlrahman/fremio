-- Create user_package_access table for premium frame access management
CREATE TABLE IF NOT EXISTS user_package_access (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    package_id INTEGER NOT NULL REFERENCES frame_packages(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
    start_date TIMESTAMP NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_package_access_user_id ON user_package_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_package_access_end_date ON user_package_access(end_date);
CREATE INDEX IF NOT EXISTS idx_user_package_access_active ON user_package_access(user_id, end_date) 
WHERE end_date > NOW();

-- Add comment
COMMENT ON TABLE user_package_access IS 'Tracks which users have access to which frame packages and when access expires';
