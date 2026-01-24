#!/bin/bash
# Check by partial invoice number

echo "Checking by invoice numbers from screenshot..."
echo ""

sudo -u postgres psql -d fremio << 'EOF'
SELECT 
  pt.invoice_number,
  u.email,
  pt.status,
  pt.payment_method,
  TO_CHAR(pt.created_at, 'YYYY-MM-DD HH24:MI:SS') as payment_date,
  CASE WHEN upa.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_access,
  upa.is_active
FROM payment_transactions pt
JOIN users u ON pt.user_id = u.id
LEFT JOIN user_package_access upa ON pt.id = upa.transaction_id
WHERE pt.invoice_number LIKE '%17690%' 
   OR pt.invoice_number LIKE '%17689%'
   OR pt.invoice_number LIKE '%17688%'
   OR pt.invoice_number LIKE '%17687%'
ORDER BY pt.created_at DESC;
EOF
