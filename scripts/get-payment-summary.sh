#!/bin/bash
# Get payment summary by method and status

echo "Payment Summary by Method and Status"
echo "========================================"
echo ""

sudo -u postgres psql -d fremio << 'EOF'
SELECT 
  COALESCE(payment_method, 'null/pending') as method,
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM payment_transactions 
GROUP BY payment_method, status
ORDER BY payment_method, status;
EOF
