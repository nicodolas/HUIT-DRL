const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL_OWNER || process.env.DATABASE_URL);

async function cleanupDb() {
  console.log('--- STARTING NEON DB CLEANUP ---');

  // 1. Find pon0212 and nicodolas
  const keepUsers = await sql`
    SELECT id, username, full_name, role 
    FROM users 
    WHERE username IN ('pon0212', 'nicodolas');
  `;
  console.log('Users to keep:', keepUsers);

  if (keepUsers.length !== 2) {
    throw new Error(`Expected exactly 2 users ('pon0212' and 'nicodolas'), but found ${keepUsers.length}`);
  }

  const nicoUser = keepUsers.find(u => u.username === 'nicodolas');
  const ponUser = keepUsers.find(u => u.username === 'pon0212');

  // 2. Transfer official system semesters to nicodolas (admin) so they are not cascade-deleted
  const updatedSysSems = await sql`
    UPDATE semesters 
    SET user_id = ${nicoUser.id} 
    WHERE is_system = true 
    RETURNING id, name, is_system, user_id;
  `;
  console.log('Transferred system semesters to admin nicodolas:', updatedSysSems);

  // 3. Delete all users other than pon0212 and nicodolas
  const deletedUsers = await sql`
    DELETE FROM users 
    WHERE username NOT IN ('pon0212', 'nicodolas')
    RETURNING id, username;
  `;
  console.log(`Deleted ${deletedUsers.length} other users from Neon DB.`);

  // 4. Verify remaining data in tables
  const remainingUsers = await sql`SELECT id, username, full_name, role FROM users ORDER BY username;`;
  console.log('REMAINING USERS in Neon DB:');
  console.table(remainingUsers);

  const remainingSemesters = await sql`
    SELECT s.id, s.name, s.user_id, s.is_system, u.username 
    FROM semesters s 
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY u.username, s.name;
  `;
  console.log('REMAINING SEMESTERS:');
  console.table(remainingSemesters);

  const remainingRecords = await sql`
    SELECT r.id, r.user_id, u.username, r.title, r.points 
    FROM drl_records r
    LEFT JOIN users u ON r.user_id = u.id;
  `;
  console.log('REMAINING DRL RECORDS:');
  console.table(remainingRecords);

  const presetsCount = (await sql`SELECT count(*)::int as c FROM drl_criteria_presets;`)[0].c;
  console.log(`CRITERIA PRESETS COUNT (untouched): ${presetsCount}`);

  console.log('--- CLEANUP COMPLETED SUCCESSFULLY ---');
}

cleanupDb().catch(console.error);

