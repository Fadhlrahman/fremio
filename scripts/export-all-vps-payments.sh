#!/bin/bash
# Export ALL payment data from VPS

echo "Exporting ALL payment transactions..."
echo ""

sudo -u postgres psql -d fremio << 'EOF'
SELECT 
  id,
  user_id,
  invoice_number,
  amount,
  status,
  payment_method,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM payment_transactions 
ORDER BY created_at DESC;
EOF
