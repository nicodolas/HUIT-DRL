import { test, expect } from "@playwright/test";

test.describe("Phase 14: Criteria Favorites & Full Backup Engine", () => {
  const testUsername = `fav_${Date.now()}`;
  const testPassword = "FavPassword123!";
  const testFullName = "Sinh Viên Ưa Thích HUIT";

  test("1. Backup API export returns full structured JSON with user and semesters", async ({ request }) => {
    // Register
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: testUsername,
        password: testPassword,
        fullName: testFullName,
        className: "12DHTH04",
      },
    });
    expect(regRes.status()).toBe(200);

    // Login
    const loginRes = await request.post("/api/auth/login", {
      data: {
        username: testUsername,
        password: testPassword,
      },
    });
    expect(loginRes.status()).toBe(200);

    // Get backup
    const backupRes = await request.get("/api/backup");
    expect(backupRes.status()).toBe(200);

    const backupData = await backupRes.json();
    expect(backupData.version).toBe("1.0");
    expect(backupData.user.username).toBe(testUsername);
    expect(backupData.semesters).toBeInstanceOf(Array);
    expect(backupData.semesters.length).toBeGreaterThanOrEqual(1);
    expect(backupData.records).toBeInstanceOf(Array);
  });

  test("2. Browser UI: Handbook Favorites Pinning & Dashboard Backup Modal", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.locator('input[placeholder*="tên đăng nhập"]').fill(testUsername);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // Open Backup modal from Dashboard
    await page.click("text=Sao lưu");
    await expect(page.locator("text=Sao Lưu & Khôi Phục Dữ Liệu")).toBeVisible();
    await expect(page.locator("text=Tải về file sao lưu (JSON Backup)")).toBeVisible();
    await expect(page.locator("text=Khôi phục từ file JSON đã lưu")).toBeVisible();
    await page.click("text=Đóng");
    await expect(page.locator("text=Sao Lưu & Khôi Phục Dữ Liệu")).not.toBeVisible();

    // Navigate to Handbook
    await page.goto("/handbook");
    await page.waitForURL(/.*\/handbook/, { timeout: 15000 });
    await expect(page.locator("h1:has-text('Sổ tay Quy chế')")).toBeVisible();

    // Verify "Đã ghim" button is present
    const favButton = page.locator("button:has-text('Đã ghim')");
    await expect(favButton).toBeVisible();

    // Click "Đã ghim" filter
    await favButton.click();
    await expect(page.locator("text=Hiển thị")).toBeVisible();
  });
});
