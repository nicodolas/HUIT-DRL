import { test, expect } from "@playwright/test";

test.describe("Phase 17: Official HUIT DRL Appeal (Điều 13) & Theme Engine Suite", () => {
  const timestamp = Date.now();
  const testUsername = `user_appeal_${timestamp}`;
  const testPassword = "Password123@";
  const testFullName = `Trần Khiếu Nại ${timestamp.toString().slice(-4)}`;
  const testClass = "12DHTH05";

  test("should toggle dark/light theme and draft official DRL appeal dossier", async ({ page }) => {
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

    // 2. Test Theme Toggle (Dark / Light)
    const darkToggleBtn = page.locator('button[aria-label="Chuyển sang giao diện tối"]');
    await expect(darkToggleBtn).toBeVisible();
    await darkToggleBtn.click();

    // Verify dark class applied to html root
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDark).toBe(true);

    // Toggle back to light
    const lightToggleBtn = page.locator('button[aria-label="Chuyển sang giao diện sáng"]');
    await expect(lightToggleBtn).toBeVisible();
    await lightToggleBtn.click();

    const isLight = await page.evaluate(() => !document.documentElement.classList.contains("dark"));
    expect(isLight).toBe(true);

    // 3. Open DRL Appeal Modal on Dashboard via Utilities Menu
    const utilitiesDropdown = page.getByRole("button", { name: "Tiện ích khác" });
    await expect(utilitiesDropdown).toBeVisible({ timeout: 10000 });
    await utilitiesDropdown.click();
    const appealBtn = page.getByRole("button", { name: /Soạn đơn khiếu nại|Khiếu nại/i });
    await expect(appealBtn).toBeVisible();
    await appealBtn.click();

    // Verify Modal Header
    const modalHeader = page.getByText("Soạn Đơn Khiếu Nại / Phúc Khảo ĐRL (Điều 13)");
    await expect(modalHeader).toBeVisible();

    // Select a Reason Preset
    const reasonPresetBtn = page.locator('button:has-text("Bị ghi nhận vắng mặt")').first();
    await expect(reasonPresetBtn).toBeVisible();
    await reasonPresetBtn.click();

    // 4. Switch to Printable Preview Tab
    const previewTabBtn = page.getByRole("button", { name: "Xem trước đơn A4 chuẩn" });
    await previewTabBtn.click();

    // Verify legal headers and text
    await expect(page.getByRole("heading", { name: "ĐƠN KHIẾU NẠI VỀ KẾT QUẢ ĐÁNH GIÁ ĐIỂM RÈN LUYỆN" })).toBeVisible();
    await expect(page.getByText("Căn cứ Điều 13, Quyết định số 3385/QĐ-DCT")).toBeVisible();
    await expect(page.getByText("NGƯỜI LÀM ĐƠN")).toBeVisible();

    // Test Copy Appeal Text
    const copyBtn = page.getByRole("button", { name: "Sao chép đơn" });
    await copyBtn.click();
    await expect(page.getByText("Đã chép nội dung!")).toBeVisible();

    // Close Modal
    const closeBtn = page.getByRole("button", { name: "Đóng" });
    await closeBtn.click();
    await expect(modalHeader).not.toBeVisible();

    // 5. Navigate to Report page and verify Appeal button is accessible
    await page.goto("/report");
    const reportAppealBtn = page.getByRole("button", { name: "Khiếu nại (Điều 13)" });
    await expect(reportAppealBtn).toBeVisible({ timeout: 10000 });
    await reportAppealBtn.click();

    await expect(page.getByText("Soạn Đơn Khiếu Nại / Phúc Khảo ĐRL (Điều 13)")).toBeVisible();
    await page.getByRole("button", { name: "Đóng" }).click();
  });
});

