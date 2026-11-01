import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";

async function registerTestUser(
  request: any,
  u: { username: string; password: string; fullName: string; className: string }
) {
  const res = await request.post("/api/auth/register", {
    data: {
      username: u.username,
      password: u.password,
      fullName: u.fullName,
      className: u.className,
      captchaToken: getValidTestCaptchaToken(),
    },
  });
  expect(res.status()).toBe(200);
}

async function loginUser(page: any, u: { username: string; password: string }) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.fill('input[placeholder*="tên đăng nhập"]', u.username);
  await page.fill('input[type="password"]', u.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 20000, waitUntil: "domcontentloaded" });
}

test.describe("Interactive Tour Guide (Onboarding Walkthrough)", () => {
  test("First-time visitor: Welcome modal appears, walks through 3 steps, completes and marks tour seen", async ({
    page,
    request,
  }) => {
    const user = {
      username: `tour_${Date.now()}`,
      password: "Password123!",
      fullName: "Nguyễn Văn Hướng Dẫn",
      className: "12DHTH01",
    };

    await registerTestUser(request, user);
    await loginUser(page, user);

    // 1. First-time visitor should see the Welcome Tour Modal after ~800ms
    const welcomeModalTitle = page.locator("#welcome-tour-title");
    await expect(welcomeModalTitle).toBeVisible({ timeout: 10000 });
    await expect(welcomeModalTitle).toHaveText("Chào mừng bạn đến với HUIT-DRL!");

    // 2. Click "Bắt đầu ngay"
    const startBtn = page.locator("#tour-welcome-start-btn");
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // 3. Step 1: Điểm rèn luyện & 5 Tiêu chí
    const popover = page.locator(".driver-popover.huit-tour-popover");
    await expect(popover).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".driver-popover-title")).toContainText("🎯 Điểm rèn luyện & 5 Tiêu chí");
    await expect(page.locator(".driver-popover-progress-text")).toHaveText("1 / 3");

    // 4. Click Next -> Step 2: Ghi nhận hoạt động rèn luyện
    const nextBtn = page.locator(".driver-popover-next-btn");
    await expect(nextBtn).toHaveText("Tiếp tục →");
    await nextBtn.click();

    await expect(page.locator(".driver-popover-title")).toContainText("➕ Ghi nhận hoạt động rèn luyện");
    await expect(page.locator(".driver-popover-progress-text")).toHaveText("2 / 3");

    // 5. Click Next -> Step 3: Lịch trình & Nhắc việc
    await nextBtn.click();
    await expect(page.locator(".driver-popover-title")).toContainText("📅 Lịch trình & Nhắc việc");
    await expect(page.locator(".driver-popover-progress-text")).toHaveText("3 / 3");
    await expect(nextBtn).toHaveText("✓ Hoàn tất");

    // 6. Click Done -> Tour terminates and marks seen in localStorage
    await nextBtn.click();
    await expect(popover).not.toBeVisible({ timeout: 3000 });

    const tourSeenFlag = await page.evaluate(() => localStorage.getItem("huit_drl_tour_seen"));
    expect(tourSeenFlag).toBe("true");

    // 7. Reload page: Welcome modal should NOT appear again
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200); // Wait longer than 800ms modal delay
    await expect(welcomeModalTitle).not.toBeVisible();
  });

  test("Relaunch tour via Header Help button and Utilities Menu", async ({
    page,
    request,
  }) => {
    const user = {
      username: `relaunch_${Date.now()}`,
      password: "Password123!",
      fullName: "Trần Trợ Giúp",
      className: "12DHTH02",
    };

    await registerTestUser(request, user);
    await loginUser(page, user);

    // Dismiss initial welcome dialog via "Để sau"
    const welcomeModalTitle = page.locator("#welcome-tour-title");
    await expect(welcomeModalTitle).toBeVisible({ timeout: 10000 });
    const dismissBtn = page.locator("button:has-text('Để sau')");
    await dismissBtn.click();
    await expect(welcomeModalTitle).not.toBeVisible();

    // Verify localStorage has huit_drl_tour_seen
    const tourSeenFlag = await page.evaluate(() => localStorage.getItem("huit_drl_tour_seen"));
    expect(tourSeenFlag).toBe("true");

    // Relaunch via Header Help button
    const helpBtn = page.locator("#tour-help-btn");
    await expect(helpBtn).toBeVisible();
    await helpBtn.click();

    const popover = page.locator(".driver-popover.huit-tour-popover");
    await expect(popover).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".driver-popover-title")).toContainText("🎯 Điểm rèn luyện & 5 Tiêu chí");

    // Close via close button (X)
    const closeBtn = page.locator(".driver-popover-close-btn");
    await closeBtn.click();
    await expect(popover).not.toBeVisible();

    // Relaunch via Student Utilities Menu
    const utilitiesBtn = page.locator("button[title='Tiện ích khác']");
    await utilitiesBtn.click();

    const rerunTourBtn = page.locator("button:has-text('Xem lại hướng dẫn nhanh')");
    await expect(rerunTourBtn).toBeVisible();
    await rerunTourBtn.click();

    await expect(popover).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".driver-popover-title")).toContainText("🎯 Điểm rèn luyện & 5 Tiêu chí");

    // Press Escape key to close
    await page.keyboard.press("Escape");
    await expect(popover).not.toBeVisible();
  });

  test("Mobile viewport: Tour modal & popover render within screen bounds", async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const user = {
      username: `mob_${Date.now()}`,
      password: "Password123!",
      fullName: "Lê Di Động",
      className: "12DHTH03",
    };

    await registerTestUser(request, user);
    await loginUser(page, user);

    // Welcome modal on mobile
    const welcomeModal = page.locator("#welcome-tour-title");
    await expect(welcomeModal).toBeVisible({ timeout: 10000 });

    const startBtn = page.locator("#tour-welcome-start-btn");
    await startBtn.click();

    // Popover on mobile
    const popover = page.locator(".driver-popover.huit-tour-popover");
    await expect(popover).toBeVisible({ timeout: 5000 });

    const box = await popover.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Popover must fit on screen horizontally without overflow
      const viewport = page.viewportSize();
      const screenWidth = viewport ? viewport.width : 393;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(screenWidth);
    }

    // Step through on mobile
    const nextBtn = page.locator(".driver-popover-next-btn");
    await nextBtn.click();
    await expect(page.locator(".driver-popover-title")).toContainText("➕ Ghi nhận hoạt động rèn luyện");

    await nextBtn.click();
    await expect(page.locator(".driver-popover-title")).toContainText("📅 Lịch trình & Nhắc việc");

    await nextBtn.click();
    await expect(popover).not.toBeVisible();
  });
});
