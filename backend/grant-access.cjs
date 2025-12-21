// Manual grant access script
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'fremio',
  user: 'postgres',
  password: 'postgres123',
  port: 5432
});

async function grantAccess() {
  try {
    // Get user ID
    const userResult = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      ['kuatbotak808@gmail.com']
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found!');
      await pool.end();
      return;
    }

    const userId = userResult.rows[0].id;
    console.log('✅ User ID:', userId);

    // Get last transaction
    const txResult = await pool.query(
      `SELECT * FROM payment_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (txResult.rows.length === 0) {
      console.log('❌ No transactions found!');
      await pool.end();
      return;
    }

    const transaction = txResult.rows[0];
    console.log('📦 Last transaction:', transaction.order_id, 'Status:', transaction.transaction_status);

    // Get packages
    const packagesResult = await pool.query(
      `SELECT id, name FROM frame_packages WHERE is_active = true ORDER BY id LIMIT 3`
    );

    if (packagesResult.rows.length < 3) {
      console.log('❌ Not enough packages! Found:', packagesResult.rows.length);
      await pool.end();
      return;
    }

    const packages = packagesResult.rows;
    console.log('📦 Packages:', packages.map(p => p.name).join(', '));

    // Grant access for each package
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

      // Grant new access
      await pool.query(
        `INSERT INTO user_package_access (user_id, package_id, transaction_id, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, pkg.id, transaction.id, startDate, endDate]
      );

      console.log(`✅ Granted access to: ${pkg.name}`);
    }

    console.log('\n✅ ACCESS GRANTED FOR 30 DAYS!');
    console.log(`   From: ${startDate.toISOString()}`);
    console.log(`   To: ${endDate.toISOString()}`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

grantAccess();
