#!/bin/bash
# Final grant with all required fields

echo "🎁 Granting premium access with all fields..."
echo ""

sudo -u postgres psql -d fremio << 'EOF'
-- Check current status first
SELECT 
    u.email,
    COUNT(upa.id) as access_count,
    MAX(CASE WHEN upa.is_active = true THEN 'HAS_ACCESS' ELSE 'NO_ACCESS' END) as current_status
FROM users u
LEFT JOIN user_package_access upa ON u.id = upa.user_id AND upa.is_active = true
WHERE u.email IN ('jasminenehana@gmail.com', 'phinkavalina@gmail.com')
GROUP BY u.email;

-- Grant for jasminenehana@gmail.com (only if no active access)
WITH user_info AS (
    SELECT u.id as user_id 
    FROM users u
    WHERE u.email = 'jasminenehana@gmail.com'
    AND NOT EXISTS (
        SELECT 1 FROM user_package_access upa 
        WHERE upa.user_id = u.id AND upa.is_active = true AND upa.access_end > NOW()
    )
),
transaction_info AS (
    INSERT INTO payment_transactions (
        user_id, 
        invoice_number, 
        amount, 
        currency, 
        status, 
        payment_method, 
        transaction_type, 
        gateway,
        paid_at,
        created_at, 
        updated_at
    )
    SELECT 
        user_id, 
        'FRM-DANA-MANUAL-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
        10000,
        'IDR',
        'completed',
        'dana',
        'one_time',
        'midtrans',
        NOW(),
        NOW(),
        NOW()
    FROM user_info
    RETURNING id as transaction_id, user_id
)
INSERT INTO user_package_access (user_id, transaction_id, package_ids, access_start, access_end, is_active, created_at, updated_at)
SELECT 
    user_id,
    transaction_id,
    ARRAY[1]::INTEGER[],
    NOW(),
    NOW() + INTERVAL '30 days',
    true,
    NOW(),
    NOW()
FROM transaction_info;

-- Show final results
SELECT 
    u.email,
    pt.invoice_number,
    pt.status,
    pt.payment_method,
    pt.gateway,
    TO_CHAR(upa.access_start, 'YYYY-MM-DD HH24:MI') as access_start,
    TO_CHAR(upa.access_end, 'YYYY-MM-DD HH24:MI') as access_end,
    upa.is_active
FROM users u
JOIN payment_transactions pt ON u.id = pt.user_id
JOIN user_package_access upa ON pt.id = upa.transaction_id
WHERE u.email IN ('jasminenehana@gmail.com', 'phinkavalina@gmail.com')
  AND upa.is_active = true
ORDER BY pt.created_at DESC;
EOF
