import { test, expect } from "@playwright/test";

test.describe("Phase 18: Training Calendar Sync (.ICS & Google Calendar) Suite", () => {
  const timestamp = Date.now();
  const testUsername = `user_cal_${timestamp}`;
  const testPassword = "Password123@";
  const testFullName = `Lê Văn Lịch ${timestamp.toString().slice(-4)}`;
  const testClass = "14DHTH12";

  test("should synchronize training schedule and export .ics calendar events", async ({ page }) => {
    // 1. Register test student
    await page.goto("/register");
    const usernameInput = page.locator('input[placeholder*="nguyenvana"]');
    await usernameInput.fill(testUsername);
    await expect(page.getByText(/khả dụng/i)).toBeVisible({ timeout: 5000 });

    await page.locator('input[placeholder*="Tối thiểu 6 ký tự"]').fill(testPassword);
    await page.locator('input[placeholder*="Nhập lại mật khẩu"]').fill(testPassword);
    await page.locator('input[placeholder*="Nguyễn Văn"]').fill(testFullName);
    await page.locator('input[placeholder*="DHTH"]').fill(testClass);

    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // 2. Open Calendar Sync Modal
    const syncBtn = page.getByRole("button", { name: "Đồng bộ Lịch" });
    await expect(syncBtn).toBeVisible({ timeout: 10000 });
    await syncBtn.click();

    // Verify Modal Header & RFC 5545 format
    const modalTitle = page.getByText("Đồng Bộ Lịch & Nhắc Nhở Hạn Chót");
    await expect(modalTitle).toBeVisible();
    await expect(page.getByText("Định dạng RFC 5545")).toBeVisible();

    // Copy calendar text
    const copyBtn = page.getByRole("button", { name: "Sao chép" });
    await copyBtn.click();
    await expect(page.getByText("Đã chép lịch!")).toBeVisible();

    // Verify Download button exists
    const downloadBtn = page.getByRole("button", { name: "Tải file .ICS" });
    await expect(downloadBtn).toBeVisible();

    // Close Modal
    const closeBtn = page.getByRole("button", { name: "Đóng" });
    await closeBtn.click();
    await expect(modalTitle).not.toBeVisible();

    // 3. Add an activity with a specific date
    const addBtn = page.getByRole("button", { name: "Ghi nhận điểm" });
    await addBtn.click();

    const customTab = page.getByRole("button", { name: "Tự nhập mục riêng" });
    await customTab.click();

    await page.fill('input[placeholder*="ngày hội việc làm"]', "Hội thảo Khởi nghiệp ĐMST HUIT 2026");
    await page.fill('input[placeholder*="+4 hoặc -5"]', "3.0");
    await page.fill('input[type="date"]', "2026-11-15");

    const saveRecordBtn = page.getByRole("button", { name: "Xác nhận" });
    await saveRecordBtn.click();

    await expect(page.getByText("Hội thảo Khởi nghiệp ĐMST HUIT 2026")).toBeVisible({ timeout: 10000 });

    // 4. Re-open Calendar Sync Modal and verify event appears
    await syncBtn.click();
    await expect(page.getByText(/\[ĐRL TC3\] Hội thảo Khởi nghiệp/)).toBeVisible();
    await expect(page.locator("div", { hasText: "2026-11-15" }).first()).toBeVisible();

    await page.getByRole("button", { name: "Đóng" }).click();
  });
});
