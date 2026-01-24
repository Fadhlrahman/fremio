#!/bin/bash
# Check detailed info for pending GOPAY payments

sudo -u postgres psql -d fremio << 'EOF'
-- Detail 2 GOPAY pending
SELECT 
    u.email,
    u.display_name,
    pt.invoice_number,
    pt.status,
    pt.payment_method,
    pt.amount,
    TO_CHAR(pt.created_at, 'DD Mon YYYY HH24:MI') as payment_date,
    TO_CHAR(pt.updated_at, 'DD Mon YYYY HH24:MI') as last_update
FROM payment_transactions pt
JOIN users u ON pt.user_id = u.id
WHERE pt.status = 'pending'
  AND pt.payment_method = 'gopay'
  AND pt.created_at > NOW() - INTERVAL '30 days'
ORDER BY pt.created_at DESC;

-- Check semua DANA payments (compare with yang sudah berhasil)
SELECT 
    u.email,
    pt.status,
    pt.payment_method,
    TO_CHAR(pt.created_at, 'DD Mon HH24:MI') as payment_date,
    CASE WHEN upa.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_access
FROM payment_transactions pt
JOIN users u ON pt.user_id = u.id
LEFT JOIN user_package_access upa ON upa.transaction_id = pt.id AND upa.is_active = true
WHERE pt.payment_method = 'dana'
  AND pt.created_at > NOW() - INTERVAL '7 days'
ORDER BY pt.created_at DESC;
EOF
