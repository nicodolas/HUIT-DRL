import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";

test.describe("Security & OWASP Hardening Suite", () => {
  test("Reject malicious javascript: evidence URLs in records", async ({ request }) => {
    // Attempt to register temporary user
    const testUser = `sec_${Date.now()}`;
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: testUser,
        password: "ValidPassword123!",
        fullName: "Security Tester",
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(regRes.status()).toBe(200);

    const loginRes = await request.post("/api/auth/login", {
      data: {
        username: testUser,
        password: "ValidPassword123!",
      },
    });
    expect(loginRes.status()).toBe(200);

    // Get active semester
    const semsRes = await request.get("/api/semesters");
    const semsData = await semsRes.json();
    expect(semsData.semesters.length).toBeGreaterThan(0);
    const semesterId = semsData.semesters[0].id;

    // 1. Try injecting javascript: URI
    const xssRes = await request.post("/api/records", {
      data: {
        semesterId,
        category: 3,
        title: "XSS Attempt Record",
        type: "add",
        points: 5,
        evidenceUrl: "javascript:alert(document.cookie)",
      },
    });
    expect(xssRes.status()).toBe(400);
    const xssData = await xssRes.json();
    expect(xssData.error).toContain("không an toàn");

    // 2. Try injecting data: URI
    const dataUriRes = await request.post("/api/records", {
      data: {
        semesterId,
        category: 3,
        title: "Data URI Attempt",
        type: "add",
        points: 5,
        evidenceUrl: "data:text/html,<script>alert(1)</script>",
      },
    });
    expect(dataUriRes.status()).toBe(400);

    // 3. Valid HTTPS Google Drive URL should succeed
    const validRes = await request.post("/api/records", {
      data: {
        semesterId,
        category: 3,
        title: "Valid Evidence Activity",
        type: "add",
        points: 5,
        evidenceUrl: "https://drive.google.com/file/d/test12345/view",
      },
    });
    expect(validRes.status()).toBe(200);
  });

  test("Rate limiting blocks excessive brute force login attempts", async ({ request }) => {
    const attackerUser = `victim_${Date.now()}`;
    let blocked = false;

    for (let i = 0; i < 12; i++) {
      const res = await request.post("/api/auth/login", {
        data: {
          username: attackerUser,
          password: `wrong_pass_${i}`,
        },
      });

      if (res.status() === 429) {
        blocked = true;
        const data = await res.json();
        expect(data.error).toContain("quá nhiều lần");
        break;
      }
    }

    expect(blocked).toBe(true);
  });

  test("HTTP Security Headers & Fingerprint Removal (Anti-Reverse Engineering)", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();

    // Verification: Anti-fingerprinting - X-Powered-By header is removed
    expect(headers["x-powered-by"]).toBeUndefined();

    // Standard OWASP headers
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["strict-transport-security"]).toContain("max-age=");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
  });

  test("Data Minimization: Responses never leak password hashes or internal DB errors", async ({ request }) => {
    const testUser = `min_${Date.now()}`;
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: testUser,
        password: "ValidPassword123!",
        fullName: "Minimization Tester",
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(regRes.status()).toBe(200);
    const regData = await regRes.json();

    // Verify passwordHash is never returned to client
    expect(regData.user.passwordHash).toBeUndefined();
    expect(regData.user.role).toBe("user");

    // Login and check /api/auth/me
    await request.post("/api/auth/login", {
      data: {
        username: testUser,
        password: "ValidPassword123!",
      },
    });

    const meRes = await request.get("/api/auth/me");
    expect(meRes.status()).toBe(200);
    const meData = await meRes.json();
    expect(meData.user.passwordHash).toBeUndefined();
    expect(meData.user.username).toBe(testUser);

    // Health endpoint check: never leaks stack traces, tech engine specifics, or db connection strings
    const healthRes = await request.get("/api/health");
    const healthData = await healthRes.json();
    expect(healthData.database?.error).toBeUndefined();
    expect(healthData.database?.engine).toBeUndefined();
    expect(healthData.version).toBeUndefined();
  });

  test("Anti-IDOR: Users cannot view, modify, or delete other users' records", async ({ browser }) => {
    // Create Context for User A
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const userA = `user_a_${Date.now()}`;

    await pageA.request.post("/api/auth/register", {
      data: { username: userA, password: "Password123!", fullName: "Student A", captchaToken: getValidTestCaptchaToken() },
    });
    await pageA.request.post("/api/auth/login", {
      data: { username: userA, password: "Password123!" },
    });

    // User A fetches their semester and creates a record
    const semsResA = await pageA.request.get("/api/semesters");
    const semsDataA = await semsResA.json();
    const semIdA = semsDataA.semesters[0].id;

    const createRecRes = await pageA.request.post("/api/records", {
      data: {
        semesterId: semIdA,
        category: 1,
        title: "User A Confidential Activity",
        type: "add",
        points: 10,
      },
    });
    expect(createRecRes.status()).toBe(200);
    const { recordId: recordIdA } = await createRecRes.json();

    // Create Context for User B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const userB = `user_b_${Date.now()}`;

    await pageB.request.post("/api/auth/register", {
      data: { username: userB, password: "Password123!", fullName: "Student B", captchaToken: getValidTestCaptchaToken() },
    });
    await pageB.request.post("/api/auth/login", {
      data: { username: userB, password: "Password123!" },
    });

    // 1. User B tries to view User A's records via GET /api/records?semesterId=...
    const idorGetRes = await pageB.request.get(`/api/records?semesterId=${semIdA}`);
    expect(idorGetRes.status()).toBe(404);

    // 2. User B tries to modify User A's record via PUT /api/records/[id]
    const idorPutRes = await pageB.request.put(`/api/records/${recordIdA}`, {
      data: { title: "Hacked by User B", points: 50 },
    });
    expect(idorPutRes.status()).toBe(404);

    // 3. User B tries to delete User A's record via DELETE /api/records/[id]
    const idorDelRes = await pageB.request.delete(`/api/records/${recordIdA}`);
    expect(idorDelRes.status()).toBe(404);

    // Verify User A's record is intact
    const verifyRes = await pageA.request.get(`/api/records?semesterId=${semIdA}`);
    const verifyData = await verifyRes.json();
    const existingRec = verifyData.records.find((r: any) => r.id === recordIdA);
    expect(existingRec).toBeDefined();
    expect(existingRec.title).toBe("User A Confidential Activity");

    await contextA.close();
    await contextB.close();
  });

  test("SQL Injection Prevention: Parameterized queries and strict ID validation defend against injection attacks", async ({ request }) => {
    // 1. Attempt SQL injection in registration username
    const sqlInjectionUsernames = [
      "' OR '1'='1' --",
      "admin'--",
      "'; DROP TABLE users; --",
      "user' UNION SELECT 1, 'admin', 'hash' --",
    ];

    for (const badUser of sqlInjectionUsernames) {
      const regRes = await request.post("/api/auth/register", {
        data: {
          username: badUser,
          password: "ValidPassword123!",
          fullName: "Hacker Attempt",
          captchaToken: getValidTestCaptchaToken(),
        },
      });
      // Should reject invalid characters before hitting SQL
      expect(regRes.status()).toBe(400);
      const data = await regRes.json();
      expect(data.error).toContain("chỉ bao gồm chữ cái");
    }

    // 2. Attempt SQL injection in login
    const loginRes = await request.post("/api/auth/login", {
      data: {
        username: "admin' OR '1'='1",
        password: "any",
      },
    });
    // Parameterized lookup safely finds 0 matching rows
    expect(loginRes.status()).toBe(401);

    // 3. Register a legitimate user to test record payload and ID boundaries
    const safeUser = `sqlsec_${Date.now()}`;
    await request.post("/api/auth/register", {
      data: { username: safeUser, password: "ValidPassword123!", fullName: "Safe Tester", captchaToken: getValidTestCaptchaToken() },
    });
    await request.post("/api/auth/login", {
      data: { username: safeUser, password: "ValidPassword123!" },
    });

    const semsRes = await request.get("/api/semesters");
    const semsData = await semsRes.json();
    const semId = semsData.semesters[0].id;

    // 4. Test SQL Injection string in Record content: Should be parameterized and treated strictly as literal string
    const maliciousTitle = "Normal Activity'); DROP TABLE drl_records; --";
    const maliciousNote = "' UNION SELECT * FROM users; --";

    const addRecRes = await request.post("/api/records", {
      data: {
        semesterId: semId,
        category: 2,
        title: maliciousTitle,
        type: "add",
        points: 5,
        note: maliciousNote,
      },
    });
    expect(addRecRes.status()).toBe(200);
    const { recordId } = await addRecRes.json();

    // Verify record exists as literal string and table was NOT dropped
    const fetchRecRes = await request.get(`/api/records?semesterId=${semId}`);
    expect(fetchRecRes.status()).toBe(200);
    const fetchRecData = await fetchRecRes.json();
    const savedRec = fetchRecData.records.find((r: any) => r.id === recordId);
    expect(savedRec).toBeDefined();
    expect(savedRec.title).toBe(maliciousTitle);
    expect(savedRec.note).toBe(maliciousNote);

    // 5. Test SQL Injection in semesterId parameter: Should be rejected by boundary validator
    const badSemIdRes = await request.get(`/api/records?semesterId=${encodeURIComponent("1' OR '1'='1")}`);
    expect(badSemIdRes.status()).toBe(400);

    // 6. Test SQL Injection in record ID param: Should be rejected by boundary validator
    const badRecPutRes = await request.put(`/api/records/${encodeURIComponent("1'; DROP TABLE drl_records; --")}`, {
      data: { title: "Attempt Update" },
    });
    expect(badRecPutRes.status()).toBe(400);

    const badRecDelRes = await request.delete(`/api/records/${encodeURIComponent("1' OR '1'='1")}`);
    expect(badRecDelRes.status()).toBe(400);
  });

  test("Invisible CAPTCHA 3-layer defense blocks bots, honeypot traps, and speed-spamming", async ({ request, page }) => {
    // a) Bot điền honeypot field => bị chặn 400
    const botUser1 = `bot_trap_${Date.now()}`;
    const honeypotRes = await request.post("/api/auth/register", {
      data: {
        username: botUser1,
        password: "ValidPassword123!",
        fullName: "Spam Bot",
        honeypot: "http://spam-link.com",
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(honeypotRes.status()).toBe(400);
    const honeypotData = await honeypotRes.json();
    expect(honeypotData.error).toContain("Phát hiện hành vi tự động.");

    // b) Bot gửi không có captchaToken hoặc token giả mạo => bị chặn 400
    const botUser2 = `bot_notoken_${Date.now()}`;
    const noTokenRes = await request.post("/api/auth/register", {
      data: {
        username: botUser2,
        password: "ValidPassword123!",
        fullName: "No Token Bot",
      },
    });
    expect(noTokenRes.status()).toBe(400);
    const noTokenData = await noTokenRes.json();
    expect(noTokenData.error).toBeDefined();

    const forgedRes = await request.post("/api/auth/register", {
      data: {
        username: `bot_forged_${Date.now()}`,
        password: "ValidPassword123!",
        fullName: "Forged Token Bot",
        captchaToken: "1729000000000.randomnonce.fake_hmac_signature",
      },
    });
    expect(forgedRes.status()).toBe(400);
    const forgedData = await forgedRes.json();
    expect(forgedData.error).toContain("không hợp lệ");

    // c) Bot gửi quá nhanh (< 1.5s) => bị chặn 400
    const captchaRes = await request.get("/api/auth/captcha");
    expect(captchaRes.status()).toBe(200);
    expect(captchaRes.headers()["cache-control"]).toContain("no-store");
    const { token: freshToken } = await captchaRes.json();
    expect(freshToken).toBeDefined();

    // Submit ngay lập tức với token vừa sinh (< 1.5s)
    const tooFastRes = await request.post("/api/auth/register", {
      data: {
        username: `bot_fast_${Date.now()}`,
        password: "ValidPassword123!",
        fullName: "Fast Bot",
        captchaToken: freshToken,
      },
    });
    expect(tooFastRes.status()).toBe(400);
    const tooFastData = await tooFastRes.json();
    expect(tooFastData.error).toContain("Thao tác quá nhanh, vui lòng thao tác bình thường.");

    // d) Người dùng hợp lệ sau độ trễ >= 1.5s qua form và API có captchaToken hợp lệ
    // Test 1: Qua API với pre-aged token >= 1.5s
    const validApiUser = `valid_api_${Date.now()}`;
    const validApiRes = await request.post("/api/auth/register", {
      data: {
        username: validApiUser,
        password: "ValidPassword123!",
        fullName: "Legit Human API",
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(validApiRes.status()).toBe(200);
    const validApiData = await validApiRes.json();
    expect(validApiData.user.username).toBe(validApiUser);

    // Test 2: Qua UI Form với honeypot input ẩn và đợi thời gian tự nhiên >= 1.5s
    const formUser = `human_form_${Date.now()}`;
    await page.goto("/register");

    // Xác nhận honeypot input hiện diện trong DOM nhưng ẩn với người dùng
    const honeypotInput = page.locator('input[name="honeypot"]');
    await expect(honeypotInput).toBeAttached();
    await expect(honeypotInput).toHaveClass(/opacity-0/);

    await page.locator('input[placeholder*="nguyenvana"]').fill(formUser);
    await expect(page.getByText(/khả dụng/i)).toBeVisible({ timeout: 5000 });
    await page.locator('input[placeholder*="Nguyễn Văn"]').fill("Nguyễn Người Dùng Thật");
    await page.locator('input[placeholder*="Tối thiểu 6 ký tự"]').fill("ValidPass123!");
    await page.locator('input[placeholder*="Nhập lại mật khẩu"]').fill("ValidPass123!");

    // Chờ đảm bảo >= 1.5s kể từ khi captcha token được tạo lúc mount form
    await page.waitForTimeout(1600);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });
  });
});
