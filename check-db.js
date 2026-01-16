const { Pool } = require('pg');

const pool = new Pool({
  host: 'noverthinker-dev-postgres.cba20kgagy1l.eu-central-1.rds.amazonaws.com',
  port: 5432,
  database: 'noverthinker',
  user: 'noverthinker_admin',
  password: 'NoverThinker2026SecureDB',
  ssl: { rejectUnauthorized: false }
});

async function checkDatabase() {
  try {
    // Contar tablas
    const tablesResult = await pool.query(
      "SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log('Total tablas:', tablesResult.rows[0].total);

    // Listar tablas si existen
    const listResult = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    
    if (listResult.rows.length > 0) {
      console.log('\nTablas encontradas:');
      listResult.rows.forEach(row => console.log('  -', row.table_name));
    }

    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
  }
}

checkDatabase();