# 🔐 Admin Login Credentials

## Default Admin Account

**Email:** `admin@fremio.com`  
**Password:** `admin123`

**Role:** Admin  
**Display Name:** Fremio Admin

---

## Test User Account

**Email:** `test@fremio.com`  
**Password:** `admin123`

**Role:** User (regular user)  
**Display Name:** Test User

---

## Password Hash

The password `admin123` is hashed using bcrypt:

```
$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.M5nwZvvGNHhHxm
```

---

## How to Use

### Login via Web Interface

1. **Open:** https://localhost:5180/fremio/login
2. **Enter:**
   - Email: `admin@fremio.com`
   - Password: `admin123`
3. **After login:**
   - Admin redirects to: `/admin/dashboard`
   - Regular user redirects to: `/frames`

### API Login (for testing)

```bash
# Login via API
curl -k -X POST https://localhost:5050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fremio.com","password":"admin123"}'

# Expected response:
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": "uuid",
    "email": "admin@fremio.com",
    "displayName": "Fremio Admin",
    "role": "admin"
  }
}
```

---

## Database Setup

These users are automatically created when running:

```bash
# Option 1: Run full schema (includes seed data)
psql -U salwa -d fremio -f database/schema.sql

# Option 2: Run seed separately
psql -U salwa -d fremio -f database/seed.sql
```

The seed script uses `ON CONFLICT DO NOTHING`, so it's safe to run multiple times.

---

## Check if Admin User Exists

```sql
-- Check admin user in database
SELECT id, email, display_name, role, created_at
FROM users
WHERE email = 'admin@fremio.com';

-- Verify password hash
SELECT email,
       password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.M5nwZvvGNHhHxm' as password_matches
FROM users
WHERE email = 'admin@fremio.com';
```

---

## Create New Admin User

If you need to create a new admin user:

```sql
-- Generate password hash first (use bcrypt online generator or Node.js)
-- Then insert:
INSERT INTO users (email, password_hash, display_name, role)
VALUES (
    'newadmin@fremio.com',
    '$2a$12$your-bcrypt-hash-here',
    'New Admin',
    'admin'
);
```

Or use the registration endpoint with admin role:

```bash
curl -k -X POST https://localhost:5050/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"newadmin@example.com",
    "password":"securepassword",
    "displayName":"New Admin",
    "role":"admin"
  }'
```

---

## Change Admin Password

```sql
-- Update password (use new bcrypt hash)
UPDATE users
SET password_hash = '$2a$12$new-bcrypt-hash-here',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@fremio.com';
```

---

## Troubleshooting

### "Login gagal" Error

1. **Check if user exists in database:**

   ```sql
   SELECT * FROM users WHERE email = 'admin@fremio.com';
   ```

2. **Check backend is running:**

   ```bash
   curl -k https://localhost:5050/health
   ```

3. **Check database connection:**
   - Verify PostgreSQL is running
   - Check credentials in `backend/.env`
   - Test connection: `psql -U salwa -d fremio`

### "Network error"

- Backend not running → Start: `cd backend && npm start`
- Frontend can't reach backend → Check proxy in `my-app/vite.config.js`

### Wrong Password

- Verify you're using: `admin123` (not `admin` or `123456`)
- Check caps lock is OFF
- Try copy-paste the password

---

## Security Notes

⚠️ **IMPORTANT:** Change default password in production!

```sql
-- Generate new secure password hash and update
UPDATE users
SET password_hash = '$2a$12$your-new-secure-hash'
WHERE email = 'admin@fremio.com';
```

---

**Current Status:**

- ✅ Admin user seeded in database
- ✅ Backend auth working
- ✅ Ready to login!
