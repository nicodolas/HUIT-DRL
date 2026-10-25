import { test, expect } from "@playwright/test";

test.describe("Phase 16: Activity Proof QR Verification Slip Suite", () => {
  const timestamp = Date.now();
  const testUsername = `user_qr_${timestamp}`;
  const testPassword = "Password123@";
  const testFullName = `Lê Minh QR ${timestamp.toString().slice(-4)}`;
  const testClass = "13DHTH03";

  test("should generate QR verification slip for student activities", async ({ page }) => {
    // 1. Register student
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

    // 2. Add an activity to verify
    const addBtn = page.getByRole("button", { name: "Ghi nhận điểm" });
    await addBtn.click();

    // Switch to Custom Tab
    const customTab = page.getByRole("button", { name: "Tự nhập mục riêng" });
    await customTab.click();

    await page.fill('input[placeholder*="ngày hội việc làm"]', "Tham gia giải chạy HUIT Marathon 2026");
    await page.fill('input[placeholder*="+4 hoặc -5"]', "4.0");

    const saveRecordBtn = page.getByRole("button", { name: "Xác nhận" });
    await saveRecordBtn.click();

    // 3. Verify activity appears in RecordList
    await expect(page.getByText("Tham gia giải chạy HUIT Marathon 2026")).toBeVisible({ timeout: 10000 });

    // 4. Click QR Code Verification Button
    const qrBtn = page.locator('button[title="Mã QR & Thẻ xác nhận"]').first();
    await expect(qrBtn).toBeVisible();
    await qrBtn.click();

    // 5. Verify Modal & QR Image
    const modalTitle = page.getByText("Thẻ Xác Nhận & Mã QR Minh Chứng");
    await expect(modalTitle).toBeVisible();

    const qrImg = page.locator('img[alt="QR Code Minh Chứng"]');
    await expect(qrImg).toBeVisible();

    // Verify activity details on verification slip
    await expect(page.locator("strong", { hasText: testFullName })).toBeVisible();
    await expect(page.getByText("+4.0 điểm")).toBeVisible();

    // 6. Test Copy Verification Summary
    const copyBtn = page.getByRole("button", { name: "Sao chép" });
    await copyBtn.click();
    await expect(page.getByText("Đã chép!")).toBeVisible();

    // 7. Complete & Close Modal
    const finishBtn = page.getByRole("button", { name: "Hoàn tất" });
    await finishBtn.click();
    await expect(modalTitle).not.toBeVisible();
  });
});
