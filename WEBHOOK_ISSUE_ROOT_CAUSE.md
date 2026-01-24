# 🔍 Root Cause Analysis: Kenapa User Sudah Bayar Tapi Tidak Bisa Akses

## 📋 Summary Masalah

**4 user sudah bayar via Midtrans (DANA/GOPAY) dan status di Midtrans = SETTLEMENT, tapi tidak dapat akses premium karena webhook notification dari Midtrans tidak sampai ke backend server.**

## 🎯 Root Cause yang Ditemukan

### 1. **Webhook URL Tidak Terdaftar di Midtrans Dashboard**

Backend code sudah ada handler webhook di:

```
POST /api/payment/webhook
```

**TAPI:** Webhook URL belum didaftarkan di Midtrans Dashboard!

Untuk Midtrans bisa kirim notification otomatis, harus setting di:

- **Midtrans Dashboard** → Settings → **Notification URL**
- URL harus: `https://api.fremio.id/api/payment/webhook`
- Atau: `http://72.61.214.5:5050/api/payment/webhook`

### 2. **Mismatch FRONTEND_URL di Environment**

File: `/var/www/fremio-backend/.env`

```env
FRONTEND_URL=https://localhost:5180  ❌ SALAH!
MIDTRANS_IS_PRODUCTION=true
```

**Masalah:**

- `FRONTEND_URL` masih localhost (development) padahal `MIDTRANS_IS_PRODUCTION=true`
- Harusnya: `FRONTEND_URL=https://fremio.id`
- Ini tidak langsung block webhook, tapi bisa bikin redirect payment page error

### 3. **Backend Path Berbeda**

Local development: `d:\Project\fremio\backend\`
Production VPS: `/var/www/fremio-backend/`

Backend VPS jalan di path berbeda, jadi perubahan di local tidak auto apply ke production.

---

## 🔧 Cara Kerja Normal (yang Seharusnya)

### Flow Payment yang Benar:

```
1. User klik "Subscribe Premium"
   ↓
2. Frontend call: POST /api/payment/create-transaction
   ↓
3. Backend generate Snap token via Midtrans API
   ↓
4. User dibawa ke Midtrans payment page
   ↓
5. User bayar via DANA/GOPAY → SUCCESS
   ↓
6. ⚠️ MIDTRANS HARUS KIRIM WEBHOOK ⚠️
   POST https://api.fremio.id/api/payment/webhook
   {
     "order_id": "FRM-xxx",
     "transaction_status": "settlement",
     "payment_type": "dana"
   }
   ↓
7. Backend receive webhook:
   - Update payment_transactions.status → "settlement"
   - Grant premium access (30 days)
   - Insert ke user_package_access
   ↓
8. ✅ User dapat akses premium
```

### Yang Terjadi di 4 User Kemarin:

```
Step 1-5: ✅ OK (user berhasil bayar di Midtrans)
Step 6: ❌ GAGAL - Webhook TIDAK sampai ke backend
        Kemungkinan:
        - Webhook URL tidak terdaftar di Midtrans
        - Midtrans tidak tahu harus kirim ke mana

Step 7-8: ❌ TIDAK JALAN
        - Database masih status "pending"/"failed"
        - Tidak ada grant access

Result: User bayar tapi tidak dapat access 😢
```

---

## 🛠️ Solusi yang Sudah Dilakukan (Manual)

Untuk 4 user kemarin, kita manual grant access:

1. **jasiminehana@gmail.com** (DANA - 20 Jan)
2. **phinkavalina@gmail.com** (Manual - 22 Jan)
3. **suryadihakim39@gmail.com** (GOPAY - 21 Jan)
4. **wahyupanjaitan09@gmail.com** (GOPAY - 21 Jan)

Manual grant pakai script:

```sql
UPDATE payment_transactions
SET status = 'completed', paid_at = NOW(), gateway = 'midtrans'
WHERE invoice_number = 'FRM-xxx';

INSERT INTO user_package_access (user_id, transaction_id, package_ids, access_start, access_end, is_active)
VALUES (..., NOW(), NOW() + INTERVAL '30 days', true);
```

---

## ✅ Solusi Permanen (Agar Tidak Terulang)

### 1. Daftar Webhook URL di Midtrans Dashboard

**Login ke:** https://dashboard.midtrans.com/

**Production Settings:**

- Menu: **Settings** → **Configuration**
- Scroll ke: **Payment Notification URL**
- Isi: `https://api.fremio.id/api/payment/webhook`
- Save

**Sandbox Settings (untuk testing):**

- Menu: **Settings** → **Configuration** (Sandbox)
- Isi: `http://72.61.214.5:5050/api/payment/webhook`

### 2. Fix Environment Variable di VPS

```bash
ssh root@72.61.214.5
cd /var/www/fremio-backend
nano .env
```

Ubah:

```env
# SEBELUM
FRONTEND_URL=https://localhost:5180

# SESUDAH
FRONTEND_URL=https://fremio.id
```

Restart backend:

```bash
pm2 restart fremio-backend
# atau
systemctl restart fremio-backend
```

### 3. Test Webhook Manual

Setelah webhook URL didaftar, test dengan:

**Via Midtrans Dashboard:**

- Menu: **Transactions**
- Pilih transaksi yang berhasil
- Klik: **Send Notification** (resend webhook)

**Via Command Line:**

```bash
curl -X POST https://api.fremio.id/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_status": "settlement",
    "order_id": "TEST-123",
    "payment_type": "dana"
  }'
```

### 4. Monitor Webhook Logs

Cek apakah webhook masuk:

```bash
ssh root@72.61.214.5
tail -f /var/www/fremio-backend/logs/backend.log | grep "📥"
```

Output yang diharapkan:

```
📥 Raw webhook received: {...}
📥 Payment notification received: {...}
✅ Payment successful, granting access...
```

---

## 📊 Statistics Webhook Issue

Dari database check:

```
Failed tanpa access:   49 transaksi
Pending tanpa access:  160 transaksi (kebanyakan expired/dibatalkan user)
GOPAY pending aktif:   2 transaksi (sudah difix manual)
DANA pending aktif:    2 transaksi (sudah difix manual)
```

**Total user terpengaruh yang sudah bayar:** 4 user (sudah difix semua)

---

## 🎯 Action Items

### Immediate (Harus Dilakukan Sekarang):

- [ ] Daftar webhook URL di Midtrans Dashboard Production
- [ ] Daftar webhook URL di Midtrans Dashboard Sandbox
- [ ] Fix `FRONTEND_URL` di VPS .env
- [ ] Restart backend VPS

### Short Term (1-2 hari):

- [ ] Test webhook dengan transaksi baru
- [ ] Monitor logs untuk 24 jam
- [ ] Check semua pending transactions > 48 jam (manual reconcile)

### Long Term:

- [ ] Implement auto-reconcile service (cek pending > 24 jam)
- [ ] Add webhook retry mechanism
- [ ] Setup monitoring/alert untuk webhook failures
- [ ] Backup webhook: cron job check Midtrans API setiap 1 jam

---

## 🔗 References

- Backend webhook handler: `backend/routes/payment.js` line 607-820
- Midtrans docs: https://docs.midtrans.com/en/after-payment/http-notification
- VPS backend path: `/var/www/fremio-backend/`
- Production API: `https://api.fremio.id`

---

**Dibuat:** 24 Jan 2026
**Status:** 4/4 user sudah difix manual ✅
**Next Step:** Setup webhook URL di Midtrans Dashboard
