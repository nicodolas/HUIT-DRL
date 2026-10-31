import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function registerTestUser(request: any, u: { username: string; password: string; fullName: string; className: string }) {
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

async function scheduleCustomActivity(
  page: any,
  options: { title: string; points: string; category: string; dateStr: string; timeStr?: string }
) {
  const addBtn = page.locator("button:has-text('Lên lịch hoạt động')").first();
  await addBtn.click();
  await page.click("button:has-text('Tự nhập mục riêng')");
  await page.fill('input[placeholder*="ngày hội"]', options.title);
  await page.fill('input[placeholder*="+4"]', options.points);

  const catSelect = page.locator(".fixed select");
  await catSelect.selectOption(options.category);

  const dateInput = page.locator('.fixed input[type="date"]');
  await dateInput.fill(options.dateStr);

  if (options.timeStr) {
    const timeInput = page.locator('.fixed input[type="time"]');
    if (await timeInput.isVisible()) {
      await timeInput.fill(options.timeStr);
    }
  }

  const submitBtn = page.locator(".fixed button:has-text('Xác nhận')");
  await submitBtn.click();
}

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
    await registerTestUser(request, studentA);
    await registerTestUser(request, studentB);

    // 2. Student A logs in
    await loginUser(page, studentA);

    // 3. Student A navigates to /calendar
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");

    // 4. Student A schedules an activity: "Hiến Máu Nhân Đạo HUIT"
    const todayStr = formatLocalDate(new Date());
    await scheduleCustomActivity(page, {
      title: "Hiến Máu Nhân Đạo HUIT",
      points: "5",
      category: "3",
      dateStr: todayStr,
      timeStr: "07:30",
    });

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
    await loginUser(page, studentB);

    // 8. Student B clicks "Nhập mã" from UpcomingScheduleCard on Dashboard
    const claimBtn = page.locator("button:has-text('Nhập mã')").first();
    await expect(claimBtn).toBeVisible();
    await claimBtn.click();

    // Verify Claim Modal appears
    await expect(page.locator("h3:has-text('Nhập mã mời hoạt động')")).toBeVisible();

    // 9. Student B types invite code
    const claimInput = page.locator('input[placeholder*="HUIT-"]');
    await expect(claimInput).toBeVisible();
    await claimInput.fill(inviteCode!);

    // Live preview card appears
    await expect(page.locator("text=Hiến Máu Nhân Đạo HUIT")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=@${studentA.username}`)).toBeVisible();

    // 10. Confirm Claim
    const confirmClaimBtn = page.locator("button:has-text('Thêm vào lịch rèn luyện')");
    await expect(confirmClaimBtn).toBeEnabled();
    await confirmClaimBtn.click();

    // Success notification
    await expect(page.locator("text=Đã thêm hoạt động")).toBeVisible({ timeout: 10000 });

    // 11. Verify activity is now on Student B's Dashboard and Calendar
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");

    // Activity visible on Student B's agenda
    const agendaBtnB = page.locator("button:has-text('Dòng thời gian')");
    await agendaBtnB.click();
    await expect(page.locator("text=Hiến Máu Nhân Đạo HUIT").first()).toBeVisible({ timeout: 10000 });

    // Origin badge "@inviter" visible
    await expect(page.locator(`text=@${studentA.username}`).first()).toBeVisible();
  });

  test("2. Timed activity scheduled earlier today remains visible on Dashboard Schedule", async ({ page, request }) => {
    test.setTimeout(60_000);

    const tsC = Date.now() + 1000;
    const studentC = {
      username: `today_sched_${tsC}`,
      password: "ValidPassword123@",
      fullName: "Lê Văn Hôm Nay",
      className: "12DHTH03",
    };

    // Register & Login
    await registerTestUser(request, studentC);
    await loginUser(page, studentC);

    // Go to calendar and add today's 06:00 AM activity
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");

    const todayStr = formatLocalDate(new Date());
    await scheduleCustomActivity(page, {
      title: "Hoạt Động Sáng Hôm Nay",
      points: "3",
      category: "1",
      dateStr: todayStr,
      timeStr: "06:00",
    });
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
