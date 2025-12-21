-- Emergency: Manual Grant Access untuk Testing
-- Gunakan ini jika payment gateway belum ready tapi mau test frame unlock

-- 1. Get user Firebase UID (check console atau database)
-- Replace 'YOUR-FIREBASE-UID-HERE' dengan actual UID

-- 2. Check available packages
SELECT id, name FROM frame_packages WHERE is_active = true;

-- 3. Grant full access (30 days) to user
DO $$
DECLARE
  v_user_id VARCHAR(255) := 'YOUR-FIREBASE-UID-HERE'; -- REPLACE THIS!
  v_transaction_id INTEGER;
BEGIN
  -- Create dummy transaction record
  INSERT INTO payment_transactions (
    user_id,
    order_id,
    gross_amount,
    transaction_status,
    transaction_time,
    settlement_time
  ) VALUES (
    v_user_id,
    'MANUAL-' || to_char(NOW(), 'YYYYMMDDHH24MISS'),
    10000,
    'settlement',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  -- Grant access to all packages for 30 days
  INSERT INTO user_package_access (
    user_id,
    transaction_id,
    package_ids,
    access_start,
    access_end,
    is_active
  ) VALUES (
    v_user_id,
    v_transaction_id,
    ARRAY[1, 2, 3], -- All 3 packages
    NOW(),
    NOW() + INTERVAL '30 days',
    true
  );

  RAISE NOTICE 'Access granted to user: %', v_user_id;
  RAISE NOTICE 'Transaction ID: %', v_transaction_id;
  RAISE NOTICE 'Access expires: %', NOW() + INTERVAL '30 days';
END $$;

-- 4. Verify access granted
SELECT 
  upa.user_id,
  upa.package_ids,
  upa.access_start,
  upa.access_end,
  upa.is_active,
  pt.order_id
FROM user_package_access upa
JOIN payment_transactions pt ON upa.transaction_id = pt.id
WHERE upa.user_id = 'YOUR-FIREBASE-UID-HERE'; -- REPLACE THIS!

-- 5. Check which frames user can access
SELECT DISTINCT unnest(fp.frame_ids) as frame_id
FROM frame_packages fp
JOIN user_package_access upa ON fp.id = ANY(upa.package_ids)
WHERE upa.user_id = 'YOUR-FIREBASE-UID-HERE' -- REPLACE THIS!
  AND upa.is_active = true
  AND upa.access_end > NOW()
ORDER BY frame_id;
