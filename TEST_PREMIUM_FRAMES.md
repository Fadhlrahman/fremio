# 🎯 Test Frame Premium - Complete Guide

## ✅ Current Status

**Backend Ready:**

- ✅ Mock premium frames available (3 frames)
- ✅ Premium frames locked (`slots: []`)
- ✅ Free frames unlocked (with slots)
- ✅ Lock mechanism working
- ✅ Payment routes ready

**What Works Now (Without Database):**

- ✅ View frames in gallery
- ✅ See "🔒 Premium" badge
- ✅ Premium frames show as locked
- ✅ Free frames fully accessible

**What Needs Setup:**

1. Midtrans API keys (untuk actual payment)
2. PostgreSQL (untuk save payment data)

---

## 🧪 Test di Browser (NOW)

### 1. Refresh Browser

```
Press F5 or Ctrl+R
```

### 2. Login

```
Email: admin@fremio.com
Password: admin123
```

### 3. Check Gallery/Frames Page

```
Navigate to: /fremio/gallery atau /fremio/frames
```

**Anda akan melihat:**

- ✅ **Golden Birthday Frame** → Badge "🔒 Premium", opacity lebih rendah
- ✅ **Diamond Wedding Frame** → Badge "🔒 Premium", locked
- ✅ **Simple Collage** → No badge, fully accessible

### 4. Click Premium Frame

**What Should Happen:**

- Modal popup muncul
- Message: "Frame ini premium. Kamu perlu membeli akses dulu."
- Button "Beli Akses" → Redirect ke `/fremio/pricing`

### 5. Go to Pricing Page

```
Navigate to: /fremio/pricing
```

**Akan melihat packages:**

- Single Frame Access - Rp 10,000
- Basic Pack (5 frames) - Rp 25,000
- Pro Pack (All frames) - Rp 50,000

### 6. Click "Beli Sekarang"

**Current Behavior (without Midtrans keys):**

- Error: "Midtrans not configured"
- Need API keys untuk popup payment

---

## 🔑 Enable Full Payment Flow

### Step 1: Get Midtrans Sandbox Keys

**Register:**

```
1. Go to: https://dashboard.sandbox.midtrans.com/register
2. Fill form:
   - Full Name: Your Name
   - Email: your-email@gmail.com (verified email)
   - Password: Strong password
   - Phone: +62xxxxxxxxxxx
3. Verify email
4. Login to dashboard
```

**Get Keys:**

```
1. Menu: Settings → Access Keys
2. Copy both keys:
   - Server Key: SB-Mid-server-xxxxx
   - Client Key: SB-Mid-client-xxxxx
```

### Step 2: Update .env Files

**Backend** (`D:\Project\fremio\backend\.env`):

```env
MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_KEY_HERE
MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_KEY_HERE
MIDTRANS_IS_PRODUCTION=false
```

**Frontend** (`D:\Project\fremio\my-app\.env`):

```env
VITE_MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_KEY_HERE
VITE_MIDTRANS_IS_PRODUCTION=false
```

### Step 3: Restart Both Servers

**Backend:**

```powershell
cd D:\Project\fremio\backend
# Kill existing
Get-Process -Name node | Stop-Process -Force
# Start fresh
npm start
```

**Frontend:**

```powershell
cd D:\Project\fremio\my-app
# Press Ctrl+C in running terminal
# Then start:
npm run dev
```

### Step 4: Test Payment Flow

**A. Open Browser:**

```
https://localhost:5180/fremio/pricing
```

**B. Click "Beli Sekarang" pada package:**

```
Single Frame Access - Rp 10,000
```

**C. Midtrans Snap Popup Muncul:**

```
- Pilih metode: Credit Card
- Card Number: 4811 1111 1111 1114
- Exp Date: 01/25
- CVV: 123
- Click Pay
```

**D. Payment Success:**

```
- Redirect back ke app
- Premium frame unlocked
- Badge berubah dari "🔒 Premium" ke "✓ Unlocked"
- Slots available untuk edit
```

---

## 🧪 Test Credit Cards (Sandbox)

### Success Scenarios:

**Card 1: Instant Success**

```
Number: 4811 1111 1111 1114
Exp: 01/25
CVV: 123
Result: Immediate payment success
```

**Card 2: 3D Secure Success**

```
Number: 4811 1111 1111 1114
Exp: 01/25
CVV: 123
OTP: 112233
Result: Success after 3DS verification
```

### Failed Scenarios:

**Card: Failed Payment**

```
Number: 4911 1111 1111 1113
Exp: 01/25
CVV: 123
Result: Payment declined
```

### Pending Scenarios:

**Card: Pending Payment**

```
Number: 4411 1111 1111 1118
Exp: 01/25
CVV: 123
Result: Payment pending (auto-settle after 5 min in sandbox)
```

---

## 📊 Verify Payment Works

### Check Backend Logs:

```
Console output akan show:
✅ Payment notification received
✅ Order ID: order-xxxxx
✅ Payment status: settlement
✅ Granting access to frame: premium-frame-001
```

### Check Frontend:

```
1. Premium badge changes
2. Frame becomes clickable
3. Slots appear in editor
4. Toast notification: "Payment berhasil!"
```

### Check API Endpoint:

```powershell
# Get access list
$token = "YOUR_JWT_TOKEN_HERE"
curl.exe -k -H "Authorization: Bearer $token" https://localhost:5050/api/payment/access
```

**Expected Response:**

```json
{
  "success": true,
  "frames": ["premium-frame-001"],
  "packages": []
}
```

---

## 🗄️ Database Setup (Optional - untuk Production)

### Why Need Database?

- Save payment history
- Track user access
- Record transactions
- Analytics

### Quick Setup:

**1. Install PostgreSQL:**

```
Download: https://www.postgresql.org/download/windows/
Install PostgreSQL 16
```

**2. Create Database:**

```powershell
psql -U postgres

CREATE DATABASE fremio;
CREATE USER salwa WITH PASSWORD 'fremio2024';
GRANT ALL PRIVILEGES ON DATABASE fremio TO salwa;
\q
```

**3. Import Schema:**

```powershell
cd D:\Project\fremio
psql -U salwa -d fremio -f database\schema.sql
```

**4. Update backend/.env:**

```env
DB_PASSWORD=fremio2024
```

**5. Verify:**

```powershell
psql -U salwa -d fremio

# Check tables
\dt

# Should see: frames, users, payment_transactions, etc.
```

---

## 🎨 UI Components

### Premium Badge Display:

```jsx
{
  frame.isPremium && frame.isLocked && (
    <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded">
      🔒 Premium
    </div>
  );
}
```

### Lock Overlay:

```jsx
{
  frame.isLocked && (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <LockIcon className="w-12 h-12 text-white" />
    </div>
  );
}
```

### Payment Button:

```jsx
<button
  onClick={() => handlePayment(frameId)}
  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg"
>
  Unlock Frame - Rp 10,000
</button>
```

---

## 🔍 Troubleshooting

### Problem: "Midtrans is not defined"

**Solution:**

- Add Midtrans script to index.html:

```html
<script
  src="https://app.sandbox.midtrans.com/snap/snap.js"
  data-client-key="YOUR_CLIENT_KEY"
></script>
```

### Problem: Premium frames tidak locked

**Solution:**

- Check frame response from API
- Verify `isPremium: true` dan `isLocked: true`
- Check `slots: []` (empty array = locked)

### Problem: Payment success tapi frame masih locked

**Solution:**

- Check webhook logs di backend
- Verify payment notification received
- Check access endpoint: `/api/payment/access`
- May need database for persistent storage

### Problem: "Backend tidak terima webhook"

**Solution:**

- Webhook only works di production dengan public URL
- Untuk local testing: payment success → manually unlock
- Or use ngrok untuk expose local backend

---

## 📝 Next Steps

### Immediate (Test Now):

1. ✅ Login to app
2. ✅ View frames gallery
3. ✅ See premium badges
4. ✅ Try clicking locked frame
5. ✅ Navigate to pricing page

### To Enable Payment (Need Keys):

1. Register Midtrans sandbox
2. Copy API keys
3. Update .env files
4. Restart servers
5. Test payment flow

### For Production:

1. Install PostgreSQL
2. Setup database schema
3. Switch to Midtrans production
4. Setup webhook URL (public)
5. Test full flow end-to-end

---

## 🎯 Success Criteria

✅ **Phase 1: Visual (Working Now)**

- Premium frames show badges
- Locked frames have overlay
- Click shows modal/redirect

✅ **Phase 2: Payment (Need Keys)**

- Midtrans popup appears
- Test cards work
- Payment confirmed

✅ **Phase 3: Unlock (Need DB)**

- Access saved to database
- Frame unlocked permanently
- Slots available for use

---

**Current Status: Phase 1 Complete ✅**  
**Next Step: Get Midtrans keys for Phase 2** 🔑
