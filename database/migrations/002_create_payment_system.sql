-- Migration: Payment System for Frame Packages
-- Created: 2025-12-11
-- Description: Tables untuk payment, packages, dan user access tracking

-- Table: frame_packages
-- Stores frame packages (1 package = 10 frames)
CREATE TABLE IF NOT EXISTS frame_packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  frame_ids TEXT[] NOT NULL, -- Array of frame IDs (max 10)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: payment_transactions
-- Stores all payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL, -- Firebase UID
  order_id VARCHAR(100) UNIQUE NOT NULL, -- Midtrans order ID
  gross_amount INTEGER NOT NULL DEFAULT 10000,
  payment_type VARCHAR(50), -- e.g., 'gopay', 'bank_transfer', 'credit_card'
  transaction_status VARCHAR(50) DEFAULT 'pending', -- pending, settlement, cancel, deny, expire
  transaction_time TIMESTAMP,
  settlement_time TIMESTAMP,
  midtrans_transaction_id VARCHAR(255),
  midtrans_response TEXT, -- JSON response from Midtrans
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_package_access
-- Tracks which packages user can access
CREATE TABLE IF NOT EXISTS user_package_access (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL, -- Firebase UID
  transaction_id INTEGER REFERENCES payment_transactions(id) ON DELETE CASCADE,
  package_ids INTEGER[] NOT NULL, -- Array of 3 package IDs
  access_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  access_end TIMESTAMP NOT NULL, -- 30 days from start
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_active_access UNIQUE(user_id, is_active)
);

-- Indexes for performance
CREATE INDEX idx_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX idx_transactions_status ON payment_transactions(transaction_status);
CREATE INDEX idx_user_access_user_id ON user_package_access(user_id);
CREATE INDEX idx_user_access_active ON user_package_access(user_id, is_active);
CREATE INDEX idx_user_access_end ON user_package_access(access_end);

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_frame_packages_updated_at BEFORE UPDATE ON frame_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_package_access_updated_at BEFORE UPDATE ON user_package_access
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Check and deactivate expired access
CREATE OR REPLACE FUNCTION deactivate_expired_access()
RETURNS void AS $$
BEGIN
  UPDATE user_package_access
  SET is_active = false
  WHERE is_active = true 
    AND access_end < CURRENT_TIMESTAMP;
END;
$$ language 'plpgsql';

-- Comments
COMMENT ON TABLE frame_packages IS 'Frame packages - each package contains 10 frames';
COMMENT ON TABLE payment_transactions IS 'All payment transactions via Midtrans';
COMMENT ON TABLE user_package_access IS 'User access to purchased packages (3 packages per payment)';
COMMENT ON COLUMN user_package_access.access_end IS 'Access expires 30 days after purchase';
