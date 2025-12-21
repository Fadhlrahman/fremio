// 🧪 MIDTRANS PAYMENT TEST SCRIPT
// Copy dan paste script ini ke Browser Console (F12 → Console)
// Pastikan Anda sudah login dan di halaman Pricing

console.log("🧪 Starting Midtrans Payment Test...\n");

// Step 1: Check if user is logged in
const token =
  localStorage.getItem("fremio_token") || localStorage.getItem("auth_token");
if (!token) {
  console.error("❌ NOT LOGGED IN! Please login first.");
  alert("Please login first!");
} else {
  console.log("✅ Token found:", token.substring(0, 30) + "...");
}

// Step 2: Check if Snap script is loaded
if (!window.snap) {
  console.error("❌ Midtrans Snap NOT LOADED!");
  console.log("Try loading manually...");
  const script = document.createElement("script");
  script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
  script.setAttribute("data-client-key", "Mid-client-J1httIljA1-8-Kh7");
  script.onload = () => console.log("✅ Snap loaded!");
  script.onerror = () => console.error("❌ Failed to load Snap");
  document.head.appendChild(script);
} else {
  console.log("✅ Midtrans Snap is loaded!");
}

// Step 3: Test payment creation
async function testPayment() {
  console.log("\n💰 Creating test payment...");

  try {
    const response = await fetch("https://localhost:5050/api/payment/create", {
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
    });

    const data = await response.json();
    console.log("📥 Payment Response:", data);

    if (data.success && data.data && data.data.token) {
      console.log("✅ Payment created successfully!");
      console.log("🎫 Token:", data.data.token.substring(0, 30) + "...");
      console.log("📦 Order ID:", data.data.orderId);

      // Open Snap popup
      if (window.snap) {
        console.log("🚀 Opening Midtrans Snap popup...");
        window.snap.pay(data.data.token, {
          onSuccess: (result) => {
            console.log("✅ Payment Success:", result);
            alert("Payment berhasil!");
          },
          onPending: (result) => {
            console.log("⏳ Payment Pending:", result);
            alert("Payment pending");
          },
          onError: (result) => {
            console.error("❌ Payment Error:", result);
            alert("Payment error");
          },
          onClose: () => {
            console.log("🚪 Popup closed");
          },
        });
      } else {
        console.error("❌ window.snap not available!");
        alert("Snap script not loaded. Please refresh page.");
      }
    } else {
      console.error("❌ Payment creation failed:", data);
      alert("Failed to create payment: " + (data.message || "Unknown error"));
    }
  } catch (error) {
    console.error("❌ Error:", error);
    alert("Error: " + error.message);
  }
}

// Auto-run test after 2 seconds
console.log("\n⏳ Starting payment test in 2 seconds...");
setTimeout(testPayment, 2000);

console.log("\n💡 Or run manually: testPayment()");
