#!/bin/bash
# Check all users with FAILED payment but still have access

sudo -u postgres psql -d fremio << 'EOF'
-- Find users with failed payment but active access
SELECT 
    u.email,
    u.display_name,
    pt.invoice_number,
    pt.status,
    pt.payment_method,
    pt.amount,
    TO_CHAR(pt.created_at, 'DD Mon YYYY HH24:MI') as payment_date,
    upa.is_active as has_access,
    TO_CHAR(upa.access_end, 'DD Mon YYYY HH24:MI') as access_expires
FROM payment_transactions pt
JOIN users u ON pt.user_id = u.id
JOIN user_package_access upa ON upa.transaction_id = pt.id
WHERE pt.status = 'failed'
  AND upa.is_active = true
ORDER BY pt.created_at DESC;

-- Summary count
SELECT 
    COUNT(*) as total_failed_with_active_access
FROM payment_transactions pt
JOIN user_package_access upa ON upa.transaction_id = pt.id
WHERE pt.status = 'failed'
  AND upa.is_active = true;
EOF
