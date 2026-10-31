import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";

test.describe("Activity Invites & Calendar Sharing Suite", () => {
  const ts = Date.now();
  const studentA = {
    username: `inviter_${ts}`,
    password: "ValidPassword123@",
    fullName: "Nguyễn Văn Sinh Viên A",
    className: "12DHTH01",
  };
  const studentB = {
    username: `invitee_${ts}`,
    password: "ValidPassword123@",
    fullName: "Trần Thị Sinh Viên B",
    className: "12DHTH02",
  };

  test("1. Student A creates activity & shares code, Student B claims via invite code", async ({ page, request }) => {
    test.setTimeout(90_000);

    // 1. Register Student A and Student B
    const regA = await request.post("/api/auth/register", {
      data: {
        username: studentA.username,
        password: studentA.password,
        fullName: studentA.fullName,
        className: studentA.className,
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(regA.status()).toBe(200);

    const regB = await request.post("/api/auth/register", {
      data: {
        username: studentB.username,
        password: studentB.password,
        fullName: studentB.fullName,
        className: studentB.className,
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(regB.status()).toBe(200);

    // 2. Student A logs in
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.fill('input[placeholder*="tên đăng nhập"]', studentA.username);
    await page.fill('input[type="password"]', studentA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 20000, waitUntil: "domcontentloaded" });

    // 3. Student A navigates to /calendar
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");

    // 4. Student A schedules an activity: "Hiến Máu Nhân Đạo HUIT"
    const addBtn = page.locator("button:has-text('Lên lịch hoạt động')").first();
    await addBtn.click();
    await page.click("button:has-text('Tự nhập mục riêng')");
    await page.fill('input[placeholder*="ngày hội"]', "Hiến Máu Nhân Đạo HUIT");
    await page.fill('input[placeholder*="+4"]', "5");

    // Select TC3 specifically inside the modal
    const catSelect = page.locator(".fixed select");
    await catSelect.selectOption("3");

    // Set today's date
    const todayStr = new Date().toISOString().split("T")[0];
    const dateInput = page.locator('.fixed input[type="date"]');
    await dateInput.fill(todayStr);

    // Set time 07:30
    const timeInput = page.locator('.fixed input[type="time"]');
    if (await timeInput.isVisible()) {
      await timeInput.fill("07:30");
    }

    // Submit
    const submitBtn = page.locator(".fixed button:has-text('Xác nhận')");
    await submitBtn.click();

    // Switch to Agenda view so activity is easily accessible
    const agendaBtn = page.locator("button:has-text('Dòng thời gian')");
    await agendaBtn.click();
    await expect(page.locator("text=Hiến Máu Nhân Đạo HUIT").first()).toBeVisible({ timeout: 10000 });

    // 5. Student A clicks share button to open ShareInviteModal
    const shareBtn = page.locator('button[title*="Chia sẻ mã mời"]').first();
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Verify Share Modal appears with generated invite code
    await expect(page.locator("h3:has-text('Chia sẻ hoạt động cho bạn bè')")).toBeVisible();
    const codeSpan = page.locator(".select-all");
    await expect(codeSpan).toBeVisible();
    const inviteCode = (await codeSpan.textContent())?.trim();
    expect(inviteCode).toMatch(/^HUIT-[2-9A-HJ-NP-Z]{4}$/);

    // Close share modal
    await page.click('button[aria-label="Đóng"]');

    // 6. Student A logs out
    const logoutBtn = page.locator('button[aria-label="Đăng xuất"]');
    await logoutBtn.click();
    await page.waitForURL("/login", { timeout: 15000 });

    // 7. Student B logs in
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.fill('input[placeholder*="tên đăng nhập"]', studentB.username);
    await page.fill('input[type="password"]', studentB.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 20000, waitUntil: "domcontentloaded" });

    // 8. Student B clicks "Nhập mã" from UpcomingScheduleCard on Dashboard
    const claimBtn = page.locator("button:has-text('Nhập mã')").first();
    await expect(claimBtn).toBeVisible();
    await claimBtn.click();

    // Verify Claim Modal appears
    await expect(page.locator("h3:has-text('Nhập mã mời hoạt động')")).toBeVisible();

    // Type the invite code
    const claimInput = page.locator('#invite-code-input');
    await claimInput.fill(inviteCode!);

    // Verify live preview of the activity
    await expect(page.locator("h4:has-text('Hiến Máu Nhân Đạo HUIT')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=@${studentA.username}`)).toBeVisible();

    // Click "Thêm vào lịch rèn luyện"
    const confirmAddBtn = page.locator("button:has-text('Thêm vào lịch rèn luyện')");
    await expect(confirmAddBtn).toBeEnabled();
    await confirmAddBtn.click();

    // Verify success notification & modal closes
    await expect(page.locator("text=thành công").first()).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // 9. Verify the claimed activity appears in Student B's Calendar (both Grid and Agenda)
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Hiến Máu Nhân Đạo HUIT").first()).toBeVisible();

    // Switch to Agenda view to verify creator badge
    await page.click("button:has-text('Dòng thời gian')");
    await expect(page.locator(`text=@${studentA.username}`).first()).toBeVisible({ timeout: 10000 });
  });

  test("2. Today's timed activity scheduled earlier in the day remains visible in UpcomingScheduleCard", async ({ page, request }) => {
    test.setTimeout(60_000);

    const studentC = {
      username: `student_today_${Date.now()}`,
      password: "ValidPassword123@",
      fullName: "Nguyễn Văn Hôm Nay",
      className: "12DHTH03",
    };

    const reg = await request.post("/api/auth/register", {
      data: {
        username: studentC.username,
        password: studentC.password,
        fullName: studentC.fullName,
        className: studentC.className,
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(reg.status()).toBe(200);

    // Login
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.fill('input[placeholder*="tên đăng nhập"]', studentC.username);
    await page.fill('input[type="password"]', studentC.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 20000, waitUntil: "domcontentloaded" });

    // Go to calendar and add today's 06:00 AM activity
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");

    const addBtn = page.locator("button:has-text('Lên lịch hoạt động')").first();
    await addBtn.click();
    await page.click("button:has-text('Tự nhập mục riêng')");
    await page.fill('input[placeholder*="ngày hội"]', "Hoạt Động Sáng Hôm Nay");
    await page.fill('input[placeholder*="+4"]', "3");

    const catSelect = page.locator(".fixed select");
    await catSelect.selectOption("1");

    const todayStr = new Date().toISOString().split("T")[0];
    const dateInput = page.locator('.fixed input[type="date"]');
    await dateInput.fill(todayStr);

    const timeInput = page.locator('.fixed input[type="time"]');
    if (await timeInput.isVisible()) {
      await timeInput.fill("06:00");
    }

    const submitBtn = page.locator(".fixed button:has-text('Xác nhận')");
    await submitBtn.click();
    await expect(page.locator("h3:has-text('Ghi nhận điểm rèn luyện')")).not.toBeVisible({ timeout: 10000 });

    // Go to Dashboard
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Verify UpcomingScheduleCard displays "Hoạt Động Sáng Hôm Nay" with badge "Hôm nay"
    const scheduleCard = page.locator("text=Lịch trình rèn luyện").locator("xpath=ancestor::div[contains(@class, 'rounded-2xl')]").first();
    await expect(scheduleCard).toBeVisible();
    await expect(scheduleCard.locator("text=Hoạt Động Sáng Hôm Nay")).toBeVisible({ timeout: 10000 });
    await expect(scheduleCard.getByText("Hôm nay", { exact: true })).toBeVisible();
  });
});
