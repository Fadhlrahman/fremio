-- Quick Setup SQL Script untuk Payment Gateway
-- Run this after migration untuk setup initial data

-- ==========================================
-- 1. MARK FRAMES AS PREMIUM
-- ==========================================
-- Pilih frame IDs yang mau di-lock sebagai premium
-- Lihat daftar frames: SELECT id, name, category FROM frames;

-- Example: Mark frames dengan ID 5-34 sebagai premium
UPDATE frames 
SET is_premium = true 
WHERE id >= 5 AND id <= 34;

-- Or mark by category
-- UPDATE frames SET is_premium = true WHERE category IN ('Exclusive', 'Premium');

-- ==========================================
-- 2. CREATE FRAME PACKAGES
-- ==========================================
-- 1 Package = 10 frames, user beli dapat 3 packages

-- Package 1: First 10 premium frames
INSERT INTO frame_packages (name, description, frame_ids, is_active)
VALUES (
  'Paket Frame 1',
  'Koleksi frame premium pilihan',
  ARRAY[5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  true
);

-- Package 2: Next 10 premium frames  
INSERT INTO frame_packages (name, description, frame_ids, is_active)
VALUES (
  'Paket Frame 2',
  'Frame eksklusif untuk berbagai tema',
  ARRAY[15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  true
);

-- Package 3: Another 10 premium frames
INSERT INTO frame_packages (name, description, frame_ids, is_active)
VALUES (
  'Paket Frame 3',
  'Frame spesial edition',
  ARRAY[25, 26, 27, 28, 29, 30, 31, 32, 33, 34],
  true
);

-- ==========================================
-- 3. VERIFY SETUP
-- ==========================================

-- Check premium frames
SELECT id, name, category, is_premium 
FROM frames 
WHERE is_premium = true
ORDER BY id;

-- Check packages created
SELECT id, name, description, array_length(frame_ids, 1) as frame_count, is_active
FROM frame_packages
ORDER BY id;

-- ==========================================
-- 4. TEST DATA (Optional - for development)
-- ==========================================
-- Create test transaction for development
-- Replace 'test-user-id' with actual Firebase UID

-- INSERT INTO payment_transactions (
--   user_id,
--   order_id,
--   gross_amount,
--   transaction_status,
--   transaction_time,
--   settlement_time
-- ) VALUES (
--   'test-user-id',
--   'TEST-ORDER-001',
--   10000,
--   'settlement',
--   NOW(),
--   NOW()
-- );

-- Grant access for test user (30 days)
-- INSERT INTO user_package_access (
--   user_id,
--   transaction_id,
--   package_ids,
--   access_start,
--   access_end,
--   is_active
-- ) VALUES (
--   'test-user-id',
--   (SELECT id FROM payment_transactions WHERE order_id = 'TEST-ORDER-001'),
--   ARRAY[1, 2, 3],  -- All 3 packages
--   NOW(),
--   NOW() + INTERVAL '30 days',
--   true
-- );

-- ==========================================
-- NOTES:
-- ==========================================
-- 1. Sesuaikan frame IDs dengan frames yang ada di database kamu
-- 2. Setiap package harus punya max 10 frames
-- 3. User yang bayar Rp 10,000 dapat akses ke 3 packages (30 frames total)
-- 4. Akses berlaku 30 hari dari tanggal purchase
-- 5. Uncomment test data section untuk development testing
