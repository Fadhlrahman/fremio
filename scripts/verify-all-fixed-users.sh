#!/bin/bash
# Final verification - All fixed users

sudo -u postgres psql -d fremio << 'EOF'
SELECT 
    u.email,
    u.display_name,
    pt.payment_method,
    pt.amount,
    TO_CHAR(pt.created_at, 'DD Mon YYYY HH24:MI') as payment_date,
    pt.status,
    upa.is_active as has_access,
    TO_CHAR(upa.access_end, 'DD Mon YYYY HH24:MI') as access_expires
FROM users u
JOIN payment_transactions pt ON pt.user_id = u.id
LEFT JOIN user_package_access upa ON upa.transaction_id = pt.id
WHERE u.email IN (
    'jasiminehana@gmail.com',
    'phinkavalina@gmail.com', 
    'suryadihakim39@gmail.com',
    'wahyupanjaitan09@gmail.com'
)
AND pt.invoice_number IN (
    'FRM-9a5172e5-1768913384127-ACMOUA',
    'FRM-507bcf25-1769044474048-9NOAOA',
    'FRM-fa943644-1768984076121-3NU1EI',
    'FRM-048db5bd-1768963947234-JYZBZS'
)
ORDER BY pt.created_at;
EOF
