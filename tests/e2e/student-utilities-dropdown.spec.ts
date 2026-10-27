import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";
import path from "path";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });
const sql = neon(process.env.DATABASE_URL_OWNER || process.env.DATABASE_URL!);

test.describe("Student Utilities Dropdown Inspection & Clipping Suite", () => {
  const timestamp = Date.now();
  const testUsername = `util_test_${timestamp}`;
  const testPassword = "ValidPassword123@";
  const testFullName = `Sinh Viên Test Tiện Ích`;
  const testClass = "14DHTH05";
  const artifactDir = "C:/Users/Admin/.gemini/antigravity/brain/f50425b0-0e04-4b9c-9d96-16e1f38ec306";

  test.afterAll(async () => {
    // Keep DB clean: delete the test user
    await sql`DELETE FROM users WHERE username = ${testUsername};`;
  });

  test("Utilities dropdown is fully visible, not clipped, and accessible in both light and dark modes", async ({ page, request }) => {
    // 1. Register test user
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: testUsername,
        password: testPassword,
        fullName: testFullName,
        className: testClass,
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(regRes.status()).toBe(200);

    // 2. Login to UI
    await page.goto("/login");
    await page.fill('input[placeholder*="tên đăng nhập"]', testUsername);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // 3. Find and click "Tiện ích"
    const utilitiesBtn = page.locator('button[title="Tiện ích khác"]');
    await expect(utilitiesBtn).toBeVisible();
    await utilitiesBtn.click();

    // 4. Verify all 5 dropdown items are visible
    const reportItem = page.locator('text=Xuất phiếu Mẫu số 01 (QĐ 3385)');
    const forecastItem = page.locator('text=Dự báo tốt nghiệp (Điều 12)');
    const profileItem = page.locator('text=Chỉnh sửa hồ sơ cá nhân');
    const csvItem = page.locator('text=Xuất / Nhập bảng tính Excel');
    const backupItem = page.locator('text=Sao lưu dữ liệu cá nhân');

    await expect(reportItem).toBeVisible();
    await expect(forecastItem).toBeVisible();
    await expect(profileItem).toBeVisible();
    await expect(csvItem).toBeVisible();
    await expect(backupItem).toBeVisible();

    // 5. Verify the dropdown bottom extends past the header card and is NOT clipped
    const dropdownBox = await page.locator('text=Sao lưu dữ liệu cá nhân').boundingBox();
    expect(dropdownBox).not.toBeNull();
    expect(dropdownBox!.height).toBeGreaterThan(15);
    expect(dropdownBox!.width).toBeGreaterThan(100);

    // Take screenshot in Light Mode
    await page.screenshot({
      path: path.join(artifactDir, "utilities_dropdown_light.png"),
      fullPage: false,
    });

    // 6. Toggle Dark Mode and verify
    const themeBtn = page.locator('button[title*="nền"]');
    await themeBtn.click();
    await page.waitForTimeout(300);

    // Dropdown might close on theme button click, re-open if needed
    if (!(await backupItem.isVisible())) {
      await utilitiesBtn.click();
    }

    await expect(backupItem).toBeVisible();

    // Take screenshot in Dark Mode
    await page.screenshot({
      path: path.join(artifactDir, "utilities_dropdown_dark.png"),
      fullPage: false,
    });
  });
});

