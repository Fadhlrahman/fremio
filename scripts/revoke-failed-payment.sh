#!/bin/bash
# Revoke access untuk phinkavalina karena payment FAILED

echo "⚠️  REVOKING ACCESS for FAILED payment..."
echo ""

sudo -u postgres psql -d fremio << 'EOF'
-- Deactivate access for failed payment
UPDATE user_package_access upa
SET is_active = false,
    updated_at = NOW()
FROM payment_transactions pt
WHERE upa.transaction_id = pt.id
  AND pt.invoice_number = 'FRM-507bcf25-1769044474048-9NOAOA'
  AND pt.status = 'failed'
RETURNING 
    (SELECT email FROM users WHERE id = upa.user_id) as email,
    pt.invoice_number,
    pt.status as payment_status,
    upa.is_active as access_active;

-- Verify
SELECT 
    u.email,
    pt.status as payment_status,
    pt.amount,
    upa.is_active as has_access,
    CASE 
        WHEN upa.is_active THEN TO_CHAR(upa.access_end, 'DD Mon HH24:MI')
        ELSE 'REVOKED'
    END as access_status
FROM users u
JOIN payment_transactions pt ON pt.user_id = u.id
LEFT JOIN user_package_access upa ON upa.transaction_id = pt.id
WHERE u.email = 'phinkavalina@gmail.com'
  AND pt.invoice_number = 'FRM-507bcf25-1769044474048-9NOAOA';

-- Show summary of all 4 users with correct access
SELECT 
    u.email,
    pt.status as payment_status,
    upa.is_active as has_access,
    TO_CHAR(upa.access_end, 'DD Mon YYYY') as expires
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
ORDER BY pt.status DESC, u.email;
EOF
