import { test, expect } from "@playwright/test";

test.describe("Phase 19: Proof Vault & Printable A4 Contact Sheet Suite", () => {
  const timestamp = Date.now();
  const testUsername = `user_vault_${timestamp}`;
  const testPassword = "Password123@";
  const testFullName = `Phạm Minh Chứng ${timestamp.toString().slice(-4)}`;
  const testClass = "13DHTH09";

  test("should manage evidence gallery, filter missing proof, and render printable contact sheet", async ({ page }) => {
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

    // 2. Add an activity with image evidence
    const addBtn = page.getByRole("button", { name: "Ghi nhận điểm" });
    await addBtn.click();

    const customTab = page.getByRole("button", { name: "Tự nhập mục riêng" });
    await customTab.click();

    await page.fill('input[placeholder*="ngày hội việc làm"]', "Chứng chỉ Ngoại ngữ B1 HUIT");
    await page.fill('input[placeholder*="+4 hoặc -5"]', "5.0");
    await page.fill('input[placeholder*="drive.google.com"]', "https://drive.google.com/file/d/sample-cert-huit/view");

    const saveRecordBtn = page.getByRole("button", { name: "Xác nhận", exact: true });
    await saveRecordBtn.click();

    await expect(page.getByText("Chứng chỉ Ngoại ngữ B1 HUIT")).toBeVisible({ timeout: 10000 });

    // 3. Add another activity without evidence
    await addBtn.click();
    await customTab.click();

    await page.fill('input[placeholder*="ngày hội việc làm"]', "Tham gia phong trào thể thao HUIT");
    await page.fill('input[placeholder*="+4 hoặc -5"]', "3.0");
    await saveRecordBtn.click();

    await expect(page.getByText("Tham gia phong trào thể thao HUIT")).toBeVisible({ timeout: 10000 });

    // 4. Open Proof Vault Modal
    const vaultBtn = page.getByRole("button", { name: "Kho minh chứng" });
    await expect(vaultBtn).toBeVisible();
    await vaultBtn.click();

    // Verify Modal Header & Stats
    const modalHeader = page.getByText("Kho Minh Chứng Rèn Luyện & Bảng Đính Kèm A4");
    await expect(modalHeader).toBeVisible();

    await expect(page.getByText("Đã có minh chứng")).toBeVisible();
    await expect(page.getByText("Còn thiếu minh chứng")).toBeVisible();

    // 5. Test Filters
    const hasProofFilterBtn = page.getByRole("button", { name: /Có ảnh/i });
    await hasProofFilterBtn.click();
    await expect(page.locator("h4", { hasText: "Chứng chỉ Ngoại ngữ B1 HUIT" })).toBeVisible();

    const missingProofFilterBtn = page.getByRole("button", { name: /^Thiếu/ });
    await missingProofFilterBtn.click();
    await expect(page.locator("h4", { hasText: "Tham gia phong trào thể thao HUIT" })).toBeVisible();

    // 6. Test Printable Contact Sheet Tab
    const contactSheetTab = page.getByRole("button", { name: "Bảng Đính Kèm In A4 (Contact Sheet)" });
    await contactSheetTab.click();

    await expect(page.getByRole("heading", { name: "BẢNG ĐÍNH KÈM HÌNH ẢNH MINH CHỨNG ĐIỂM RÈN LUYỆN" })).toBeVisible();
    await expect(page.getByText("SINH VIÊN CAM KẾT")).toBeVisible();
    await expect(page.getByText("CỐ VẤN HỌC TẬP XÁC NHẬN")).toBeVisible();
    await expect(page.getByRole("button", { name: "In Bảng Minh Chứng A4" })).toBeVisible();

    // 7. Close Modal
    const closeBtn = page.getByRole("button", { name: "Đóng" });
    await closeBtn.click();
    await expect(modalHeader).not.toBeVisible();
  });
});
