const baseUrl = 'http://localhost:3088';

async function runE2ETests() {
  console.log('=== STARTING EXTENSIVE HTTP API E2E TESTS ON PORT 3088 ===');
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

  // Unique test credentials
  const username = `testuser_${Date.now()}`;
  const password = 'mySecretPassword999!';
  const newPassword = 'myNewPassword888!';
  const fullName = 'Sinh Viên E2E Test';

  const user2Name = `otheruser_${Date.now()}`;

  try {
    // ==========================================
    // 1. TEST GET /api/auth/check-username
    // ==========================================
    const resCheckEmpty = await fetch(`${baseUrl}/api/auth/check-username`);
    assert(resCheckEmpty.status === 400, "check-username without param returns 400");

    const resCheckShort = await fetch(`${baseUrl}/api/auth/check-username?username=ab`);
    const dataCheckShort = await resCheckShort.json();
    assert(dataCheckShort.available === false && dataCheckShort.message.includes("3 ký tự"), "check-username for short name returns available=false");

    const resCheckSpecial = await fetch(`${baseUrl}/api/auth/check-username?username=bad%20user!`);
    const dataCheckSpecial = await resCheckSpecial.json();
    assert(dataCheckSpecial.available === false, "check-username with invalid characters returns available=false");

    const resCheckAvail = await fetch(`${baseUrl}/api/auth/check-username?username=${username}`);
    const dataCheckAvail = await resCheckAvail.json();
    assert(dataCheckAvail.available === true, "check-username for fresh username returns available=true");

    // ==========================================
    // 2. TEST REGISTRATION & SESSION
    // ==========================================
    const resReg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        fullName,
        faculty: 'Công nghệ Thông tin',
        className: '12DHTH01',
      }),
    });
    const dataReg = await resReg.json();
    assert(resReg.status === 200, "Register with username returns 200");
    assert(dataReg.user.username === username, "User response has username");
    assert(!dataReg.user.email, "User response has NO email field");
    assert(!dataReg.user.mssv, "User response has NO mssv field");
    assert(dataReg.semesterId !== undefined, "Initial semester auto-created for user");

    // Verify username is now taken in check-username
    const resCheckTaken = await fetch(`${baseUrl}/api/auth/check-username?username=${username}`);
    const dataCheckTaken = await resCheckTaken.json();
    assert(dataCheckTaken.available === false, "check-username after registration reports available=false");

    // Duplicate registration returns 409
    const resDup = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, fullName }),
    });
    assert(resDup.status === 409, "Duplicate registration returns 409 Conflict");

    // Session cookie extraction
    const sessionCookie = resReg.headers.get('set-cookie');
    const cookieClean = sessionCookie.split(';')[0];

    // ==========================================
    // 3. TEST LOGIN & ME
    // ==========================================
    const resLoginWrong = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'wrongPassword' }),
    });
    assert(resLoginWrong.status === 401, "Login with wrong password rejected with 401");

    const resLoginOk = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    assert(resLoginOk.status === 200, "Login with username + password succeeds with 200");

    const resMe = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieClean },
    });
    const dataMe = await resMe.json();
    assert(resMe.status === 200 && dataMe.user.username === username, "GET /api/auth/me returns authenticated username");

    // ==========================================
    // 4. TEST PROFILE & PASSWORD CHANGE
    // ==========================================
    const resPassWrong = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieClean },
      body: JSON.stringify({
        currentPassword: 'invalidCurrentPassword',
        newPassword,
      }),
    });
    assert(resPassWrong.status === 400, "Password change with incorrect current password rejected (400)");

    const resPassOk = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieClean },
      body: JSON.stringify({
        fullName: 'Nguyễn Văn Cập Nhật',
        currentPassword: password,
        newPassword,
      }),
    });
    assert(resPassOk.status === 200, "Password change with correct current password succeeds (200)");

    // Test login with old password fails, new password succeeds
    const resOldPassLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    assert(resOldPassLogin.status === 401, "Login with old password now rejected (401)");

    const resNewPassLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: newPassword }),
    });
    assert(resNewPassLogin.status === 200, "Login with updated new password succeeds (200)");
    const newSessionCookie = resNewPassLogin.headers.get('set-cookie').split(';')[0];

    // ==========================================
    // 5. TEST SEMESTER CREATION & IDOR PREVENTION
    // ==========================================
    // Register user2
    const resUser2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user2Name, password: 'password123!', fullName: 'User 2' }),
    });
    const dataUser2 = await resUser2.json();
    const user2SemesterId = dataUser2.semesterId;

    // User 1 attempts to modify User 2's semester via PUT /api/semesters (IDOR test)
    const resIdor = await fetch(`${baseUrl}/api/semesters`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: newSessionCookie },
      body: JSON.stringify({ id: user2SemesterId, targetScore: 50 }),
    });
    assert(resIdor.status === 404, "PUT /api/semesters prevents IDOR: modifying another user's semester returns 404");

    // User 1 creates an extra semester
    const resAddSem = await fetch(`${baseUrl}/api/semesters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: newSessionCookie },
      body: JSON.stringify({ name: 'Học kỳ 2 (2025 - 2026)', targetScore: 85 }),
    });
    const dataAddSem = await resAddSem.json();
    assert(resAddSem.status === 200 && dataAddSem.semester.name === 'Học kỳ 2 (2025 - 2026)', "POST /api/semesters creates new semester");

    // User 1 deletes the extra semester
    const resDelSem = await fetch(`${baseUrl}/api/semesters?id=${dataAddSem.semester.id}`, {
      method: 'DELETE',
      headers: { Cookie: newSessionCookie },
    });
    assert(resDelSem.status === 200, "DELETE /api/semesters deletes extra semester successfully");

    // User 1 tries to delete their sole remaining semester -> should fail (400)
    const resDelSole = await fetch(`${baseUrl}/api/semesters?id=${dataReg.semesterId}`, {
      method: 'DELETE',
      headers: { Cookie: newSessionCookie },
    });
    assert(resDelSole.status === 400, "DELETE /api/semesters prevents deleting sole remaining semester");

    // ==========================================
    // 6. TEST RECORDS & 60-POINT DEFAULT ENGINE
    // ==========================================
    const resRecords = await fetch(`${baseUrl}/api/records?semesterId=${dataReg.semesterId}`, {
      headers: { Cookie: newSessionCookie },
    });
    const dataRecords = await resRecords.json();
    assert(dataRecords.scoreSummary.totalScore === 60, "Default starting score is 60 points");
    assert(dataRecords.scoreSummary.totalDefaultPoints === 60, "Default baseline points is 60");

    // Add activity (+4đ)
    const resAddRecord = await fetch(`${baseUrl}/api/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: newSessionCookie },
      body: JSON.stringify({
        semesterId: dataReg.semesterId,
        category: 3,
        title: 'Tham gia hội thảo Công nghệ Web HUIT',
        points: 4,
        quantity: 1,
      }),
    });
    const dataAddRecord = await resAddRecord.json();
    assert(resAddRecord.status === 200, "POST /api/records adds activity");

    // Recheck score = 64
    const resRecordsAfter = await fetch(`${baseUrl}/api/records?semesterId=${dataReg.semesterId}`, {
      headers: { Cookie: newSessionCookie },
    });
    const dataRecordsAfter = await resRecordsAfter.json();
    assert(dataRecordsAfter.scoreSummary.totalScore === 64, "Total score updated to 64 (60 default + 4 earned)");

    // Clean up record
    await fetch(`${baseUrl}/api/records/${dataAddRecord.recordId}`, {
      method: 'DELETE',
      headers: { Cookie: newSessionCookie },
    });

    // ==========================================
    // 7. TEST REPORT PAGE RENDERING (HTML)
    // ==========================================
    const resReport = await fetch(`${baseUrl}/report?semesterId=${dataReg.semesterId}`, {
      headers: { Cookie: newSessionCookie },
    });
    const htmlReport = await resReport.text();
    assert(resReport.status === 200, "GET /report renders with 200 OK");
    assert(htmlReport.includes("PHIẾU") || htmlReport.includes("3385"), "Report HTML includes official evaluation sheet elements");

    // ==========================================
    // 8. DATABASE CLEANUP
    // ==========================================
    const { neon } = require('@neondatabase/serverless');
    require('dotenv').config({ path: '.env.local' });
    const sql = neon(process.env.DATABASE_URL_OWNER || process.env.DATABASE_URL);
    await sql`DELETE FROM users WHERE username IN (${username}, ${user2Name});`;
    assert(true, "Cleaned up test users from Neon database");

    console.log(`\n=== ALL E2E VERIFICATION SUITES COMPLETED: ${passed} PASSED, ${failed} FAILED ===`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("E2E Test execution failed:", err);
    process.exit(1);
  }
}

runE2ETests();
