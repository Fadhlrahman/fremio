// Quick script to create admin user
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'salwa',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'fremio',
    password: process.env.DB_PASSWORD || 'fremio2024',
    port: process.env.DB_PORT || 5432,
});

async function createAdminUser() {
    console.log('🔐 Creating admin user...');
    
    const email = 'admin@fremio.com';
    const password = 'admin123';
    const displayName = 'Fremio Admin';
    const role = 'admin';
    
    // Hash password using bcrypt with salt rounds 12 (same as seed.sql)
    const passwordHash = await bcrypt.hash(password, 12);
    
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🔒 Hash:', passwordHash);
    console.log('');
    
    try {
        // First check if admin exists
        const checkQuery = 'SELECT id, email, role FROM users WHERE email = $1';
        const checkResult = await pool.query(checkQuery, [email]);
        
        if (checkResult.rows.length > 0) {
            console.log('✅ Admin user already exists:', checkResult.rows[0]);
            console.log('');
            console.log('🔄 Updating password...');
            
            // Update password
            const updateQuery = `
                UPDATE users 
                SET password_hash = $1, updated_at = NOW()
                WHERE email = $2
                RETURNING id, email, display_name, role
            `;
            const updateResult = await pool.query(updateQuery, [passwordHash, email]);
            console.log('✅ Password updated:', updateResult.rows[0]);
        } else {
            console.log('➕ Creating new admin user...');
            
            // Insert new admin
            const insertQuery = `
                INSERT INTO users (email, password_hash, display_name, role)
                VALUES ($1, $2, $3, $4)
                RETURNING id, email, display_name, role
            `;
            const insertResult = await pool.query(insertQuery, [email, passwordHash, displayName, role]);
            console.log('✅ Admin user created:', insertResult.rows[0]);
        }
        
        console.log('');
        console.log('✅ Done! You can now login with:');
        console.log('   Email:', email);
        console.log('   Password:', password);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('');
            console.log('⚠️  PostgreSQL is not running!');
            console.log('');
            console.log('Options:');
            console.log('1. Start PostgreSQL service');
            console.log('2. Use pgAdmin to run: database/quick-create-admin.sql');
            console.log('3. Or manually insert into users table');
        }
    } finally {
        await pool.end();
    }
}

createAdminUser();
