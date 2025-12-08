// Script to add display_order column to frames table
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fremio',
  user: process.env.DB_USER || 'salwa',
  password: process.env.DB_PASSWORD || '',
});

async function addDisplayOrderColumn() {
  const client = await pool.connect();
  try {
    console.log('🔧 Adding display_order column to frames table...');
    
    // Add display_order column
    await client.query(`
      ALTER TABLE frames ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999
    `);
    console.log('✅ Column added successfully');
    
    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_frames_display_order ON frames(display_order)
    `);
    console.log('✅ Index created successfully');
    
    // Verify
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'frames' AND column_name = 'display_order'
    `);
    console.log('📋 Column info:', result.rows[0]);
    
    // Show current frames with display_order
    const frames = await client.query(`
      SELECT id, name, category, display_order FROM frames ORDER BY display_order, created_at
    `);
    console.log('📋 Current frames:');
    frames.rows.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name} (${f.category}) - order: ${f.display_order}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addDisplayOrderColumn();
