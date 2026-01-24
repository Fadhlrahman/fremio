#!/bin/bash
# Check phinkavalina transaction detail

sudo -u postgres psql -d fremio << 'EOF'
-- Check full transaction detail
SELECT 
    u.email,
    pt.invoice_number,
    pt.status,
    pt.payment_method,
    pt.amount,
    TO_CHAR(pt.created_at, 'DD Mon YYYY HH24:MI') as created,
    TO_CHAR(pt.paid_at, 'DD Mon YYYY HH24:MI') as paid_at,
    pt.gateway,
    pt.transaction_type,
    upa.is_active as has_access,
    TO_CHAR(upa.access_start, 'DD Mon HH24:MI') as access_start,
    TO_CHAR(upa.access_end, 'DD Mon HH24:MI') as access_end
FROM users u
JOIN payment_transactions pt ON pt.user_id = u.id
LEFT JOIN user_package_access upa ON upa.transaction_id = pt.id
WHERE u.email = 'phinkavalina@gmail.com'
  AND pt.invoice_number LIKE 'FRM-507bcf25%';
EOF
