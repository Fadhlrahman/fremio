#!/bin/bash
# Search by invoice from screenshot

sudo -u postgres psql -d fremio << 'EOF'
-- From screenshot: FRM-9a5172e5-17689... (jasminenehana)
-- From screenshot: FRM-507bcf25-17690... (phinkavalina)

SELECT 
    pt.invoice_number,
    u.email,
    u.display_name,
    pt.status,
    pt.payment_method,
    TO_CHAR(pt.created_at, 'DD Mon YYYY, HH24:MI') as payment_time,
    CASE WHEN upa.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_access
FROM payment_transactions pt
JOIN users u ON pt.user_id = u.id
LEFT JOIN user_package_access upa ON pt.id = upa.transaction_id AND upa.is_active = true
WHERE pt.invoice_number LIKE 'FRM-9a5172e5%'
   OR pt.invoice_number LIKE 'FRM-507bcf25%'
   OR pt.invoice_number LIKE '%17689%'
   OR pt.invoice_number LIKE '%17690%'
ORDER BY pt.created_at DESC;
EOF
