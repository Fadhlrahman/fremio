#!/bin/bash
# Grant access untuk 2 GOPAY users yang pending

sudo -u postgres psql -d fremio << 'EOF'
-- Update suryadihakim39@gmail.com
WITH user_info AS (
    SELECT id FROM users WHERE email = 'suryadihakim39@gmail.com'
),
update_tx1 AS (
    UPDATE payment_transactions pt
    SET status = 'completed',
        paid_at = NOW(),
        gateway = 'midtrans',
        payment_method = 'gopay',
        transaction_type = 'one_time'
    FROM user_info
    WHERE pt.user_id = user_info.id
      AND pt.status = 'pending'
      AND pt.invoice_number = 'FRM-fa943644-1768984076121-3NU1EI'
    RETURNING pt.id, pt.invoice_number, pt.user_id
),
grant_access1 AS (
    INSERT INTO user_package_access (
        user_id, transaction_id, package_ids, 
        access_start, access_end, is_active,
        created_at, updated_at
    )
    SELECT 
        user_id, id, ARRAY[1]::INTEGER[],
        NOW(), NOW() + INTERVAL '30 days', true,
        NOW(), NOW()
    FROM update_tx1
    WHERE NOT EXISTS (
        SELECT 1 FROM user_package_access upa
        WHERE upa.user_id = update_tx1.user_id AND upa.is_active = true
    )
    RETURNING user_id, TO_CHAR(access_start, 'DD Mon HH24:MI') as start_date, TO_CHAR(access_end, 'DD Mon HH24:MI') as end_date
)
SELECT 'suryadihakim39@gmail.com' as email, start_date, end_date FROM grant_access1;

-- Update wahyupanjaitan09@gmail.com
WITH user_info AS (
    SELECT id FROM users WHERE email = 'wahyupanjaitan09@gmail.com'
),
update_tx2 AS (
    UPDATE payment_transactions pt
    SET status = 'completed',
        paid_at = NOW(),
        gateway = 'midtrans',
        payment_method = 'gopay',
        transaction_type = 'one_time'
    FROM user_info
    WHERE pt.user_id = user_info.id
      AND pt.status = 'pending'
      AND pt.invoice_number = 'FRM-048db5bd-1768963947234-JYZBZS'
    RETURNING pt.id, pt.invoice_number, pt.user_id
),
grant_access2 AS (
    INSERT INTO user_package_access (
        user_id, transaction_id, package_ids, 
        access_start, access_end, is_active,
        created_at, updated_at
    )
    SELECT 
        user_id, id, ARRAY[1]::INTEGER[],
        NOW(), NOW() + INTERVAL '30 days', true,
        NOW(), NOW()
    FROM update_tx2
    WHERE NOT EXISTS (
        SELECT 1 FROM user_package_access upa
        WHERE upa.user_id = update_tx2.user_id AND upa.is_active = true
    )
    RETURNING user_id, TO_CHAR(access_start, 'DD Mon HH24:MI') as start_date, TO_CHAR(access_end, 'DD Mon HH24:MI') as end_date
)
SELECT 'wahyupanjaitan09@gmail.com' as email, start_date, end_date FROM grant_access2;

-- Verify both
SELECT 
    u.email,
    u.display_name,
    pt.status,
    pt.payment_method,
    upa.is_active,
    TO_CHAR(upa.access_end, 'DD Mon HH24:MI') as expires
FROM users u
JOIN payment_transactions pt ON pt.user_id = u.id
LEFT JOIN user_package_access upa ON upa.transaction_id = pt.id
WHERE u.email IN ('suryadihakim39@gmail.com', 'wahyupanjaitan09@gmail.com')
  AND pt.invoice_number IN ('FRM-fa943644-1768984076121-3NU1EI', 'FRM-048db5bd-1768963947234-JYZBZS')
ORDER BY u.email;
EOF
