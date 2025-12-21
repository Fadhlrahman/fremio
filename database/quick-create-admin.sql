-- Quick insert admin user for testing
-- Password: admin123
-- Hash: $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.M5nwZvvGNHhHxm

-- Check if admin user exists
SELECT 
    id, 
    email, 
    display_name, 
    role,
    CASE 
        WHEN password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.M5nwZvvGNHhHxm' 
        THEN 'Correct Hash'
        ELSE 'Wrong Hash'
    END as password_status
FROM users 
WHERE email = 'admin@fremio.com';

-- If not exists or wrong hash, insert/update:
INSERT INTO users (email, password_hash, display_name, role)
VALUES (
    'admin@fremio.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.M5nwZvvGNHhHxm',
    'Fremio Admin',
    'admin'
)
ON CONFLICT (email) 
DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;

-- Verify
SELECT id, email, display_name, role, created_at 
FROM users 
WHERE email = 'admin@fremio.com';
