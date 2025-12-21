# 🔒 Setup Payment Gateway - Frame Premium Lock System

## 📋 Overview

Sistem payment gateway sudah **100% terimplementasi** untuk lock frame premium. User tidak bisa mengakses frame premium hingga melakukan pembayaran Rp 10,000 melalui Midtrans.

---

## ✅ Yang Sudah Lengkap (Code Complete)

### 1. **Backend Lock Mechanism**

- ✅ Column `is_premium` di tabel `frames`
- ✅ API `/api/payment/access` untuk cek akses user
- ✅ Backend auto-redact `slots` dan `layout` untuk locked frames
- ✅ Response include `isLocked: true` untuk premium tanpa akses

### 2. **Frontend Lock UI**

- ✅ Badge "🔒 Premium" di frame card
- ✅ Visual opacity 0.7 untuk locked frames
- ✅ Modal popup redirect ke Pricing saat click locked frame
- ✅ Check access status otomatis saat login

### 3. **Payment Integration**

- ✅ Midtrans Snap popup payment
- ✅ Webhook notification handler
- ✅ 30-day access period
- ✅ Auto-grant access setelah payment

---

## 🚀 Setup Steps (Yang Perlu Dilakukan)

### **Step 1: Dapatkan Midtrans API Keys**

1. **Daftar/Login ke Midtrans:**

   - Sandbox (Testing): https://dashboard.sandbox.midtrans.com/
   - Production: https://dashboard.midtrans.com/

2. **Get API Keys:**

   - Menu: **Settings → Access Keys**
   - Copy:
     - **Server Key** (untuk backend)
     - **Client Key** (untuk frontend)

3. **Update Environment Variables:**

**Backend** (`backend/.env`):

```env
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxxxxx
MIDTRANS_IS_PRODUCTION=false
```

**Frontend** (`my-app/.env`):

```env
VITE_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxxxxx
VITE_MIDTRANS_IS_PRODUCTION=false
```

> **Note:** Gunakan `false` untuk sandbox testing, `true` untuk production

---

### **Step 2: Run Database Migration**

Migration file sudah ada di: `database/migrations/002_create_payment_system.sql`

**Opsi A: Via psql Command (jika PostgreSQL installed)**

```bash
psql -U salwa -d fremio -f database/migrations/002_create_payment_system.sql
```

**Opsi B: Via Node Script** (recommended if psql not available)

```bash
# Make sure PostgreSQL server is running first
node backend/test-migration.js
```

**Opsi C: Manual via pgAdmin atau DBeaver**

1. Open `database/migrations/002_create_payment_system.sql`
2. Copy all SQL
3. Execute in your PostgreSQL client

**Tables yang akan dibuat:**

- `frame_packages` - Paket frame (1 paket = 10 frames)
- `payment_transactions` - Record semua transaksi
- `user_package_access` - Track akses user ke frames

---

### **Step 3: Mark Frames sebagai Premium**

Pilih frame mana yang mau di-lock (premium). Bisa via SQL atau admin panel.

**Via SQL:**

```sql
-- Update specific frames by ID
UPDATE frames
SET is_premium = true
WHERE id IN (5, 6, 7, 8, 9, 10);

-- Or by category
UPDATE frames
SET is_premium = true
WHERE category = 'Exclusive';

-- Check premium frames
SELECT id, name, category, is_premium
FROM frames
WHERE is_premium = true;
```

**Via Admin Panel** (jika sudah ada UI):

- Go to `/admin/frames`
- Toggle "Premium" switch pada frames yang ingin di-lock

---

### **Step 4: Create Frame Packages**

Buat paket frame yang akan dijual (3 paket dengan masing-masing ~10 frames).

**Via SQL:**

```sql
-- Package 1: December Frames
INSERT INTO frame_packages (name, description, frame_ids, is_active)
VALUES (
  'Paket December 2025',
  'Frame natal dan tahun baru spesial',
  ARRAY[5, 6, 7, 8, 9, 10, 11, 12, 13, 14],  -- 10 frame IDs
  true
);

-- Package 2: Wedding Frames
INSERT INTO frame_packages (name, description, frame_ids, is_active)
VALUES (
  'Paket Wedding',
  'Frame pernikahan elegan',
  ARRAY[15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  true
);

-- Package 3: Birthday Frames
INSERT INTO frame_packages (name, description, frame_ids, is_active)
VALUES (
  'Paket Birthday',
  'Frame ulang tahun meriah',
  ARRAY[25, 26, 27, 28, 29, 30, 31, 32, 33, 34],
  true
);

-- Check packages
SELECT * FROM frame_packages WHERE is_active = true;
```

**Important:** Frame IDs harus match dengan frames yang ada di database!

**Check available frame IDs:**

```sql
SELECT id, name, category FROM frames ORDER BY id;
```

---

### **Step 5: Configure Webhook (Production Only)**

Untuk auto-grant access setelah payment berhasil:

1. **Login Midtrans Dashboard**
   - Production: https://dashboard.midtrans.com/
2. **Setup Webhook:**

   - Menu: **Settings → Configuration**
   - Payment Notification URL: `https://api.fremio.id/api/payment/webhook`
   - HTTP Method: `POST`
   - Save

3. **Test Webhook:**
   - Bisa pakai webhook.site untuk test locally
   - Atau gunakan ngrok untuk expose local server

---

### **Step 6: Test Payment Flow**

1. **Start Backend Server:**

```bash
cd backend
npm start
```

2. **Start Frontend:**

```bash
cd my-app
npm run dev
```

3. **Test Flow:**

   - Login sebagai user
   - Go to `/frames` page
   - Click premium frame (should show 🔒 badge)
   - Modal popup muncul → redirect ke `/pricing`
   - Click "Beli Sekarang" button
   - Midtrans Snap popup muncul
   - Pilih payment method (GoPay, Bank Transfer, etc.)
   - Complete payment
   - Refresh page → frame premium unlocked!

4. **Test Payment Methods (Sandbox):**

   **GoPay:**

   - Use test phone: `081234567890`
   - OTP: `111111`

   **Credit Card:**

   - Card: `4811 1111 1111 1114`
   - CVV: `123`
   - Expiry: Any future date

   **Bank Transfer:**

   - Auto-settlement in sandbox mode

---

## 📊 Database Schema Reference

### frames table

```sql
id SERIAL PRIMARY KEY
name VARCHAR(255)
category VARCHAR(100)
is_premium BOOLEAN DEFAULT false  -- ← Lock flag
slots JSON
layout JSON
```

### frame_packages table

```sql
id SERIAL PRIMARY KEY
name VARCHAR(100)
description TEXT
frame_ids TEXT[]  -- Array of frame IDs
is_active BOOLEAN
```

### payment_transactions table

```sql
id SERIAL PRIMARY KEY
user_id VARCHAR(255)  -- Firebase UID
order_id VARCHAR(100) UNIQUE
gross_amount INTEGER DEFAULT 10000
transaction_status VARCHAR(50)  -- pending, settlement, cancel
```

### user_package_access table

```sql
id SERIAL PRIMARY KEY
user_id VARCHAR(255)
package_ids INTEGER[]  -- 3 package IDs
access_start TIMESTAMP
access_end TIMESTAMP  -- +30 days
is_active BOOLEAN
```

---

## 🔍 How Frame Locking Works

### Backend Flow:

1. User request `GET /api/frames`
2. Backend checks `is_premium` column
3. If premium → check user access via `/api/payment/access`
4. If no access → redact `slots` and `layout.elements`
5. Return frames with `isLocked: true`

### Frontend Flow:

1. Frames.jsx receives frames data
2. Shows "🔒 Premium" badge for locked frames
3. On click → check `frame.isLocked`
4. If locked → show modal "Upgrade ke Premium"
5. Redirect to `/pricing` page
6. After payment → `accessibleFrameIds` state updated
7. Locked frames become accessible

### Code Reference:

**Backend** (`backend/routes/frames.js`):

```javascript
const isPremium = !!frame.is_premium;
const canSeePremiumDetails = !isPremium || accessibleSet.has(String(frame.id));

// Redact slots for locked frames
const slots = canSeePremiumDetails ? slotsRaw : [];
const layout = canSeePremiumDetails ? layoutRaw : { elements: [] };

return {
  ...frame,
  isPremium,
  isLocked: isPremium && !canSeePremiumDetails,
  slots,
  layout,
};
```

**Frontend** (`my-app/src/pages/Frames.jsx`):

```javascript
// Check access on mount
const accessResponse = await paymentService.getAccess();
if (accessResponse.success && accessResponse.hasAccess) {
  setAccessibleFrameIds(accessResponse.data.frameIds || []);
}

// Handle frame click
const isAccessible = !isPremium || accessibleSet.has(String(frame.id));
if (!isAccessible) {
  // Show upgrade modal
  setShowUpgradeModal(true);
}
```

---

## 🎨 UI/UX Features

### Locked Frame Card:

- 🔒 Premium badge (top-right)
- Opacity 0.7 (semi-transparent)
- Hover: Gray border (not pink)
- Click: Upgrade modal popup

### Upgrade Modal:

```
┌─────────────────────────────────────┐
│  🔒 Upgrade ke Premium               │
│                                      │
│  Frame ini adalah konten premium.   │
│  Dapatkan akses ke 30+ frame        │
│  eksklusif dengan paket premium!    │
│                                      │
│  [Lihat Paket]  [Tutup]             │
└─────────────────────────────────────┘
```

### Pricing Page:

- Show frame previews (tabs)
- Price: **Rp 10,000** for 30 days
- Payment methods: GoPay, OVO, DANA, Bank Transfer, Credit Card
- "Beli Sekarang" button → Midtrans Snap popup

---

## 🐛 Troubleshooting

### Problem: "Midtrans is not defined"

**Solution:** Check VITE_MIDTRANS_CLIENT_KEY di `my-app/.env`

### Problem: Payment tidak auto-grant access

**Solution:**

1. Check webhook URL configured di Midtrans dashboard
2. Check backend logs: `tail -f backend/logs/error.log`
3. Manual grant: Call `/api/payment/reconcile-latest`

### Problem: Frame still locked setelah payment

**Solution:**

1. Check database: `SELECT * FROM user_package_access WHERE user_id = 'firebase-uid';`
2. Check frame_ids included in package
3. Refresh page / re-login

### Problem: Database migration failed

**Solution:**

1. Check PostgreSQL running: `pg_isready`
2. Check credentials in `.env`
3. Manual run SQL in pgAdmin/DBeaver

---

## 🔐 Security Notes

1. **Never commit API keys** to git
2. Use `.env` files (already in `.gitignore`)
3. Validate webhook signature (already implemented)
4. Rate limit payment endpoints (already implemented)
5. JWT authentication required for access check

---

## 📱 Production Deployment Checklist

- [ ] Get production Midtrans keys
- [ ] Update `MIDTRANS_IS_PRODUCTION=true`
- [ ] Configure webhook URL in dashboard
- [ ] Run migration on production database
- [ ] Create real frame packages
- [ ] Mark premium frames
- [ ] Test payment flow end-to-end
- [ ] Monitor transaction logs
- [ ] Setup email notifications (optional)

---

## 📞 Support & Resources

**Midtrans Documentation:**

- Snap API: https://docs.midtrans.com/docs/snap-overview
- Testing: https://docs.midtrans.com/docs/testing-payment
- Webhook: https://docs.midtrans.com/docs/http-notification

**Fremio Files:**

- Backend payment routes: `backend/routes/payment.js`
- Midtrans service: `backend/services/midtransService.js`
- Payment DB service: `backend/services/paymentDatabaseService.js`
- Frontend pricing: `my-app/src/pages/Pricing.jsx`
- Payment service: `my-app/src/services/paymentService.js`

---

## 🎯 Quick Start (TL;DR)

```bash
# 1. Get Midtrans keys dari dashboard.sandbox.midtrans.com
# 2. Update .env files (backend & frontend)
# 3. Run migration
node backend/test-migration.js

# 4. Mark frames premium (via SQL)
psql -U salwa -d fremio
UPDATE frames SET is_premium = true WHERE id IN (5,6,7,8,9,10);

# 5. Create packages (via SQL)
INSERT INTO frame_packages (name, frame_ids)
VALUES ('Paket 1', ARRAY[5,6,7,8,9,10,11,12,13,14]);

# 6. Start servers
cd backend && npm start
cd my-app && npm run dev

# 7. Test: Login → Click premium frame → Pay → Unlock!
```

---

**Status:** ✅ System ready, butuh Midtrans keys untuk aktivasi!
