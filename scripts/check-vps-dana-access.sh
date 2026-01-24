#!/bin/bash
# Check premium access for DANA payment users

echo "Checking premium access for DANA payment users..."
echo ""

sudo -u postgres psql -d fremio << 'EOF'
SELECT 
  pt.invoice_number,
  pt.user_id,
  pt.amount,
  pt.status as payment_status,
  TO_CHAR(pt.created_at, 'YYYY-MM-DD HH24:MI:SS') as payment_date,
  CASE 
    WHEN upa.id IS NOT NULL THEN 'YES'
    ELSE 'NO'
  END as has_access,
  upa.is_active as access_active,
  TO_CHAR(upa.access_start, 'YYYY-MM-DD') as access_start,
  TO_CHAR(upa.access_end, 'YYYY-MM-DD') as access_end
FROM payment_transactions pt
LEFT JOIN user_package_access upa ON pt.id = upa.transaction_id
WHERE LOWER(pt.payment_method) LIKE '%dana%'
  AND pt.status = 'settlement'
ORDER BY pt.created_at DESC;
EOF
