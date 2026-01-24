#!/bin/bash
# Quick grant for jasminenehana and phinkavalina

echo "🎁 Granting premium access..."
echo ""

sudo -u postgres psql -d fremio << 'EOF'
-- Grant for jasminenehana@gmail.com
WITH user_info AS (
    SELECT id as user_id FROM users WHERE email = 'jasminenehana@gmail.com'
),
transaction_info AS (
    INSERT INTO payment_transactions (user_id, invoice_number, amount, status, payment_method, created_at, updated_at)
    SELECT 
        user_id, 
        'FRM-DANA-MANUAL-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
        10000,
        'settlement',
        'dana',
        NOW(),
        NOW()
    FROM user_info
    ON CONFLICT DO NOTHING
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
FROM transaction_info
ON CONFLICT DO NOTHING;

-- Grant for phinkavalina@gmail.com
WITH user_info AS (
    SELECT id as user_id FROM users WHERE email = 'phinkavalina@gmail.com'
),
transaction_info AS (
    INSERT INTO payment_transactions (user_id, invoice_number, amount, status, payment_method, created_at, updated_at)
    SELECT 
        user_id, 
        'FRM-DANA-MANUAL-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
        10000,
        'settlement',
        'dana',
        NOW(),
        NOW()
    FROM user_info
    ON CONFLICT DO NOTHING
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
FROM transaction_info
ON CONFLICT DO NOTHING;

-- Show results
SELECT 
    u.email,
    pt.invoice_number,
    pt.status,
    pt.payment_method,
    TO_CHAR(upa.access_start, 'YYYY-MM-DD') as access_start,
    TO_CHAR(upa.access_end, 'YYYY-MM-DD') as access_end,
    upa.is_active
FROM users u
JOIN payment_transactions pt ON u.id = pt.user_id
JOIN user_package_access upa ON pt.id = upa.transaction_id
WHERE u.email IN ('jasminenehana@gmail.com', 'phinkavalina@gmail.com')
ORDER BY pt.created_at DESC;
EOF
