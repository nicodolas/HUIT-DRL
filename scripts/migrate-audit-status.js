const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL_OWNER);

async function migrate() {
  console.log('Running audit status migration on Neon database...');
  await sql`ALTER TABLE drl_records ADD COLUMN IF NOT EXISTS audit_status varchar(32) DEFAULT 'pending_review' NOT NULL;`;
  console.log('Added audit_status column to drl_records table.');

  await sql`ALTER TABLE drl_records ADD COLUMN IF NOT EXISTS audit_comment text;`;
  console.log('Added audit_comment column to drl_records table.');

  // Update existing records where evidence_url is NULL or empty to 'missing'
  await sql`UPDATE drl_records SET audit_status = 'missing' WHERE evidence_url IS NULL OR TRIM(evidence_url) = '';`;
  console.log('Updated records without evidence to status "missing".');

  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'drl_records';`;
  console.log('Updated drl_records columns:', cols.map(c => c.column_name));
}

migrate().catch(console.error);
