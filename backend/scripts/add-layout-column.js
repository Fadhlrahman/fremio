/**
 * Migration script to add layout column to frames table
 * Run with: node scripts/add-layout-column.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'fremio',
  user: process.env.DB_USER || 'fremio_user',
  password: process.env.DB_PASSWORD || 'fremio123',
});

async function migrate() {
  console.log('🔧 Adding layout column to frames table...');
  
  try {
    // Check if column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'frames' AND column_name = 'layout'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Layout column already exists!');
    } else {
      // Add column
      await pool.query(`
        ALTER TABLE frames 
        ADD COLUMN layout JSONB DEFAULT '{}'
      `);
      console.log('✅ Layout column added successfully!');
    }
    
    // Verify
    const verifyResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'frames'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Frames table columns:');
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

migrate();
