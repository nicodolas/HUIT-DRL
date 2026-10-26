const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL_OWNER);

async function migrate() {
  console.log('Running migration on Neon database...');
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role varchar(32) DEFAULT 'user' NOT NULL;`;
  console.log('Added role column to users table.');

  await sql`ALTER TABLE semesters ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false NOT NULL;`;
  console.log('Added is_system column to semesters table.');

  // Set any existing user with username 'admin' to role 'admin'
  await sql`UPDATE users SET role = 'admin' WHERE username = 'admin' OR username = 'admin_huit';`;
  console.log('Updated admin accounts if existing.');

  // Verify
  const userCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';`;
  console.log('Updated users columns:', userCols.map(c => c.column_name));
}

migrate().catch(console.error);
