import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";
import { db } from "../../src/lib/db";
import { users, semesters, drlRecords } from "../../src/lib/db/schema";
import { eq } from "drizzle-orm";

test.describe("Many Semesters UI Overflow & Responsiveness Suite", () => {
  const timestamp = Date.now();
  const testUsername = `user_manysem_${timestamp}`;
  const testPassword = "Password123@";
  let testUserId = "";

  test.beforeAll(async ({ request }) => {
    // 1. Register test user
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: testUsername,
        password: testPassword,
        fullName: "Nguyễn Nhiều Học Kỳ",
        className: "12DHTH01",
        faculty: "Công nghệ Thông tin",
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(regRes.status()).toBe(200);

    const u = await db.select().from(users).where(eq(users.username, testUsername)).limit(1);
    expect(u.length).toBe(1);
    testUserId = u[0].id;

    // 2. Insert 10 custom student semesters (isSystem: false)
    const semesterNames = [
      "Học kỳ 1 (2022 - 2023)",
      "Học kỳ 2 (2022 - 2023)",
      "Học kỳ Hè (2022 - 2023)",
      "Học kỳ 1 (2023 - 2024)",
      "Học kỳ 2 (2023 - 2024)",
      "Học kỳ Hè (2023 - 2024)",
      "Học kỳ 1 (2024 - 2025)",
      "Học kỳ 2 (2024 - 2025)",
      "Học kỳ 1 Thực tập Doanh nghiệp (2025 - 2026)",
      "Học kỳ 2 Tốt nghiệp & Đồ án (2025 - 2026)",
    ];

    for (let i = 0; i < semesterNames.length; i++) {
      const semId = `sem_test_${timestamp}_${i}`;
      await db.insert(semesters).values({
        id: semId,
        userId: testUserId,
        name: semesterNames[i],
        isCurrent: i === semesterNames.length - 1,
        isSystem: false,
        status: "open",
      });

      // Add a record in each semester so CumulativeStatsCard has data
      await db.insert(drlRecords).values({
        id: `rec_test_${timestamp}_${i}`,
        userId: testUserId,
        semesterId: semId,
        category: 3,
        title: `Hoạt động phong trào ${semesterNames[i]}`,
        type: "add",
        points: 10 + (i % 8) * 2,
        occurredAt: "2024-01-01",
      });
    }
  });

  test.afterAll(async () => {
    if (testUserId) {
      await db.delete(drlRecords).where(eq(drlRecords.userId, testUserId));
      await db.delete(semesters).where(eq(semesters.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  test("Observe UI layout and detect horizontal overflow with many semesters", async ({ page }) => {
    // 1. Login
    await page.goto("/login");
    await page.fill('input[placeholder*="tên đăng nhập"]', testUsername);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // 2. Check viewport at 1280px (Desktop)
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: "test-results/many-semesters-desktop-1280.png", fullPage: false });

    // Measure horizontal overflow on Desktop 1280
    const overflow1280 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`[Diagnostic] Desktop 1280px overflow: ${overflow1280}`);

    // 3. Check viewport at 1024px (Medium Desktop / iPad Landscape)
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: "test-results/many-semesters-desktop-1024.png", fullPage: false });
    const overflow1024 = await page.evaluate(() => {
      const culprits: any[] = [];
      document.querySelectorAll("*").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > window.innerWidth + 1) {
          culprits.push({
            tag: el.tagName,
            className: el.className.toString().slice(0, 80),
            id: el.id,
            right: rect.right,
            width: rect.width,
            text: el.textContent?.slice(0, 40),
          });
        }
      });
      return {
        hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        culpritsCount: culprits.length,
        topCulprits: culprits.slice(0, 5),
      };
    });
    console.log(`[Diagnostic] Desktop 1024px overflow:`, JSON.stringify(overflow1024, null, 2));

    // 5. Check viewport at 375px (Mobile iPhone SE / 13 mini)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: "test-results/many-semesters-mobile-375.png", fullPage: false });
    const overflow375 = await page.evaluate(() => {
      const culprits: any[] = [];
      document.querySelectorAll("*").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > window.innerWidth + 1) {
          culprits.push({
            tag: el.tagName,
            className: el.className.toString().slice(0, 80),
            id: el.id,
            right: rect.right,
            width: rect.width,
            text: el.textContent?.slice(0, 40),
          });
        }
      });
      return {
        hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        culpritsCount: culprits.length,
        topCulprits: culprits.slice(0, 5),
      };
    });
    console.log(`[Diagnostic] Mobile 375px overflow:`, JSON.stringify(overflow375, null, 2));

    // 6. Check header elements visibility
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // 7. Click on Tab 3: Mục tiêu & Radar to observe CumulativeStatsCard
    const radarTab = page.locator("button:has-text('Mục tiêu & Radar')");
    await radarTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "test-results/many-semesters-cumulative-stats.png", fullPage: false });
  });
});
