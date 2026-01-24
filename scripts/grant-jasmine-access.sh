#!/bin/bash
# Grant access untuk jasiminehana@gmail.com

EMAIL="jasiminehana@gmail.com"

sudo -u postgres psql -d fremio << EOF
-- Update transaction to completed
WITH user_info AS (
    SELECT id FROM users WHERE email = '${EMAIL}'
),
update_tx AS (
    UPDATE payment_transactions pt
    SET status = 'completed',
        paid_at = NOW(),
        gateway = 'midtrans',
        payment_method = 'dana',
        transaction_type = 'one_time'
    FROM user_info
    WHERE pt.user_id = user_info.id
      AND pt.status = 'pending'
      AND pt.invoice_number LIKE 'FRM-9a5172e5%'
    RETURNING pt.id, pt.invoice_number
)
-- Grant 30 days premium access (check if not exists first)
, check_existing AS (
    SELECT COUNT(*) as count
    FROM user_package_access upa
    JOIN user_info u ON upa.user_id = u.id
    WHERE upa.is_active = true
)
INSERT INTO user_package_access (
    user_id, 
    transaction_id, 
    package_ids, 
    access_start, 
    access_end, 
    is_active,
    created_at,
    updated_at
)
SELECT 
    u.id,
    tx.id,
    ARRAY[1]::INTEGER[],
    NOW(),
    NOW() + INTERVAL '30 days',
    true,
    NOW(),
    NOW()
FROM user_info u, update_tx tx, check_existing ce
WHERE ce.count = 0
RETURNING 
    (SELECT email FROM users WHERE id = user_id) as email,
    TO_CHAR(access_start, 'YYYY-MM-DD HH24:MI') as start,
    TO_CHAR(access_end, 'YYYY-MM-DD HH24:MI') as end;

-- Verify
SELECT 
    u.email,
    pt.invoice_number,
    pt.status,
    pt.payment_method,
    upa.is_active,
    TO_CHAR(upa.access_end, 'YYYY-MM-DD HH24:MI') as expires
FROM users u
JOIN payment_transactions pt ON pt.user_id = u.id
LEFT JOIN user_package_access upa ON upa.transaction_id = pt.id
WHERE u.email = '${EMAIL}'
  AND pt.invoice_number LIKE 'FRM-9a5172e5%';
EOF
