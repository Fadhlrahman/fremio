#!/bin/bash
# Export DANA payment data from VPS

echo "Querying DANA payments..."

sudo -u postgres psql -d fremio -t -A -F'|' << 'EOF'
SELECT 
  id,
  user_id,
  invoice_number,
  amount,
  status,
  payment_method,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM payment_transactions 
WHERE LOWER(payment_method) LIKE '%dana%'
ORDER BY created_at DESC;
EOF
