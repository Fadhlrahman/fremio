#!/bin/bash
# Search for jasmine users

sudo -u postgres psql -d fremio << 'EOF'
SELECT email, display_name, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as created 
FROM users 
WHERE email LIKE '%jasmin%' 
ORDER BY created_at DESC;
EOF
