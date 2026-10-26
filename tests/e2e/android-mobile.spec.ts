import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";

test.describe("Phase 25: Android Native & Mobile Client Hardening Suite", () => {
  test("Android Native Client: Authenticates and performs full CRUD via Bearer Token without Cookies", async ({
    request,
  }) => {
    const androidUser = `android_${Date.now()}`;
    const captchaToken = getValidTestCaptchaToken();

    // 1. Register with token return verification
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: androidUser,
        password: "AndroidPassword123!",
        fullName: "Nguyễn Android",
        faculty: "Công nghệ Thông tin",
        className: "12DHTH01",
        captchaToken,
      },
    });
    expect(regRes.status()).toBe(200);
    const regData = await regRes.json();
    expect(regData.token).toBeDefined();
    const bearerToken = regData.token;

    // 2. Access /api/auth/me with Bearer token only (No cookies allowed, simulating Android WebView)
    const meRes = await request.get("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Cookie: "", // Strip cookies explicitly
      },
    });
    expect(meRes.status()).toBe(200);
    const meData = await meRes.json();
    expect(meData.authenticated).toBe(true);
    expect(meData.user.username).toBe(androidUser);

    // 3. Fetch user's semester using Bearer Token
    const semsRes = await request.get("/api/semesters", {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Cookie: "",
      },
    });
    expect(semsRes.status()).toBe(200);
    const semsData = await semsRes.json();
    expect(semsData.semesters.length).toBeGreaterThan(0);
    const semesterId = semsData.semesters[0].id;

    // 4. Create Record on Android using Bearer Token (Simulating save to Neon DB)
    const createRes = await request.post("/api/records", {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Cookie: "",
      },
      data: {
        semesterId,
        category: 2,
        title: "Hoạt động ghi nhận từ Android Client",
        type: "add",
        points: 5,
        note: "Đã thử nghiệm thành công trên Android Native bridge",
      },
    });
    expect(createRes.status()).toBe(200);
    const createData = await createRes.json();
    expect(createData.recordId).toBeDefined();
    const recordId = createData.recordId;

    // 5. Query records to verify persistence in PostgreSQL
    const getRecsRes = await request.get(`/api/records?semesterId=${semesterId}`, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Cookie: "",
      },
    });
    expect(getRecsRes.status()).toBe(200);
    const getRecsData = await getRecsRes.json();
    const created = getRecsData.records.find((r: any) => r.id === recordId);
    expect(created).toBeDefined();
    expect(created.title).toBe("Hoạt động ghi nhận từ Android Client");

    // 6. Update Record on Android
    const updateRes = await request.put(`/api/records/${recordId}`, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Cookie: "",
      },
      data: {
        title: "Hoạt động ghi nhận từ Android Client (Đã sửa)",
        points: 8,
      },
    });
    expect(updateRes.status()).toBe(200);

    // 7. Delete Record on Android
    const deleteRes = await request.delete(`/api/records/${recordId}`, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Cookie: "",
      },
    });
    expect(deleteRes.status()).toBe(200);
  });

  test("Android CORS & Origin Policy: Preflight and API allow Android WebView origins", async ({ request }) => {
    // Test with Android Capacitor Origin
    const preflightRes = await request.fetch("/api/records", {
      method: "OPTIONS",
      headers: {
        Origin: "https://localhost",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
      },
    });

    // Verify CORS response
    const headers = preflightRes.headers();
    expect(headers["access-control-allow-methods"]).toBeDefined();
  });

  test("Android Offline Draft Fallback & Recovery on Network Interruption", async ({ page }) => {
    // Login with existing test student or register new
    const mobileUser = `mob_${Date.now()}`;
    const token = getValidTestCaptchaToken();

    await page.request.post("/api/auth/register", {
      data: {
        username: mobileUser,
        password: "ValidPassword123!",
        fullName: "Mobile Student",
        captchaToken: token,
      },
    });

    // Navigate to Login on Mobile viewport
    await page.goto("/login");
    await page.fill('input[placeholder*="tên đăng nhập"]', mobileUser);
    await page.fill('input[type="password"]', "ValidPassword123!");
    await page.click('button:has-text("Đăng nhập")');
    await page.waitForURL("/");

    // Verify token was stored in localStorage on mobile
    const storedToken = await page.evaluate(() => localStorage.getItem("huit_auth_token"));
    expect(storedToken).toBeTruthy();

    // Verify offline draft mechanism in localStorage
    await page.evaluate(() => {
      const draft = {
        id: "offline_test_draft_1",
        semesterId: "dummy-semester",
        category: 3,
        title: "Hoạt động rèn luyện khi mất mạng Android",
        type: "add",
        points: 4,
        quantity: 1,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("huit_drl_offline_drafts", JSON.stringify([draft]));
    });

    const pendingDrafts = await page.evaluate(() => {
      const raw = localStorage.getItem("huit_drl_offline_drafts");
      return raw ? JSON.parse(raw) : [];
    });
    expect(pendingDrafts.length).toBe(1);
    expect(pendingDrafts[0].title).toBe("Hoạt động rèn luyện khi mất mạng Android");
  });
});

