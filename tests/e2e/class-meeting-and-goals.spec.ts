import { test, expect } from "@playwright/test";

test.describe("Phase 15: Class Meeting Minutes & Goal Tracker", () => {
  const timestamp = Date.now();
  const testUsername = `user_meet_${timestamp}`;
  const testPassword = "Password123@";
  const testFullName = `Lớp Trưởng ${timestamp.toString().slice(-4)}`;
  const testClass = "14DHTH08";

  test("should track goals and generate official class meeting minutes", async ({ page }) => {
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

    // 2. Verify Goal Tracker Card
    const goalTitle = page.getByText("Mục tiêu & Kế hoạch rèn luyện");
    await expect(goalTitle).toBeVisible({ timeout: 10000 });

    // Click "Đổi mục tiêu"
    const changeGoalBtn = page.getByRole("button", { name: "Đổi mục tiêu" });
    await changeGoalBtn.click();

    // Select "Tốt (80đ)"
    const totBtn = page.getByRole("button", { name: /Tốt \(80đ\)/ });
    await expect(totBtn).toBeVisible();
    await totBtn.click();

    // Verify target updated
    await expect(page.getByText("Mục tiêu: 80 điểm")).toBeVisible();

    // 3. Open Class Meeting & Minutes Modal (available in Tiện ích khác for Class Monitors / Ban cán sự)
    const utilitiesDropdown = page.getByRole("button", { name: "Tiện ích khác" });
    await expect(utilitiesDropdown).toBeVisible({ timeout: 10000 });
    await utilitiesDropdown.click();
    const classMeetingBtn = page.getByRole("button", { name: "Họp lớp & Biên bản" });
    await expect(classMeetingBtn).toBeVisible();
    await classMeetingBtn.click();

    // Verify Modal Header
    const modalHeader = page.getByText("Ban Cán Sự: Họp Lớp & Biên Bản ĐRL (Điều 9-10)");
    await expect(modalHeader).toBeVisible();

    // 4. Test Roster Tab
    await expect(page.getByRole("cell", { name: testFullName })).toBeVisible();

    // Add a new student
    const addStudentBtn = page.getByRole("button", { name: "Thêm Sinh Viên" });
    await addStudentBtn.click();
    await expect(page.getByRole("cell", { name: /Sinh viên mới/ }).first()).toBeVisible();

    // Toggle Discipline
    const disciplineBtn = page.locator("button:has-text('+ Kỷ luật')").first();
    if (await disciplineBtn.isVisible()) {
      await disciplineBtn.click();
      await expect(page.locator("button:has-text('⚠ Kỷ luật')").first()).toBeVisible();
    }

    // 5. Test Statistics Tab
    const statsTabBtn = page.getByRole("button", { name: "Thống Kê Phân Loại" });
    await statsTabBtn.click();

    await expect(page.getByText("Cơ cấu Xếp loại Điểm Rèn Luyện Lớp")).toBeVisible();
    await expect(page.getByText("Sĩ số lớp")).toBeVisible();
    await expect(page.getByText("Tham gia họp")).toBeVisible();

    // 6. Test Official Minutes Tab (Mẫu A4)
    const minutesTabBtn = page.getByRole("button", { name: "Biên Bản Họp Lớp (Mẫu A4)" });
    await minutesTabBtn.click();

    await expect(page.getByRole("heading", { name: "BIÊN BẢN HỌP ĐÁNH GIÁ ĐIỂM RÈN LUYỆN" })).toBeVisible();
    await expect(page.getByText("BÍ THƯ CHI ĐOÀN", { exact: true })).toBeVisible();
    await expect(page.getByText("LỚP TRƯỞNG", { exact: true })).toBeVisible();
    await expect(page.getByText("CỐ VẤN HỌC TẬP", { exact: true })).toBeVisible();

    // Click "Sao chép"
    const copyBtn = page.getByRole("button", { name: "Sao chép" });
    await copyBtn.click();
    await expect(page.getByText("Đã chép!")).toBeVisible();

    // 7. Close modal
    const closeBtn = page.getByRole("button", { name: "Đóng" });
    await closeBtn.click();
    await expect(modalHeader).not.toBeVisible();
  });
});
