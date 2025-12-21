import pg from "pg";

const pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  database: "fremio",
  user: "postgres",
  password: "postgres123",
});

console.log("Testing payment transaction creation...\n");

// Test data
const testData = {
  userId: "5ce1388b-5b8c-4d92-a3a6-8df381977721",
  orderId: "TEST-" + Date.now(),
  grossAmount: 10000,
};

console.log("Test data:", testData);

try {
  const query = `
    INSERT INTO payment_transactions (
      user_id, invoice_number, amount, status, currency, gateway, transaction_type, created_at
    ) VALUES ($1, $2, $3, 'pending', 'IDR', 'midtrans', 'one_time', NOW())
    RETURNING *
  `;

  const result = await pool.query(query, [
    testData.userId,
    testData.orderId,
    testData.grossAmount,
  ]);

  console.log("\n✅ Transaction created successfully!");
  console.log("ID:", result.rows[0].id);
  console.log("Invoice:", result.rows[0].invoice_number);
  console.log("Status:", result.rows[0].status);

  // Clean up test transaction
  await pool.query(
    "DELETE FROM payment_transactions WHERE invoice_number = $1",
    [testData.orderId]
  );
  console.log("\n🧹 Test transaction cleaned up");
} catch (error) {
  console.error("\n❌ Error creating transaction:");
  console.error("Message:", error.message);
  console.error("Code:", error.code);
  console.error("Detail:", error.detail);
}

await pool.end();
