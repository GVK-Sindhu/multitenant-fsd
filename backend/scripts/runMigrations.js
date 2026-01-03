const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const runMigrations = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting database migrations...');
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const migrationSQL = fs.readFileSync(
        path.join(migrationsDir, file),
        'utf8'
      );
      
      await client.query(migrationSQL);
      console.log(`✓ Completed: ${file}`);
    }
    
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    client.release();
  }
};

// Wait for database to be ready
const waitForDatabase = async () => {
  const maxRetries = 30;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await pool.query('SELECT NOW()');
      console.log('Database connection established');
      return true;
    } catch (error) {
      retries++;
      console.log(`Waiting for database... (${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Database connection timeout');
};

waitForDatabase()
  .then(() => runMigrations())
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

