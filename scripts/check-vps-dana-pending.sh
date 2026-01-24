#!/bin/bash
# Check pending DANA transactions

echo "Checking pending DANA transactions..."
echo ""

sudo -u postgres psql -d fremio << 'EOF'
SELECT 
  invoice_number,
  user_id,
  amount,
  status,
  payment_method,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
  TO_CHAR(NOW() - created_at, 'DD"d" HH24"h"') as age
FROM payment_transactions 
WHERE LOWER(payment_method) LIKE '%dana%'
  AND status = 'pending'
ORDER BY created_at DESC;
EOF
