#!/bin/bash
# Check all users with potential webhook issues

sudo -u postgres psql -d fremio << 'EOF'
-- Users with pending/failed payments but no access (potential webhook failures)
SELECT 
    u.email,
    u.display_name,
    pt.invoice_number,
    pt.status,
    pt.payment_method,
    TO_CHAR(pt.created_at, 'DD Mon YYYY HH24:MI') as payment_date,
    CASE WHEN upa.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_access,
    TO_CHAR(upa.access_end, 'DD Mon HH24:MI') as access_expires
FROM payment_transactions pt
JOIN users u ON pt.user_id = u.id
LEFT JOIN user_package_access upa ON upa.transaction_id = pt.id AND upa.is_active = true
WHERE pt.status IN ('pending', 'failed')
  AND pt.created_at > NOW() - INTERVAL '30 days'  -- Last 30 days only
  AND pt.payment_method IN ('dana', 'gopay', 'qris')  -- E-wallet payments
ORDER BY pt.created_at DESC
LIMIT 20;

-- Summary by status
SELECT 
    status,
    payment_method,
    COUNT(*) as total,
    COUNT(CASE WHEN upa.id IS NOT NULL THEN 1 END) as with_access,
    COUNT(CASE WHEN upa.id IS NULL THEN 1 END) as no_access
FROM payment_transactions pt
LEFT JOIN user_package_access upa ON upa.transaction_id = pt.id AND upa.is_active = true
WHERE pt.status IN ('pending', 'failed')
  AND pt.created_at > NOW() - INTERVAL '30 days'
GROUP BY status, payment_method
ORDER BY status, payment_method;
EOF
