import { test, expect } from "@playwright/test";

test.describe("Phase 20: Multi-Year Graduation DRL Forecast & Target Simulator (Điều 12)", () => {
  const timestamp = Date.now();
  const testUsername = `user_forecast_${timestamp}`;
  const testPassword = "Password123@";
  const testFullName = `Đặng Dự Báo ${timestamp.toString().slice(-4)}`;
  const testClass = "14DHTH01";

  test("should compute required semester points, handle discipline restrictions, and simulate what-if scenarios", async ({ page }) => {
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

    // 2. Open Graduation Forecast Modal from Dashboard
    const forecastBtn = page.getByRole("button", { name: "Dự báo tốt nghiệp" });
    await expect(forecastBtn).toBeVisible();
    await forecastBtn.click();

    // Verify modal header & Điều 12 badge
    const modal = page.locator('[data-testid="graduation-forecast-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Điều 12 QĐ 3385")).toBeVisible();
    await expect(modal.getByText("Dự Báo ĐRL Tốt Nghiệp Toàn Khóa")).toBeVisible();

    // Verify default target (Xuất sắc >= 90)
    await expect(modal.getByText("Mục tiêu: 90đ (Xuất sắc)")).toBeVisible();
    await expect(modal.getByText("TB cần đạt mỗi HK")).toBeVisible();

    // 3. Switch Target Tier to 'Tốt (≥ 80 điểm)'
    const targetSelect = modal.getByLabel("Chọn mục tiêu xếp loại");
    await targetSelect.selectOption("tot");
    await expect(modal.getByText("Mục tiêu: 80đ (Tốt)")).toBeVisible();

    // 4. Test Discipline Warning (Điều 12 Khoản 3)
    const disciplineCheckbox = modal.locator('input[type="checkbox"]');
    await disciplineCheckbox.check();
    await expect(modal.getByText("Quy chế kỷ luật tốt nghiệp (Điều 12 Khoản 3):")).toBeVisible();
    await expect(modal.getByText("Khá (Bị giới hạn trần)")).toBeVisible();

    // Uncheck discipline
    await disciplineCheckbox.uncheck();
    await expect(modal.getByText("Quy chế kỷ luật tốt nghiệp (Điều 12 Khoản 3):")).not.toBeVisible();

    // 5. Test What-If Simulator Tab
    const simTab = modal.getByRole("button", { name: "Mô phỏng từng học kỳ (What-If)" });
    await simTab.click();

    await expect(modal.getByText("Thử nghiệm các kịch bản điểm số:")).toBeVisible();
    await expect(modal.getByText("Kết quả mô phỏng toàn khóa:")).toBeVisible();

    // Test 'Gán đều điểm cần đạt'
    const evenSplitBtn = modal.getByRole("button", { name: "Gán đều điểm cần đạt" });
    await evenSplitBtn.click();
    await expect(modal.getByText("Kết quả mô phỏng toàn khóa:")).toBeVisible();

    // 6. Test Copy Summary Button
    const copyBtn = modal.getByRole("button", { name: /Sao chép tóm tắt/ });
    await copyBtn.click();
    await expect(modal.getByText("Đã sao chép!")).toBeVisible();

    // Close modal
    const closeBtn = modal.getByRole("button", { name: "Đóng bảng dự báo" });
    await closeBtn.click();
    await expect(modal).not.toBeVisible();

    // 7. Verify Integration on /goals page
    await page.goto("/goals");
    await expect(page.getByText("Dự Báo & Mô Phỏng ĐRL Tốt Nghiệp Toàn Khóa")).toBeVisible();
    const openForecastGoalsBtn = page.getByRole("button", { name: "Mở dự báo" });
    await expect(openForecastGoalsBtn).toBeVisible();
    await openForecastGoalsBtn.click();

    await expect(page.locator('[data-testid="graduation-forecast-modal"]')).toBeVisible();
    await page.locator('[data-testid="graduation-forecast-modal"]').getByRole("button", { name: "Đóng bảng dự báo" }).click();
    await expect(page.locator('[data-testid="graduation-forecast-modal"]')).not.toBeVisible();
  });
});
