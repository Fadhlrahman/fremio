/**
 * n8n Webhook Service
 * Sends events to n8n for email automation
 */

// N8N_WEBHOOK_BASE_URL should be set in .env (e.g., http://127.0.0.1:5678)
// This service is non-blocking: failures are logged but don't break the payment flow.

const getWebhookBaseUrl = () => {
  return String(process.env.N8N_WEBHOOK_BASE_URL || "http://127.0.0.1:5678").replace(/\/$/, "");
};

const getWebhookSecret = () => {
  // Optional shared secret for verifying webhook authenticity
  return process.env.N8N_WEBHOOK_SECRET || "";
};

/**
 * Send payment success event to n8n
 * n8n will handle sending the email
 */
export async function sendPaymentSuccessEvent({
  email,
  orderId,
  customerName,
  paymentMethod,
  amount,
  accessEndDate,
}) {
  const baseUrl = getWebhookBaseUrl();
  const webhookPath = "/webhook/fremio-payment-success";
  const url = `${baseUrl}${webhookPath}`;

  const payload = {
    event: "payment_success",
    timestamp: new Date().toISOString(),
    data: {
      email,
      orderId,
      customerName: customerName || "Fremio User",
      paymentMethod: paymentMethod || "Unknown",
      amount: amount || 0,
      accessEndDate: accessEndDate || null,
      appUrl: process.env.FRONTEND_URL || "https://fremio.id",
    },
  };

  // Add optional secret header
  const headers = {
    "Content-Type": "application/json",
  };
  const secret = getWebhookSecret();
  if (secret) {
    headers["X-Webhook-Secret"] = secret;
  }

  try {
    console.log("📧 Sending payment success event to n8n:", { email, orderId });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("❌ n8n webhook failed:", response.status, text);
      return { success: false, status: response.status, message: text };
    }

    console.log("✅ n8n webhook sent successfully for:", orderId);
    return { success: true };
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("❌ n8n webhook timeout for:", orderId);
    } else {
      console.error("❌ n8n webhook error:", error.message);
    }
    // Non-blocking: don't throw, just return failure
    return { success: false, error: error.message };
  }
}

export default {
  sendPaymentSuccessEvent,
};
