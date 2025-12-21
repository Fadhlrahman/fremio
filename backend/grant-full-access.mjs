import pg from "pg";

const pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  database: "fremio",
  user: "postgres",
  password: "postgres123",
});

console.log("🧪 FULL PAYMENT FLOW TEST\n");
console.log("=".repeat(50));

const userId = "5ce1388b-5b8c-4d92-a3a6-8df381977721";
const orderId = "TEST-MANUAL-" + Date.now();
const amount = 10000;

try {
  // Step 1: Create transaction
  console.log("\n1️⃣ Creating transaction...");
  const txResult = await pool.query(
    `
    INSERT INTO payment_transactions (
      user_id, invoice_number, amount, status, currency, gateway, transaction_type, created_at
    ) VALUES ($1, $2, $3, 'completed', 'IDR', 'midtrans', 'one_time', NOW())
    RETURNING *
  `,
    [userId, orderId, amount]
  );

  const transaction = txResult.rows[0];
  console.log("✅ Transaction created:");
  console.log("   ID:", transaction.id);
  console.log("   Invoice:", transaction.invoice_number);
  console.log("   Status:", transaction.status);

  // Step 2: Get packages
  console.log("\n2️⃣ Getting available packages...");
  const pkgResult = await pool.query(`
    SELECT id, name FROM frame_packages WHERE is_active = true LIMIT 3
  `);

  if (pkgResult.rows.length === 0) {
    console.log("❌ No packages found!");
    process.exit(1);
  }

  const packageIds = pkgResult.rows.map((p) => p.id);
  console.log("✅ Found packages:", packageIds);
  pkgResult.rows.forEach((p) => console.log(`   - ${p.name} (ID: ${p.id})`));

  // Step 3: Grant access
  console.log("\n3️⃣ Granting access...");
  const accessEnd = new Date();
  accessEnd.setDate(accessEnd.getDate() + 30);

  const accessResult = await pool.query(
    `
    INSERT INTO user_package_access (
      user_id, transaction_id, package_ids, access_end, is_active
    ) VALUES ($1, $2, $3, $4, true)
    RETURNING *
  `,
    [userId, transaction.id, packageIds, accessEnd]
  );

  console.log("✅ Access granted:");
  console.log("   Package IDs:", accessResult.rows[0].package_ids);
  console.log("   Expires:", accessResult.rows[0].access_end);
  console.log("   Active:", accessResult.rows[0].is_active);

  // Step 4: Verify access
  console.log("\n4️⃣ Verifying access...");
  const verifyResult = await pool.query(
    `
    SELECT 
      upa.*,
      pt.invoice_number,
      pt.amount
    FROM user_package_access upa
    LEFT JOIN payment_transactions pt ON upa.transaction_id = pt.id
    WHERE upa.user_id = $1 
      AND upa.is_active = true
      AND upa.access_end > NOW()
    ORDER BY upa.created_at DESC
    LIMIT 1
  `,
    [userId]
  );

  if (verifyResult.rows.length > 0) {
    console.log("✅ Access verified!");
    console.log(
      "   User has active access to",
      verifyResult.rows[0].package_ids.length,
      "packages"
    );
    console.log("   Valid until:", verifyResult.rows[0].access_end);
  } else {
    console.log("❌ Access verification failed!");
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ FULL FLOW TEST COMPLETE!");
  console.log("\nNow user should be able to access premium frames.");
  console.log("Refresh browser and try accessing frames.");
} catch (error) {
  console.error("\n❌ ERROR:", error.message);
  console.error("Code:", error.code);
  console.error("Detail:", error.detail);
} finally {
  await pool.end();
}
