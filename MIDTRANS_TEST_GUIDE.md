# 🧪 MIDTRANS INTEGRATION - FINAL TEST

## Status Integrasi:

✅ Backend API - 100% Working (tested via PowerShell)
✅ Snap script in index.html - Client key configured
✅ Frontend payment code - Updated with error handling
⏳ **PERLU TEST DI BROWSER**

---

## CARA TEST (SIMPLE):

### 1. Buka Browser

```
URL: https://localhost:5180
```

### 2. Open Console (F12 → Console tab)

### 3. Copy & Paste Script Ini:

```javascript
// 🧪 MIDTRANS QUICK TEST
console.log("🧪 Testing Midtrans Integration...\n");

// Check 1: Snap Script
console.log("1️⃣ Checking Snap script...");
if (window.snap) {
  console.log("✅ window.snap LOADED!");
  console.log("Snap methods:", Object.keys(window.snap));
} else {
  console.error("❌ window.snap NOT FOUND!");
  console.error("⚠️ Snap script gagal load - refresh page!");
}

// Check 2: Auth Token
console.log("\n2️⃣ Checking auth token...");
const token =
  localStorage.getItem("fremio_token") || localStorage.getItem("auth_token");
if (token) {
  console.log("✅ Token found:", token.substring(0, 30) + "...");
} else {
  console.error("❌ Token not found - please login first!");
}

// Check 3: Create & Open Payment
if (window.snap && token) {
  console.log("\n3️⃣ Creating test payment...");

  fetch("https://localhost:5050/api/payment/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: "kuatbotak808@gmail.com",
      name: "Test User",
      phone: "081234567890",
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      console.log("📦 Response:", data);

      if (data.success && data.data && data.data.token) {
        console.log("✅ Payment created!");
        console.log("Order ID:", data.data.orderId);
        console.log("Token:", data.data.token.substring(0, 30) + "...");

        console.log("\n🚀 Opening Midtrans Snap popup in 2 seconds...");

        setTimeout(() => {
          window.snap.pay(data.data.token, {
            onSuccess: (result) => {
              console.log("✅ SUCCESS!", result);
              alert("✅ Payment berhasil!");
            },
            onPending: (result) => {
              console.log("⏳ PENDING", result);
              alert("⏳ Payment pending");
            },
            onError: (result) => {
              console.error("❌ ERROR", result);
              alert("❌ Payment error");
            },
            onClose: () => {
              console.log("🚪 Popup closed");
            },
          });
        }, 2000);
      } else {
        console.error("❌ Payment creation failed:", data);
      }
    })
    .catch((err) => {
      console.error("❌ Fetch error:", err);
    });
} else {
  console.error("\n⚠️ CANNOT TEST: Missing Snap or Token");
  if (!window.snap) console.error("→ Snap script not loaded");
  if (!token) console.error("→ Not logged in");
}
```

### 4. Apa yang Harus Terjadi:

- ✅ "window.snap LOADED!" - Snap script berhasil load
- ✅ "Token found: ..." - User sudah login
- ✅ "Payment created!" - Backend berhasil create payment
- ✅ **POPUP MIDTRANS MUNCUL** dalam 2 detik!

### 5. Kalau Popup Tidak Muncul:

- Screenshot seluruh Console
- Screenshot Network tab (F12 → Network, filter "payment")
- Kirim screenshot ke agent

---

## Test Card (Sandbox):

- Card: `4811 1111 1111 1114`
- CVV: `123`
- Expiry: `01/27`
- OTP: `112233`

---

## Troubleshooting:

### Error: "window.snap NOT FOUND"

**Solusi:**

1. Refresh browser (Ctrl+F5)
2. Check index.html ada script Snap
3. Check browser Console ada error loading snap.js

### Error: "Token not found"

**Solusi:**

1. Login dulu di https://localhost:5180
2. Test ulang

### Payment Created tapi Popup Tidak Muncul

**Solusi:**

1. Check Console ada error "window.snap.pay"
2. Pastikan tidak ada popup blocker
3. Screenshot dan kirim ke agent

---

## SIMPLIFIED BUTTON TEST:

Kalau mau test langsung dari Pricing page:

1. Buka https://localhost:5180/pricing
2. Login kalau belum
3. Klik "Dapatkan Sekarang"
4. Popup harus muncul!

Kalau masih error, jalankan test script di atas untuk debug.
