# 🔒 Setup Frame Premium - Quick Guide

## ✅ Status Code Implementation

- ✅ Backend payment routes complete
- ✅ Frontend payment UI complete
- ✅ Frame locking mechanism ready
- ✅ Midtrans integration coded
- ⚠️ Need Midtrans API keys untuk testing

---

## 📝 Step-by-Step Setup

### 1. Get Midtrans Sandbox Keys (5 menit)

**Cara Daftar:**

```
1. Buka: https://dashboard.sandbox.midtrans.com/register
2. Isi form registrasi (gunakan email asli)
3. Verifikasi email
4. Login ke dashboard
5. Menu: Settings → Access Keys
6. Copy Server Key dan Client Key
```

**Format Keys:**

- Server Key: `SB-Mid-server-xxxxxxxxxxxxxxxxxx`
- Client Key: `SB-Mid-client-xxxxxxxxxxxxxxxxxx`

---

### 2. Update Environment Variables

**Backend** (`backend/.env`):

```env
MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_KEY_HERE
MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_KEY_HERE
MIDTRANS_IS_PRODUCTION=false
```

**Frontend** (`my-app/.env`):

```env
VITE_MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_KEY_HERE
VITE_MIDTRANS_IS_PRODUCTION=false
```

---

### 3. Install PostgreSQL (Required untuk Payment Data)

Payment system butuh database untuk:

- Track payment transactions
- Store user access rights
- Record payment history

**Quick Install:**

```powershell
# Download PostgreSQL 16
# URL: https://www.postgresql.org/download/windows/

# Setelah install, setup database:
psql -U postgres
CREATE DATABASE fremio;
CREATE USER salwa WITH PASSWORD 'fremio2024';
GRANT ALL PRIVILEGES ON DATABASE fremio TO salwa;
\q

# Import schema
cd D:\Project\fremio
psql -U salwa -d fremio -f database\schema.sql
```

**Update backend/.env:**

```env
DB_PASSWORD=fremio2024
```

---

### 4. Restart Backend

```powershell
# Kill existing backend
Get-Process -Name node | Stop-Process -Force

# Start fresh
cd D:\Project\fremio\backend
npm start
```

---

### 5. Test Payment Flow

**A. Mark Frame as Premium (via Database):**

```sql
-- Connect to database
psql -U salwa -d fremio

-- Mark first frame as premium
UPDATE frames SET is_premium = true WHERE id = (SELECT id FROM frames LIMIT 1);

-- Verify
SELECT id, name, is_premium FROM frames;
```

**B. Test di Browser:**

```
1. Login: admin@fremio.com / admin123
2. Go to Gallery page
3. Premium frame akan ada badge "🔒 Premium"
4. Click premium frame → Redirect ke Pricing
5. Click "Buy Premium Frame Access" → Midtrans popup
6. Test payment dengan kartu test:
   - Card: 4811 1111 1111 1114
   - Exp: 01/25
   - CVV: 123
7. Setelah success → Frame unlocked
```

---

## 🧪 Test Credit Cards (Sandbox)

**Success Payment:**

- Card: `4811 1111 1111 1114`
- Exp: Any future date
- CVV: `123`

**Failed Payment:**

- Card: `4911 1111 1111 1113`

**Pending Payment:**

- Card: `4411 1111 1111 1118`

---

## 📊 Payment Packages Available

| Package      | Price     | Access Duration | Description               |
| ------------ | --------- | --------------- | ------------------------- |
| Single Frame | Rp 10,000 | 30 days         | Access 1 premium frame    |
| Basic Pack   | Rp 25,000 | 30 days         | Access 5 premium frames   |
| Pro Pack     | Rp 50,000 | 90 days         | Access all premium frames |

---

## 🔍 Verify Setup

**Check Backend Logs:**

```
✅ Fremio Backend API running on HTTPS port 5050
✅ Midtrans configured (Sandbox mode)
✅ Payment routes loaded
```

**Test Endpoints:**

```powershell
# Health check
curl.exe -k https://localhost:5050/health

# Check payment packages
curl.exe -k https://localhost:5050/api/payment/packages

# Check user access (with token)
$token = "YOUR_JWT_TOKEN"
curl.exe -k -H "Authorization: Bearer $token" https://localhost:5050/api/payment/access
```

---

## 🐛 Troubleshooting

**Problem: "Midtrans keys not configured"**

- Solution: Update .env dengan keys dari dashboard
- Restart backend setelah update

**Problem: "Database connection failed"**

- Solution: Install PostgreSQL dan import schema
- Update DB_PASSWORD di .env

**Problem: "Frame tidak locked di UI"**

- Solution: Frame harus marked as `is_premium = true` di database
- Refresh browser setelah update

**Problem: "Payment success tapi frame masih locked"**

- Solution: Check webhook notification
- Verify `payment_transactions` table
- Check backend logs untuk webhook received

---

## 📝 Files Modified

- ✅ `backend/.env` - Added Midtrans keys
- ✅ `my-app/.env` - Added Midtrans client key
- ✅ `backend/routes/payment.js` - Payment API (already complete)
- ✅ `my-app/src/pages/Pricing.jsx` - Payment UI (already complete)
- ✅ Backend lock mechanism (already implemented)
- ✅ Frontend lock UI (already implemented)

---

## 🚀 Next Steps

1. **GET MIDTRANS KEYS** (main blocker)

   - Register at https://dashboard.sandbox.midtrans.com/
   - Copy Server Key & Client Key
   - Update both .env files

2. **INSTALL POSTGRESQL** (for payment data)

   - Download from postgresql.org
   - Setup fremio database
   - Import schema.sql

3. **TEST PAYMENT FLOW**
   - Mark frame as premium
   - Login and try to access
   - Pay with test card
   - Verify access granted

---

## 💡 Tips

- **Development**: Always use Sandbox mode
- **Testing**: Use test credit cards (see list above)
- **Webhook**: Backend auto-handle payment notification
- **Access**: 30-day access stored in database
- **Logs**: Check backend terminal untuk payment flow

---

**Ready to implement? Just need Midtrans keys!** 🔑
