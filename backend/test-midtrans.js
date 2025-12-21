/**
 * Test Midtrans Integration Directly
 */

import dotenv from "dotenv";
import { createRequire } from "module";

// Load environment variables
dotenv.config();

const require = createRequire(import.meta.url);
const midtransClient = require("midtrans-client");

async function testMidtrans() {
  console.log("🧪 Testing Midtrans Integration\n");

  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.MIDTRANS_CLIENT_KEY;

  console.log("📋 Configuration:");
  console.log("   Environment:", isProduction ? "PRODUCTION" : "SANDBOX");
  console.log("   Server Key:", serverKey);
  console.log("   Client Key:", clientKey);
  console.log("   Server Key Length:", serverKey?.length || 0, "chars");
  console.log("   Client Key Length:", clientKey?.length || 0, "chars");
  console.log("");

  if (!serverKey || !clientKey) {
    console.error("❌ ERROR: Keys not found in .env file!");
    process.exit(1);
  }

  // Initialize Snap API
  const snap = new midtransClient.Snap({
    isProduction,
    serverKey,
    clientKey,
  });

  // Create test transaction
  const orderId = `TEST-${Date.now()}`;
  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: 10000,
    },
    customer_details: {
      first_name: "Test",
      last_name: "User",
      email: "test@fremio.com",
      phone: "081234567890",
    },
    item_details: [
      {
        id: "FREMIO_PREMIUM",
        price: 10000,
        quantity: 1,
        name: "Fremio Premium Frames",
      },
    ],
  };

  console.log("📤 Creating test transaction:");
  console.log("   Order ID:", orderId);
  console.log("   Amount: Rp 10,000");
  console.log("");

  try {
    console.log("🔄 Calling Midtrans API...\n");
    const transaction = await snap.createTransaction(parameter);

    console.log("✅ SUCCESS! Transaction created:");
    console.log("   Token:", transaction.token);
    console.log("   Redirect URL:", transaction.redirect_url);
    console.log("");
    console.log("🎉 Midtrans integration is working correctly!");
    console.log("");
    console.log("You can test payment at:");
    console.log(transaction.redirect_url);
  } catch (error) {
    console.error("❌ FAILED! Error details:");
    console.error("");
    console.error("Error Message:", error.message);
    console.error("");

    if (error.ApiResponse) {
      console.error(
        "API Response:",
        JSON.stringify(error.ApiResponse, null, 2)
      );
    }

    if (error.httpStatusCode) {
      console.error("HTTP Status:", error.httpStatusCode);
    }

    if (error.response) {
      console.error("Response Data:", error.response.data || error.response);
    }

    console.error("");
    console.error("Full Error Object:", error);

    process.exit(1);
  }
}

testMidtrans();
