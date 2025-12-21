import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: "localhost",
  database: "fremio",
  user: "postgres",
  password: "postgres123",
  port: 5432,
});

async function manualGrantAccess() {
  try {
    const userId = "5ce1388b-5b8c-4d92-a3a6-8df381977721";
    console.log("✅ User ID:", userId);

    // Get packages
    const packagesResult = await pool.query(
      `SELECT id, name FROM frame_packages WHERE is_active = true ORDER BY id LIMIT 3`
    );

    console.log(`📦 Found ${packagesResult.rows.length} packages`);

    if (packagesResult.rows.length === 0) {
      console.log("❌ No packages found!");
      await pool.end();
      return;
    }

    const packages = packagesResult.rows;
    console.log("📦 Packages:", packages.map((p) => p.name).join(", "));

    // Grant access for each package (without transaction)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30 days access

    for (const pkg of packages) {
      // Check if already has access
      const existingAccess = await pool.query(
        `SELECT id FROM user_package_access 
         WHERE user_id = $1 AND package_id = $2 AND end_date > NOW()`,
        [userId, pkg.id]
      );

      if (existingAccess.rows.length > 0) {
        console.log(`⚠️  Already has access to: ${pkg.name}`);
        continue;
      }

      // Grant new access (transaction_id can be NULL)
      await pool.query(
        `INSERT INTO user_package_access (user_id, package_id, start_date, end_date)
         VALUES ($1, $2, $3, $4)`,
        [userId, pkg.id, startDate, endDate]
      );

      console.log(`✅ Granted access to: ${pkg.name}`);
    }

    console.log("\n🎉 ACCESS GRANTED FOR 30 DAYS!");
    console.log(`   From: ${startDate.toLocaleString()}`);
    console.log(`   To: ${endDate.toLocaleString()}`);

    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    await pool.end();
  }
}

manualGrantAccess();
