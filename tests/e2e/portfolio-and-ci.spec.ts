import { test, expect } from "@playwright/test";
import { checkAndNotifyDeadline } from "../../src/lib/notifications/browserPush";

test.describe("Phase 13: Extracurricular Dossier & Notification Engine", () => {
  const testUsername = `port_${Date.now()}`;
  const testPassword = "PortfolioPassword123!";
  const testFullName = "Sinh Viên Ngoại Khóa HUIT";

  test("1. Notification engine accurately calculates deadline alerts", () => {
    // 1. Deadline in 3 days -> should alert
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const alertResult = checkAndNotifyDeadline("Học kỳ 1 (2025 - 2026)", threeDaysLater);
    expect(alertResult.shouldAlert).toBe(true);
    expect(alertResult.daysRemaining).toBeLessThanOrEqual(4);

    // 2. Deadline in 30 days -> should NOT alert
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const noAlertResult = checkAndNotifyDeadline("Học kỳ 1 (2025 - 2026)", thirtyDaysLater);
    expect(noAlertResult.shouldAlert).toBe(false);

    // 3. Past deadline -> should indicate overdue
    const pastDate = "2024-01-01";
    const pastResult = checkAndNotifyDeadline("Học kỳ 1 (2023 - 2024)", pastDate);
    expect(pastResult.shouldAlert).toBe(true);
    expect(pastResult.message).toContain("quá hạn");
  });

  test("2. Browser UI: Open Records page and trigger Extracurricular Dossier Modal", async ({ page }) => {
    // Register
    await page.goto("/register");
    await page.locator('input[placeholder*="nguyenvana"]').fill(testUsername);
    await expect(page.getByText(/khả dụng/i)).toBeVisible({ timeout: 5000 });
    await page.locator('input[placeholder*="Tối thiểu 6 ký tự"]').fill(testPassword);
    await page.locator('input[placeholder*="Nhập lại mật khẩu"]').fill(testPassword);
    await page.locator('input[placeholder*="Nguyễn Văn"]').fill(testFullName);
    await page.locator('input[placeholder*="DHTH"]').fill("12DHTH03");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // Navigate to Records page
    await page.goto("/records");
    await page.waitForURL(/.*\/records/, { timeout: 15000 });
    await expect(page.locator("text=Sổ ghi nhận điểm rèn luyện")).toBeVisible();

    // Click "Hồ sơ ngoại khóa" button
    await page.click("text=Hồ sơ ngoại khóa");

    // Assert Extracurricular Dossier Modal elements
    await expect(page.locator("text=BẢN TRÍCH LỤC THÀNH TÍCH HOẠT ĐỘNG NGOẠI KHÓA")).toBeVisible();
    await expect(page.locator("text=I. Hoạt động Nghiên cứu khoa học & Học thuật")).toBeVisible();
    await expect(page.locator("text=II. Phong trào Tình nguyện & Vì cộng đồng")).toBeVisible();
    await expect(page.locator("text=III. Văn hóa, Văn nghệ & Thể dục thể thao")).toBeVisible();
    await expect(page.locator("text=IV. Hoạt động Cán bộ lớp, Đoàn thể & Khen thưởng")).toBeVisible();
    await expect(page.locator("text=XÁC NHẬN CỦA ĐOÀN - HỘI / CỐ VẤN")).toBeVisible();

    // Close modal
    await page.click("text=Đóng");
    await expect(page.locator("text=BẢN TRÍCH LỤC THÀNH TÍCH HOẠT ĐỘNG NGOẠI KHÓA")).not.toBeVisible();
  });
});
