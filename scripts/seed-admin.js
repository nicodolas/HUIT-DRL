const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const sql = neon(process.env.DATABASE_URL_OWNER);

async function seedAdmin() {
  const existing = await sql`SELECT id, username, role FROM users WHERE username = 'admin' LIMIT 1;`;
  const hash = await bcrypt.hash('AdminHuit2026@', 10);
  if (existing.length > 0) {
    console.log('Admin user already exists:', existing[0]);
    // Ensure role is admin and password is AdminHuit2026@
    await sql`UPDATE users SET role = 'admin', password_hash = ${hash} WHERE username = 'admin';`;
    console.log('Role verified as admin and password reset to AdminHuit2026@.');
  } else {
    const adminId = randomUUID();
    const hash = await bcrypt.hash('AdminHuit2026@', 10);
    await sql`
      INSERT INTO users (id, username, password_hash, full_name, faculty, class_name, role)
      VALUES (${adminId}, 'admin', ${hash}, 'Ban Quản Trị HUIT / CVHT', 'Phòng Công tác Sinh viên', 'ADMIN-HUIT', 'admin');
    `;
    console.log('Created admin account: username "admin", password "AdminHuit2026@"');
  }

  // Also check semesters created by admin or system semesters
  const adminUser = (await sql`SELECT id FROM users WHERE username = 'admin' LIMIT 1;`)[0];
  const sysSemesters = await sql`SELECT id, name, is_system FROM semesters WHERE is_system = true OR user_id = ${adminUser.id};`;
  console.log('Official system semesters:', sysSemesters);

  if (sysSemesters.length === 0) {
    const sem1Id = randomUUID();
    await sql`
      INSERT INTO semesters (id, user_id, name, is_current, target_score, discipline_level, submission_deadline, status, is_system)
      VALUES (${sem1Id}, ${adminUser.id}, 'Học kỳ 1 (2025 - 2026)', true, 90, 'none', '2025-11-30', 'active', true);
    `;
    const sem2Id = randomUUID();
    await sql`
      INSERT INTO semesters (id, user_id, name, is_current, target_score, discipline_level, submission_deadline, status, is_system)
      VALUES (${sem2Id}, ${adminUser.id}, 'Học kỳ 2 (2025 - 2026)', false, 90, 'none', '2026-05-30', 'active', true);
    `;
    console.log('Seeded official system semesters.');
  }
}

seedAdmin().catch(console.error);
