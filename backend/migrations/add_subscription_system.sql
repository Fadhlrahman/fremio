-- Migration: Add Subscription System (Simple: Free vs Paid)
-- Run this on your database

-- Add premium column to frames table
ALTER TABLE frames ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE frames ADD COLUMN IF NOT EXISTS description TEXT;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  plan_type VARCHAR(20) NOT NULL DEFAULT 'paid', -- only 'paid' for now
  billing_cycle VARCHAR(20) NOT NULL, -- 'monthly', 'annual'
  status VARCHAR(20) NOT NULL, -- 'active', 'expired', 'cancelled', 'pending'
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  auto_renew BOOLEAN DEFAULT TRUE,
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_user_status (user_id, status),
  INDEX idx_expires (expires_at)
);

-- Create transactions table for payment tracking
CREATE TABLE IF NOT EXISTS transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  plan_id VARCHAR(50) NOT NULL, -- 'paid_monthly' or 'paid_annual'
  amount INT NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'pending', 'success', 'failed', 'cancelled'
  payment_method VARCHAR(50),
  payment_provider VARCHAR(50) DEFAULT 'midtrans',
  midtrans_transaction_id VARCHAR(255),
  midtrans_transaction_status VARCHAR(50),
  midtrans_fraud_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_order_id (order_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_frames_premium ON frames(is_premium);

-- Insert sample data (optional - for testing)
-- Free frames
INSERT INTO frames (name, category, image_url, is_premium, description) VALUES
('Basic Birthday', 'birthday', '/uploads/frames/basic-birthday.png', FALSE, 'Simple birthday frame'),
('Classic Wedding', 'wedding', '/uploads/frames/classic-wedding.png', FALSE, 'Classic wedding frame');

-- Paid frames
INSERT INTO frames (name, category, image_url, is_premium, description) VALUES
('Premium Birthday Gold', 'birthday', '/uploads/frames/premium-birthday.png', TRUE, 'Premium gold birthday frame'),
('Elegant Wedding', 'wedding', '/uploads/frames/elegant-wedding.png', TRUE, 'Elegant premium wedding frame');
