#!/bin/bash
# Check final status kedua user

sudo -u postgres psql -d fremio << 'EOF'
SELECT 
    u.email,
    u.display_name,
    pt.invoice_number,
    pt.status,
    pt.payment_method,
    TO_CHAR(pt.created_at, 'DD Mon HH24:MI') as payment_date,
    upa.is_active,
    TO_CHAR(upa.access_start, 'DD Mon HH24:MI') as access_start,
    TO_CHAR(upa.access_end, 'DD Mon HH24:MI') as access_end
FROM users u
JOIN payment_transactions pt ON pt.user_id = u.id
LEFT JOIN user_package_access upa ON upa.transaction_id = pt.id
WHERE u.email IN ('jasiminehana@gmail.com', 'phinkavalina@gmail.com')
  AND (pt.invoice_number LIKE 'FRM-9a5172e5%' OR pt.invoice_number LIKE 'FRM-507bcf25%')
ORDER BY u.email;
EOF
