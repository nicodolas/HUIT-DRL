const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const { SignJWT, jwtVerify } = require('jose');
require('dotenv').config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL_OWNER || process.env.DATABASE_URL;
const sql = neon(dbUrl);
const secretKey = new TextEncoder().encode(
  process.env.AUTH_SECRET || "default_huit_drl_secret_key_32_bytes_long!!"
);

async function runTests() {
  console.log("=== STARTING AUTH & DRL INTEGRATION TESTS ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message}`);
      failed++;
    }
  }

  const testUsername = `user_${Date.now()}`;
  const testPassword = "securePassword123!";
  const testFullName = "Sinh Viên Thử Nghiệm";

  try {
    // 1. Test database schema columns
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users';`;
    const colNames = cols.map(c => c.column_name);
    assert(colNames.includes('username'), "Column 'username' exists in users table");
    assert(!colNames.includes('email'), "Column 'email' is removed from users table");
    assert(!colNames.includes('mssv'), "Column 'mssv' is removed from users table");

    // 2. Test registration simulation
    const userId = `uid_${Date.now()}`;
    const passwordHash = await bcrypt.hash(testPassword, 10);

    // Insert user
    await sql`
      INSERT INTO users (id, username, password_hash, full_name, faculty, class_name)
      VALUES (${userId}, ${testUsername}, ${passwordHash}, ${testFullName}, 'Công nghệ Thông tin', '12DHTH01');
    `;
    assert(true, "Successfully inserted new user with username only");

    // 3. Test uniqueness constraint
    let caughtDuplicate = false;
    try {
      await sql`
        INSERT INTO users (id, username, password_hash, full_name)
        VALUES (${userId + '_dup'}, ${testUsername}, ${passwordHash}, 'Duplicate User');
      `;
    } catch (err) {
      caughtDuplicate = true;
    }
    assert(caughtDuplicate, "Uniqueness constraint prevents registering existing username");

    // 4. Test password verification
    const [fetchedUser] = await sql`SELECT * FROM users WHERE username = ${testUsername};`;
    assert(fetchedUser !== undefined, "Fetched registered user by username");
    assert(fetchedUser.username === testUsername, "Username matches registered value");
    assert(fetchedUser.full_name === testFullName, "Full name matches");

    const isPasswordValid = await bcrypt.compare(testPassword, fetchedUser.password_hash);
    assert(isPasswordValid, "Password bcrypt verification succeeds");

    const isWrongPasswordValid = await bcrypt.compare("wrongPass", fetchedUser.password_hash);
    assert(!isWrongPasswordValid, "Wrong password rejected");

    // 5. Test JWT session token creation & verification
    const token = await new SignJWT({
      id: fetchedUser.id,
      username: fetchedUser.username,
      fullName: fetchedUser.full_name,
      faculty: fetchedUser.faculty,
      className: fetchedUser.class_name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secretKey);

    assert(typeof token === "string" && token.length > 20, "JWT token created successfully");

    const { payload } = await jwtVerify(token, secretKey);
    assert(payload.username === testUsername, "JWT payload has username");
    assert(payload.id === userId, "JWT payload has id");
    assert(!payload.email, "JWT payload has no email");
    assert(!payload.mssv, "JWT payload has no mssv");

    // 6. Test Semester & DRL record workflow
    const semesterId = `sem_${Date.now()}`;
    await sql`
      INSERT INTO semesters (id, user_id, name, is_current, target_score, discipline_level)
      VALUES (${semesterId}, ${userId}, 'Học kỳ 1 (2025 - 2026)', true, 90, 'none');
    `;
    assert(true, "Created semester for user");

    // Add a record
    const recordId = `rec_${Date.now()}`;
    await sql`
      INSERT INTO drl_records (id, user_id, semester_id, category, title, type, points, quantity)
      VALUES (${recordId}, ${userId}, ${semesterId}, 3, 'Tham gia Hội thao sinh viên', 'add', 4, 1);
    `;
    assert(true, "Added DRL activity record for user");

    // Query records for user
    const userRecords = await sql`SELECT * FROM drl_records WHERE user_id = ${userId};`;
    assert(userRecords.length === 1, "User has exactly 1 activity record");
    assert(parseFloat(userRecords[0].points) === 4, "Points recorded correctly");

    // 7. Cleanup test data (Cascade delete on users removes semester and records)
    await sql`DELETE FROM users WHERE id = ${userId};`;
    const remainingSemesters = await sql`SELECT * FROM semesters WHERE id = ${semesterId};`;
    const remainingRecords = await sql`SELECT * FROM drl_records WHERE id = ${recordId};`;
    assert(remainingSemesters.length === 0, "Semesters cascade deleted on user cleanup");
    assert(remainingRecords.length === 0, "Records cascade deleted on user cleanup");

    console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  }
}

runTests();
