import { test, expect } from "@playwright/test";

test.describe("Phase 12: Diagnostics API & Academic Year Consolidation (Điều 11)", () => {
  const testUsername = `diag_${Date.now()}`;
  const testPassword = "SecurePassword123!";
  const testFullName = "Sinh Viên Diagnostics HUIT";

  test("1. Diagnostics API blocks unauthenticated requests and provides full health check for authenticated users", async ({ request }) => {
    // 1. Unauthenticated request must return 401
    const unauthRes = await request.get("/api/diagnostics");
    expect(unauthRes.status()).toBe(401);

    // 2. Register user
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: testUsername,
        password: testPassword,
        fullName: testFullName,
        className: "12DHTH02",
      },
    });
    expect(regRes.status()).toBe(200);

    // 3. Login
    const loginRes = await request.post("/api/auth/login", {
      data: {
        username: testUsername,
        password: testPassword,
      },
    });
    expect(loginRes.status()).toBe(200);

    // 4. Authenticated diagnostics request
    const diagRes = await request.get("/api/diagnostics");
    expect(diagRes.status()).toBe(200);

    const diagData = await diagRes.json();
    expect(diagData.status).toBe("healthy");
    expect(diagData.latencyMs).toBeGreaterThanOrEqual(0);
    expect(diagData.stats.username).toBe(testUsername);
    expect(diagData.stats.totalSemesters).toBeGreaterThanOrEqual(1);
    expect(diagData.stats.orphanedCount).toBe(0);

    // Assert all diagnostic checks passed
    expect(diagData.checks).toBeInstanceOf(Array);
    const passChecks = diagData.checks.filter((c: any) => c.status === "pass");
    expect(passChecks.length).toBeGreaterThanOrEqual(3);
  });

  test("2. Browser UI: Open Report page and trigger Annual Consolidation Modal (Điều 11)", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.locator('input[placeholder*="tên đăng nhập"]').fill(testUsername);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // Navigate to Report page
    await page.goto("/report");
    await page.waitForURL(/.*\/report/, { timeout: 15000 });
    await expect(page.locator("text=TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP.HCM").first()).toBeVisible();

    // Click "Tổng hợp năm học (Điều 11)" button
    await page.click("text=Tổng hợp năm học (Điều 11)");

    // Assert Annual Report Modal is visible
    await expect(page.locator("text=Tổng Hợp Điểm Rèn Luyện Năm Học (Điều 11)")).toBeVisible();
    await expect(page.locator("text=Điểm Rèn Luyện Cả Năm")).toBeVisible();
    await expect(page.locator("text=Bảng đối chiếu điểm chi tiết giữa các học kỳ")).toBeVisible();
    await expect(page.locator("text=Trích Điều 11 QĐ 3385/QĐ-DCT")).toBeVisible();

    // Close modal
    await page.click("text=Đóng");
    await expect(page.locator("text=Tổng Hợp Điểm Rèn Luyện Năm Học (Điều 11)")).not.toBeVisible();
  });
});
