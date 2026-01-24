#!/bin/bash
# Check specific DANA transactions

echo "Checking jasminenehana and phinkavalina transactions..."
echo ""

sudo -u postgres psql -d fremio << 'EOF'
SELECT 
  pt.invoice_number,
  u.email,
  pt.status,
  pt.payment_method,
  TO_CHAR(pt.created_at, 'YYYY-MM-DD HH24:MI:SS') as payment_date,
  CASE WHEN upa.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_access,
  upa.is_active,
  TO_CHAR(upa.access_start, 'YYYY-MM-DD') as access_start,
  TO_CHAR(upa.access_end, 'YYYY-MM-DD') as access_end
FROM payment_transactions pt
JOIN users u ON pt.user_id = u.id
LEFT JOIN user_package_access upa ON pt.id = upa.transaction_id
WHERE u.email IN ('jasminenehana@gmail.com', 'phinkavalina@gmail.com')
ORDER BY pt.created_at DESC;
EOF
