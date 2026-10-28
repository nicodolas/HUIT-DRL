import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";

test.describe("Personal Training Calendar & Upcoming Reminders Suite", () => {
  const timestamp = Date.now();
  const testUsername = `user_cal_${timestamp}`;
  const testPassword = "ValidPassword123@";
  const testFullName = `Sinh Viên Lịch Trình`;
  const testClass = "13DHTH02";

  // Calculate a future date (5 days ahead) in YYYY-MM-DD
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);
  const futureDateStr = futureDate.toISOString().split("T")[0];

  test("1. Full lifecycle: Schedule future activity, view in calendar grid & agenda, and verify dashboard reminders", async ({ page, request }) => {
    test.setTimeout(60_000);

    // 1. Register test student
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

    // 2. Login to Dashboard
    await page.goto("/login");
    await page.fill('input[placeholder*="tên đăng nhập"]', testUsername);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // 3. Verify Header has "Lịch trình" link and navigate
    const calendarHeaderLink = page.locator('header a[href="/calendar"]').first();
    await expect(calendarHeaderLink).toBeVisible();
    await calendarHeaderLink.click();
    await page.waitForURL("/calendar", { timeout: 15000 });

    // 4. Verify Calendar UI elements
    await expect(page.locator("h1:has-text('Lịch Cá Nhân')")).toBeVisible();
    const gridBtn = page.locator("button:has-text('Lịch tháng')");
    const agendaBtn = page.locator("button:has-text('Dòng thời gian')");
    await expect(gridBtn).toBeVisible();
    await expect(agendaBtn).toBeVisible();

    // 5. Open Add Record modal directly from calendar
    const addEventBtn = page.locator("button:has-text('Lên lịch hoạt động')").first();
    await addEventBtn.click();

    // Verify modal is open with time & location fields
    const modalHeader = page.locator("h3:has-text('Ghi nhận điểm rèn luyện')");
    await expect(modalHeader).toBeVisible();

    // Fill in custom activity
    await page.click("button:has-text('Tự nhập mục riêng')");
    await page.fill('input[placeholder*="ngày hội"]', "Hội thảo Khởi nghiệp Công nghệ 2026");
    await page.fill('input[placeholder*="+4"]', "5");

    // Select TC3 specifically inside the modal
    const catSelect = page.locator(".fixed select");
    await catSelect.selectOption("3");

    // Set future date, time, and location
    const dateInput = page.locator('.fixed input[type="date"]');
    await dateInput.fill(futureDateStr);

    const timeInput = page.locator('.fixed input[type="time"]');
    if (await timeInput.isVisible()) {
      await timeInput.fill("09:30");
    }

    const locInput = page.locator('.fixed input[placeholder*="Hội trường A"]');
    if (await locInput.isVisible()) {
      await locInput.fill("Hội trường C");
    }

    // Submit form (the button inside the modal footer)
    const submitBtn = page.locator(".fixed button:has-text('Xác nhận')");
    await submitBtn.click();

    // Wait for modal to close
    await expect(modalHeader).not.toBeVisible({ timeout: 10000 });

    // 6. Switch to Agenda View to verify event listing
    await agendaBtn.click();
    await expect(page.locator("text=Hội thảo Khởi nghiệp Công nghệ 2026")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Hội trường C")).toBeVisible();
    await expect(page.locator("text=Chưa có minh chứng")).toBeVisible();

    // 7. Return to Dashboard and verify UpcomingScheduleCard
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Upcoming schedule card should show the scheduled event
    const upcomingScheduleHeading = page.locator("text=Lịch trình rèn luyện").first();
    await expect(upcomingScheduleHeading).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Hội thảo Khởi nghiệp Công nghệ 2026").first()).toBeVisible();

    // Verify record in RecordList has "Dự kiến +5đ" badge (not added to current score immediately)
    const plannedScoreBadge = page.locator("text=/Dự kiến \\+5đ/").first();
    await expect(plannedScoreBadge).toBeVisible();
  });
});

