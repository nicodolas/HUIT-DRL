import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";
import { neon } from "@neondatabase/serverless";

test.describe("Header Responsive & Non-wrapping Layout Suite", () => {
  const timestamp = Date.now();
  const adminUsername = `hdr_adm_${timestamp}`;
  const adminPassword = "AdminPassword123@";

  test("Header: Nav links render on a single line with generous spacing, no squished multi-line text", async ({ page, request }) => {
    // 1. Register user
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: adminUsername,
        password: adminPassword,
        fullName: "Nguyễn Văn Hiếu",
        className: "12DHTH05",
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(regRes.status()).toBe(200);

    // 2. Grant admin
    const sql = neon(process.env.DATABASE_URL!);
    await sql`UPDATE users SET role = 'admin' WHERE username = ${adminUsername}`;

    // 3. Set Desktop Viewport (1280px standard)
    await page.setViewportSize({ width: 1280, height: 800 });

    // 4. Login
    await page.goto("/login");
    await page.fill('input[placeholder*="tên đăng nhập"]', adminUsername);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // 5. Verify all nav links exist and are visible
    const nav = page.locator("header nav");
    await expect(nav).toBeVisible();

    const expectedLabels = [
      "Tổng quan",
      "Sổ điểm",
      "Mục tiêu",
      "Sổ tay",
      "Phiếu ĐRL",
      "Hồ sơ",
      "Quản trị",
    ];

    for (const label of expectedLabels) {
      const link = nav.locator(`a:has-text("${label}")`);
      await expect(link).toBeVisible();
      // Verify height is compact (single line button, typically ~30-38px, NOT multi-line ~50px+)
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeLessThan(42);
      }
    }

    // 6. Capture header screenshot at 1280px
    const header = page.locator("header");
    await header.screenshot({
      path: "C:/Users/Admin/.gemini/antigravity/brain/f50425b0-0e04-4b9c-9d96-16e1f38ec306/header_desktop_spacious.png",
    });

    // 7. Test at 1024px viewport (standard small laptop)
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(nav).toBeVisible();
    await header.screenshot({
      path: "C:/Users/Admin/.gemini/antigravity/brain/f50425b0-0e04-4b9c-9d96-16e1f38ec306/header_1024px_laptop.png",
    });
  });
});

