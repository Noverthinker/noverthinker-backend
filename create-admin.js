require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
  try {
    const email = 'admin@noverthinker.com';
    const password = 'Admin123!';
    
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, user_type, first_name, last_name)
       VALUES ($1, $2, 'admin', 'Admin', 'NoverThinker')
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, user_type`,
      [email, passwordHash]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Admin created successfully!');
      console.log('   Email:', email);
      console.log('   Password:', password);
    } else {
      console.log('⚠️  Admin already exists');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();