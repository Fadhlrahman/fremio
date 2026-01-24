#!/bin/bash
# Manual grant premium access for specific users

if [ -z "$1" ]; then
    echo "Usage: ./manual-grant-dana.sh <email>"
    echo "Example: ./manual-grant-dana.sh jasminenehana@gmail.com"
    exit 1
fi

EMAIL=$1

echo "🔍 Checking user: $EMAIL"
echo ""

# Get user ID
USER_ID=$(sudo -u postgres psql -d fremio -t -A -c "SELECT id FROM users WHERE email = '$EMAIL';")

if [ -z "$USER_ID" ]; then
    echo "❌ User not found: $EMAIL"
    exit 1
fi

echo "✅ User found: $USER_ID"
echo ""

# Check if already has active access
HAS_ACCESS=$(sudo -u postgres psql -d fremio -t -A -c "SELECT COUNT(*) FROM user_package_access WHERE user_id = '$USER_ID' AND is_active = true AND access_end > NOW();")

if [ "$HAS_ACCESS" != "0" ]; then
    echo "⚠️  User already has active premium access"
    sudo -u postgres psql -d fremio -c "SELECT package_ids, access_start, access_end, is_active FROM user_package_access WHERE user_id = '$USER_ID' AND is_active = true ORDER BY created_at DESC LIMIT 1;"
    exit 0
fi

# Get or create pending transaction
TRANSACTION_ID=$(sudo -u postgres psql -d fremio -t -A -c "SELECT id FROM payment_transactions WHERE user_id = '$USER_ID' ORDER BY created_at DESC LIMIT 1;")

if [ -z "$TRANSACTION_ID" ]; then
    echo "📝 Creating new transaction..."
    TRANSACTION_ID=$(sudo -u postgres psql -d fremio -t -A -c "
        INSERT INTO payment_transactions (
            user_id, 
            invoice_number, 
            amount, 
            status, 
            payment_method, 
            created_at, 
            updated_at
        ) VALUES (
            '$USER_ID',
            'FRM-MANUAL-' || floor(random() * 1000000000)::text,
            10000,
            'settlement',
            'dana',
            NOW(),
            NOW()
        ) RETURNING id;
    ")
    echo "✅ Transaction created: $TRANSACTION_ID"
else
    echo "✅ Found existing transaction: $TRANSACTION_ID"
fi

# Grant premium access (1 month)
echo ""
echo "🎁 Granting premium access (30 days)..."

sudo -u postgres psql -d fremio << EOF
INSERT INTO user_package_access (
    user_id,
    transaction_id,
    package_ids,
    access_start,
    access_end,
    is_active,
    created_at,
    updated_at
) VALUES (
    '$USER_ID',
    '$TRANSACTION_ID',
    ARRAY[1]::INTEGER[],
    NOW(),
    NOW() + INTERVAL '30 days',
    true,
    NOW(),
    NOW()
)
ON CONFLICT DO NOTHING;

SELECT 
    'SUCCESS!' as status,
    email,
    TO_CHAR(upa.access_start, 'YYYY-MM-DD') as access_start,
    TO_CHAR(upa.access_end, 'YYYY-MM-DD') as access_end
FROM user_package_access upa
JOIN users u ON upa.user_id = u.id
WHERE upa.user_id = '$USER_ID'
ORDER BY upa.created_at DESC
LIMIT 1;
EOF

echo ""
echo "✅ DONE! User now has premium access for 30 days"
