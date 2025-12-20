# 💳 FREMIO PAYMENT SYSTEM - MIDTRANS INTEGRATION

## 📋 Ringkasan

Payment system telah berhasil diimplementasikan menggunakan **Midtrans** sebagai payment gateway. Sistem ini memungkinkan user untuk membeli akses ke frame premium.

---

## 🎯 Konsep Payment

### **Paket Premium**

- **Harga**: Rp 10.000
- **Benefit**: Akses ke **3 paket frame** (total 30 frames)
- **Durasi**: **30 hari**
- **Pembatasan**: User tidak bisa membeli paket baru sebelum masa aktif berakhir

### **Payment Methods**

Semua metode pembayaran Midtrans tersedia:

- ✅ Virtual Account (BCA, BNI, BRI, Mandiri, Permata)
- ✅ E-Wallet (GoPay, OVO, DANA, ShopeePay)
- ✅ QRIS
- ✅ Credit Card / Debit Card

---

## 🏗️ Struktur Implementasi

### **Backend (Node.js + Express + PostgreSQL)**

#### 1. **Database Schema**

File: `database/migrations/002_create_payment_system.sql`

**Tables:**

- `frame_packages` - Menyimpan paket frame (1 paket = 10 frames)
- `payment_transactions` - Tracking semua transaksi pembayaran
- `user_package_access` - Tracking akses user ke paket yang dibeli

#### 2. **Services**

- `backend/services/midtransService.js` - Integrasi dengan Midtrans API
- `backend/services/paymentDatabaseService.js` - Database operations untuk payment

#### 3. **Routes**

- `backend/routes/payment.js` - User payment endpoints
- `backend/routes/adminPackages.js` - Admin package management

**Payment API Endpoints:**

```
POST   /api/payment/create          - Create payment transaction
POST   /api/payment/webhook         - Midtrans webhook handler
GET    /api/payment/status/:orderId - Check payment status
POST   /api/payment/reconcile-latest - Reconcile latest pending payment (fallback)
GET    /api/payment/history         - Get user payment history
GET    /api/payment/access          - Get user's active access
GET    /api/payment/can-purchase    - Check if user can purchase
```

**Admin API Endpoints:**

```
GET    /api/admin/packages          - Get all packages
POST   /api/admin/packages          - Create package
PUT    /api/admin/packages/:id      - Update package
DELETE /api/admin/packages/:id      - Delete package
GET    /api/admin/packages/stats/payment - Payment statistics
```

---

### **Frontend (React + Vite)**

#### 1. **Services**

- `my-app/src/services/paymentService.js` - Payment API calls & Midtrans Snap integration

#### 2. **Pages**

- `my-app/src/pages/Pricing.jsx` - Pricing/payment page untuk user
- `my-app/src/pages/admin/AdminPackages.jsx` - Admin panel untuk manage packages

#### 3. **Frame Access Control**

- Updated `my-app/src/pages/Frames.jsx` dengan:
  - Check user payment access
  - Lock/unlock frames berdasarkan access
  - Redirect ke pricing page untuk upgrade

---

## ⚙️ Setup & Konfigurasi

### **1. Backend Setup**

#### Install Dependencies

```bash
cd backend
npm install midtrans-client
```

#### Environment Variables

Tambahkan di `backend/.env`:

```env
# Midtrans Configuration
MIDTRANS_SERVER_KEY=your-sandbox-server-key
MIDTRANS_CLIENT_KEY=your-sandbox-client-key
MIDTRANS_IS_PRODUCTION=false

# Frontend URL (for payment callbacks)
FRONTEND_URL=http://localhost:5173

# Optional: Safety rollout (recommended for first production tests)
# PAYMENT_CHECKOUT_MODE: disabled | whitelist | enabled
# - disabled: semua user tidak bisa checkout
# - whitelist: hanya user tertentu yang bisa checkout
# - enabled: semua user bisa checkout
#
# PAYMENT_CHECKOUT_WHITELIST: daftar email atau userId (comma-separated)
# contoh: PAYMENT_CHECKOUT_WHITELIST=test1@gmail.com,test2@gmail.com,uid_abc
PAYMENT_CHECKOUT_MODE=enabled
PAYMENT_CHECKOUT_WHITELIST=
```

> Catatan (Sandbox): status pembayaran yang benar datang dari webhook (Payment Notification), bukan dari redirect user.
> Endpoint webhook backend di project ini: `/api/payment/webhook` (full path: `https://<domain-backend>/api/payment/webhook`).

**Cara dapat Midtrans Keys:**

1. Daftar di https://dashboard.midtrans.com/
2. Pilih environment **Sandbox** (untuk testing)
3. Go to Settings → Access Keys
4. Copy **Server Key** dan **Client Key**

#### Database Migration

```bash
# Jalankan migration untuk create tables
psql -U fremio_user -d fremio -f database/migrations/002_create_payment_system.sql
```

---

### **2. Frontend Setup**

#### Environment Variables

Tambahkan di `my-app/.env`:

```env
# Midtrans Configuration
VITE_MIDTRANS_CLIENT_KEY=your-sandbox-client-key
VITE_MIDTRANS_IS_PRODUCTION=false

# Backend API URL
VITE_API_BASE_URL=http://localhost:3000
```

---

## 🚀 Cara Menggunakan

### **User Flow**

1. **User masuk ke halaman Frames** (`/frames`)

   - Jika belum login → diminta login
   - Jika sudah login tapi belum bayar → muncul banner "Unlock Premium"
   - Frames yang locked ditandai badge 🔒 Premium

2. **User klik frame yang locked**

   - Muncul konfirmasi untuk upgrade
   - Klik OK → redirect ke `/pricing`

3. **User di Pricing Page** (`/pricing`)

   - Lihat info paket premium (Rp 10.000 untuk 30 frames selama 30 hari)
   - Klik "Beli Sekarang"
   - Popup Midtrans muncul

4. **User memilih payment method**

   - Pilih GoPay, OVO, VA Bank, QRIS, dll
   - Ikuti instruksi pembayaran
   - Setelah bayar → akses otomatis aktif

5. **User kembali ke Frames**
   - Semua frames yang di-unlock sudah bisa diakses
   - Badge 🔒 hilang dari frames yang accessible

---

### **Admin Flow**

1. **Buat Paket Frame** (`/admin/packages`)

   - Klik form "Buat Paket Baru"
   - Isi nama paket (contoh: "Paket Wedding")
   - Pilih 10 frames untuk paket
   - Klik "Buat Paket"

2. **Manage Paket**

   - Edit paket: ubah nama, deskripsi, atau frames
   - Toggle active/inactive: aktifkan/nonaktifkan paket
   - Delete paket: hapus paket yang tidak terpakai

3. **View Statistics** (coming soon)
   - Lihat total revenue
   - Lihat jumlah pembayaran sukses
   - Track pending payments

---

## 🔄 Payment Flow (Technical)

### **1. User Klik "Beli"**

```
Frontend → POST /api/payment/create
         ← {token, redirectUrl}
Frontend → Open Midtrans Snap
```

### **2. User Bayar di Midtrans**

```
User → Pilih metode payment → Konfirmasi
Midtrans → Process payment
```

### **3. Midtrans Webhook**

```
Midtrans → POST /api/payment/webhook
Backend  → Update transaction status
Backend  → Grant package access (if settlement)
Backend  → Response 200 OK
```

### **4. User Check Access**

```
Frontend → GET /api/payment/access
Backend  ← {hasAccess: true, frameIds: [...], daysRemaining: 29}
Frontend → Update UI (unlock frames)
```

---

## 🧪 Testing (Sandbox Mode)

### **Test Payment Methods**

#### GoPay

- Pilih GoPay di Snap
- Scan QR dengan app GoPay (simulator available di dashboard)
- Klik "Bayar" → status jadi `settlement`

#### Bank Transfer (VA)

- Pilih BCA/BNI/BRI/Mandiri
- Dapat VA number
- Gunakan simulator di Midtrans dashboard untuk bayar
- Status → `settlement`

#### Credit Card

Test cards (Sandbox):

```
Card Number: 4811 1111 1111 1114
CVV: 123
Exp: 12/25
OTP: 112233
```

### **Webhook Testing**

Midtrans akan otomatis kirim webhook ke:

```
https://your-backend-url/api/payment/webhook
```

Untuk local testing:

1. Use **ngrok** untuk expose local backend
   ```bash
   ngrok http 3000
   ```
2. Copy ngrok URL ke Midtrans dashboard → Settings → Notification URL
   ```
   https://abc123.ngrok.io/api/payment/webhook
   ```

---

## 📊 Database Queries (Useful)

### Check User Access

```sql
SELECT * FROM user_package_access
WHERE user_id = 'FIREBASE_UID'
  AND is_active = true
  AND access_end > CURRENT_TIMESTAMP;
```

### Check Accessible Frames

```sql
SELECT fp.frame_ids
FROM user_package_access upa
JOIN frame_packages fp ON fp.id = ANY(upa.package_ids)
WHERE upa.user_id = 'FIREBASE_UID'
  AND upa.is_active = true;
```

### Payment Statistics

```sql
SELECT
  COUNT(*) as total_transactions,
  SUM(CASE WHEN transaction_status = 'settlement' THEN gross_amount ELSE 0 END) as total_revenue,
  COUNT(CASE WHEN transaction_status = 'settlement' THEN 1 END) as successful_payments
FROM payment_transactions;
```

### Expire Old Access (Auto cleanup)

```sql
SELECT deactivate_expired_access();
```

---

## 🛡️ Security

### **Webhook Verification**

Midtrans webhook sudah di-verify menggunakan:

```javascript
const statusResponse = await midtransCore.transaction.notification(
  notification
);
// Midtrans SDK otomatis verify signature
```

### **Access Control**

- User hanya bisa akses frames yang di-grant
- Check dilakukan di backend (database)
- Frontend hanya untuk UI control

### **Environment Variables**

- **JANGAN COMMIT** `.env` ke Git
- Use `.env.example` sebagai template
- Server key **harus RAHASIA**

---

## 🐛 Troubleshooting

### **Payment webhook tidak diterima**

- Check Midtrans dashboard → Settings → Notification URL
- Pastikan URL accessible dari internet (use ngrok untuk local)
- Check backend logs untuk error

### **User sudah bayar tapi akses belum aktif**

1. Check transaction status:
   ```sql
   SELECT * FROM payment_transactions WHERE order_id = 'ORDER_ID';
   ```
2. Check webhook logs di Midtrans dashboard
3. Manually grant access jika perlu:

   ```sql
   -- Get transaction ID
   SELECT id FROM payment_transactions WHERE order_id = 'ORDER_ID';

   -- Grant access
   INSERT INTO user_package_access (user_id, transaction_id, package_ids, access_end)
   VALUES ('USER_ID', TRANSACTION_ID, ARRAY[1,2,3], CURRENT_TIMESTAMP + INTERVAL '30 days');
   ```

### **Frames masih locked padahal sudah bayar**

- Clear browser cache
- Reload page
- Check: GET `/api/payment/access` response
- Verify frameIds di response sama dengan frame.id

---

## 📈 Next Steps / Improvements

### **Priority**

1. ✅ Basic payment flow - **DONE**
2. ✅ Admin package management - **DONE**
3. ✅ Frame access control - **DONE**
4. 🔲 Payment history page untuk user
5. 🔲 Email notification setelah payment sukses
6. 🔲 Refund handling

### **Nice to Have**

- Auto-renewal subscription
- Multiple payment tiers (weekly, monthly, yearly)
- Promo codes / discount system
- Referral rewards
- Payment analytics dashboard

---

## 📞 Support

### **Midtrans Support**

- Docs: https://docs.midtrans.com/
- Sandbox Dashboard: https://dashboard.sandbox.midtrans.com/
- Production Dashboard: https://dashboard.midtrans.com/

### **Developer**

Jika ada issue dengan payment system:

1. Check backend logs
2. Check Midtrans dashboard → Transactions
3. Check database tables untuk transaction status

---

## ✅ Checklist Go-Live (Production)

Sebelum launch ke production:

### **Midtrans**

- [ ] Daftar akun Production di Midtrans
- [ ] Lengkapi KYC documents
- [ ] Dapat approval dari Midtrans
- [ ] Copy Production Server Key & Client Key
- [ ] Update environment variables:
  ```env
  MIDTRANS_IS_PRODUCTION=true
  MIDTRANS_SERVER_KEY=production-server-key
  MIDTRANS_CLIENT_KEY=production-client-key
  ```

### **Backend**

- [ ] Deploy backend ke VPS/cloud
- [ ] Setup PostgreSQL production database
- [ ] Run database migrations
- [ ] Configure webhook URL di Midtrans dashboard
- [ ] Test webhook connectivity
- [ ] Setup SSL certificate (HTTPS required)

### **Frontend**

- [ ] Update environment variables:
  ```env
  VITE_MIDTRANS_IS_PRODUCTION=true
  VITE_MIDTRANS_CLIENT_KEY=production-client-key
  VITE_API_BASE_URL=https://api.yourdomain.com
  ```
- [ ] Build production bundle
- [ ] Deploy ke hosting

### **Testing**

- [ ] Test payment flow end-to-end
- [ ] Test semua payment methods
- [ ] Test webhook notification
- [ ] Test refund scenario
- [ ] Verify access granted correctly
- [ ] Test expiry logic (30 hari)

---

## 📝 Notes

- Sandbox mode unlimited testing, no real money
- Production mode requires KYC approval (~3-7 hari)
- MDR (Merchant Discount Rate) Midtrans: 2-2.9%
- Settlement time: T+1 atau T+2 (tergantung payment method)
- Minimum withdrawal: Rp 10.000

**Sistem sudah 100% functional dan siap untuk testing! 🚀**
