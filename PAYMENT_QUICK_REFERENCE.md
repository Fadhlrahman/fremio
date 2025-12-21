# 🔒 Payment Gateway - Quick Reference

## 🎯 System Status

✅ **Code Implementation: 100% Complete**

- Backend lock mechanism ✅
- Frontend UI lock ✅
- Midtrans integration ✅
- Payment flow ✅
- Access control ✅

⚠️ **Configuration Required:**

1. Midtrans API keys
2. Database migration
3. Mark premium frames
4. Create packages

---

## 🚀 Quick Setup (5 Minutes)

### 1. Get Midtrans Keys

```
URL: https://dashboard.sandbox.midtrans.com/
Menu: Settings → Access Keys
Copy: Server Key + Client Key
```

### 2. Update Environment Variables

**Backend** (`backend/.env`):

```env
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxx
MIDTRANS_IS_PRODUCTION=false
```

**Frontend** (`my-app/.env`):

```env
VITE_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxx
VITE_MIDTRANS_IS_PRODUCTION=false
```

### 3. Run Migration

```bash
# Make sure PostgreSQL is running!
node backend/test-migration.js
```

### 4. Setup Data (SQL)

```sql
-- Mark frames as premium
UPDATE frames SET is_premium = true WHERE id >= 5;

-- Create 3 packages (10 frames each)
INSERT INTO frame_packages (name, frame_ids) VALUES
('Paket 1', ARRAY[5,6,7,8,9,10,11,12,13,14]),
('Paket 2', ARRAY[15,16,17,18,19,20,21,22,23,24]),
('Paket 3', ARRAY[25,26,27,28,29,30,31,32,33,34]);
```

### 5. Start & Test

```bash
# Terminal 1
cd backend && npm start

# Terminal 2
cd my-app && npm run dev

# Browser: http://localhost:5180
# Login → Click premium frame → Pay → Unlock!
```

---

## 📊 How It Works

### Payment Flow

```
User clicks premium frame
    ↓
Shows "🔒 Premium" modal
    ↓
Redirects to /pricing page
    ↓
Clicks "Beli Sekarang" (Rp 10,000)
    ↓
Midtrans Snap popup opens
    ↓
User selects payment method
    ↓
Payment completed
    ↓
Webhook → Backend grants access
    ↓
User refreshes → Premium unlocked!
```

### Access Control

```
Backend checks: is_premium = true?
    ↓ YES
Check user access in database
    ↓ HAS ACCESS?
    ├─ YES → Return full frame data (slots, layout)
    └─ NO  → Return locked frame (no slots/layout)
                   ↓
               Frontend shows 🔒 badge
```

---

## 🎨 UI Elements

### Locked Frame Card

- Badge: `🔒 Premium` (top-right)
- Opacity: `0.7` (semi-transparent)
- Border: Gray on hover (not pink)
- Click: Shows upgrade modal

### Upgrade Modal

```
┌──────────────────────────────────┐
│ 🔒 Upgrade ke Premium            │
│                                   │
│ Frame ini adalah konten premium. │
│ Dapatkan akses 30+ frame dengan  │
│ paket premium!                    │
│                                   │
│ [Lihat Paket]  [Tutup]           │
└──────────────────────────────────┘
```

---

## 💰 Pricing Model

**One-Time Payment:**

- Price: **Rp 10,000**
- Access: **3 packages** (~30 premium frames)
- Duration: **30 days**
- Methods: GoPay, OVO, DANA, Bank Transfer, Credit Card

---

## 🧪 Test Credentials (Sandbox)

**GoPay:**

- Phone: `081234567890`
- OTP: `111111`

**Credit Card:**

- Card: `4811 1111 1111 1114`
- CVV: `123`
- Expiry: Any future date

**Bank Transfer:**

- Auto-settlement in sandbox

---

## 🔍 Troubleshooting

| Problem              | Solution                                   |
| -------------------- | ------------------------------------------ |
| Midtrans not defined | Check `VITE_MIDTRANS_CLIENT_KEY` in `.env` |
| Frame still locked   | Refresh page or re-login                   |
| Payment not granted  | Check webhook URL in dashboard             |
| Migration failed     | Check PostgreSQL running                   |

---

## 📁 Important Files

**Backend:**

- `backend/routes/payment.js` - Payment endpoints
- `backend/services/midtransService.js` - Midtrans API
- `backend/services/paymentDatabaseService.js` - DB operations

**Frontend:**

- `my-app/src/pages/Frames.jsx` - Lock UI
- `my-app/src/pages/Pricing.jsx` - Payment page
- `my-app/src/services/paymentService.js` - API client

**Database:**

- `database/migrations/002_create_payment_system.sql` - Tables
- `database/migrations/003_setup_payment_data.sql` - Data setup
- `database/manual_grant_access.sql` - Manual unlock

**Docs:**

- `PAYMENT_GATEWAY_SETUP.md` - Complete guide
- `setup-payment-gateway.ps1` - Auto setup script

---

## 📞 Quick Commands

```bash
# Run setup wizard
./setup-payment-gateway.ps1

# Run migration
node backend/test-migration.js

# Check tables
psql -U salwa -d fremio -c "SELECT * FROM frame_packages;"

# Start servers
cd backend && npm start
cd my-app && npm run dev

# View logs
tail -f backend/logs/error.log
```

---

## ✅ Production Checklist

- [ ] Get production Midtrans keys
- [ ] Update `MIDTRANS_IS_PRODUCTION=true`
- [ ] Configure webhook: `https://api.fremio.id/api/payment/webhook`
- [ ] Run migration on production DB
- [ ] Create real packages
- [ ] Mark premium frames
- [ ] Test end-to-end
- [ ] Monitor transactions

---

**Status:** ✅ Ready! Just need Midtrans keys + DB setup

**Estimated Setup Time:** 5-10 minutes

**Documentation:** `PAYMENT_GATEWAY_SETUP.md`
