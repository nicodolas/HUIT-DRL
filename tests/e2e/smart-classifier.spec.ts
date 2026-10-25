import { test, expect } from "@playwright/test";

test.describe("Phase 21: Smart Natural Language Activity Classifier & Regulation 3385 Auto-Tagger", () => {
  const timestamp = Date.now();
  const testUsername = `user_classifier_${timestamp}`;
  const testPassword = "Password123@";
  const testFullName = `Lê Phân Loại ${timestamp.toString().slice(-4)}`;
  const testClass = "15DHTH02";

  test("should auto-classify colloquial activities, suggest accurate QĐ 3385 criteria, and populate modal inputs", async ({ page }) => {
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

    // 2. Open Add Record Modal -> Custom Entry
    const addBtn = page.getByRole("button", { name: "Ghi nhận điểm" });
    await addBtn.click();

    const customTab = page.getByRole("button", { name: "Tự nhập mục riêng" });
    await customTab.click();

    const titleInput = page.locator('input[placeholder*="ngày hội việc làm"]');

    // 3. Test Activity 1: Mùa hè xanh (Volunteer -> TC3 +6đ)
    await titleInput.fill("Chiến dịch Mùa hè xanh HUIT 2026");

    const suggestionPill = page.locator('[data-testid="smart-classifier-suggestion"]');
    await expect(suggestionPill).toBeVisible({ timeout: 5000 });
    await expect(suggestionPill.getByText("TC3")).toBeVisible();
    await expect(suggestionPill.getByText("+6đ", { exact: true })).toBeVisible();
    await expect(suggestionPill.getByText(/chiến dịch tình nguyện lớn/i)).toBeVisible();

    // Click 'Áp dụng gợi ý'
    const applyBtn = suggestionPill.getByRole("button", { name: "Áp dụng gợi ý" });
    await applyBtn.click();

    // Verify points input has 6
    const pointsInput = page.locator('input[placeholder*="+4 hoặc -5"]');
    await expect(pointsInput).toHaveValue("6");

    // Save record
    const saveBtn = page.getByRole("button", { name: "Xác nhận", exact: true });
    await saveBtn.click();
    await expect(page.getByText("Chiến dịch Mùa hè xanh HUIT 2026")).toBeVisible({ timeout: 10000 });

    // 4. Test Activity 2: Infraction (Quên thẻ sinh viên -> TC1 -5đ)
    await addBtn.click();
    await customTab.click();

    await titleInput.fill("Bị nhắc nhở quên thẻ sinh viên");
    await expect(suggestionPill).toBeVisible({ timeout: 5000 });
    await expect(suggestionPill.getByText("TC1")).toBeVisible();
    await expect(suggestionPill.getByText("-5đ", { exact: true })).toBeVisible();

    await applyBtn.click();
    await expect(pointsInput).toHaveValue("-5");

    await saveBtn.click();
    await expect(page.getByText("Bị nhắc nhở quên thẻ sinh viên")).toBeVisible({ timeout: 10000 });

    // 5. Test Handbook Natural Language Classifier Banner
    await page.goto("/handbook");
    const handbookSearch = page.locator('input[placeholder*="khám sức khỏe"]');

    // Search 'hiến máu tình nguyện'
    await handbookSearch.fill("hiến máu tình nguyện");
    const handbookBanner = page.locator('[data-testid="handbook-classifier-banner"]');
    await expect(handbookBanner).toBeVisible({ timeout: 5000 });
    await expect(handbookBanner.getByText("TC3")).toBeVisible();
    await expect(handbookBanner.getByText("+5đ", { exact: true })).toBeVisible();
    await expect(handbookBanner.getByText(/Hội Chữ thập đỏ/i)).toBeVisible();

    // Search 'đề tài nckh eureka'
    await handbookSearch.fill("đề tài nckh eureka");
    await expect(handbookBanner.getByText("TC5")).toBeVisible();
    await expect(handbookBanner.getByText("+10đ", { exact: true })).toBeVisible();
    await expect(handbookBanner.getByText(/Nghiên cứu khoa học sinh viên/i)).toBeVisible();

    // Click 'Ghi nhận ngay' button on banner
    const recordNowBtn = handbookBanner.getByRole("button", { name: "Ghi nhận ngay" });
    await recordNowBtn.click();

    // Verify modal opens
    await expect(page.getByText("Ghi nhận điểm rèn luyện")).toBeVisible();
    await page.getByRole("button", { name: "Hủy", exact: true }).click();
  });
});
