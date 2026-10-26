import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";

test.describe("Theme Engine & Dark / Light Mode System Suite", () => {
  const timestamp = Date.now();
  const testUsername = `user_theme_${timestamp}`;
  const testPassword = "ValidPassword123@";
  const testFullName = `Sinh Viên Thử Nghiệm Theme`;
  const testClass = "13DHTH01";

  test("Theme toggle: seamless persistence, no flash of white, and multi-page dark styling", async ({ page, request }) => {
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

    // 3. Find theme toggle button
    const themeBtn = page.locator('button[title*="nền"]');
    await expect(themeBtn).toBeVisible();

    // 4. Switch to Dark Mode
    await themeBtn.click();

    // Verify 'dark' class applied to documentElement
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDark).toBe(true);

    const storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(storedTheme).toBe("dark");

    // 5. Verify page reload preserves dark mode immediately
    await page.reload();
    const isDarkAfterReload = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDarkAfterReload).toBe(true);

    // 6. Navigate to /profile and verify dark theme is active
    await page.goto("/profile");
    await expect(page.locator("h1", { hasText: "Tài khoản cá nhân" })).toBeVisible();
    const profileIsDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(profileIsDark).toBe(true);

    // Screenshot dark profile
    await page.screenshot({
      path: "C:/Users/Admin/.gemini/antigravity/brain/f50425b0-0e04-4b9c-9d96-16e1f38ec306/profile_dark_mode.png",
      fullPage: true,
    });

    // 7. Toggle back to Light Mode on /profile
    const lightBtn = page.locator('button[title*="nền"]');
    await lightBtn.click();

    const isLight = await page.evaluate(() => !document.documentElement.classList.contains("dark"));
    expect(isLight).toBe(true);

    const storedThemeLight = await page.evaluate(() => localStorage.getItem("theme"));
    expect(storedThemeLight).toBe("light");

    // Screenshot light profile
    await page.screenshot({
      path: "C:/Users/Admin/.gemini/antigravity/brain/f50425b0-0e04-4b9c-9d96-16e1f38ec306/profile_light_mode.png",
      fullPage: true,
    });
  });
});

