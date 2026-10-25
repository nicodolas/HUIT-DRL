import { test, expect } from "@playwright/test";

test.describe.serial("Browser UI & End-to-End User Experience", () => {
  let testUsername = "";
  const testPassword = "ValidPassword123!";
  const testFullName = "Sinh Viên UI Playwright";

  test.beforeAll(() => {
    testUsername = `ui_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  });

  test("Registration with live username check and Dashboard redirect", async ({ page }) => {
    // 1. Visit Register Page
    await page.goto("/register");
    await expect(page).toHaveTitle(/HUIT/i);
    await expect(page.locator("h1:has-text('Đăng ký tài khoản')")).toBeVisible();

    // 2. Test short username validation (triggers on < 3 chars)
    const usernameInput = page.locator('input[placeholder*="nguyenvana"]');
    await usernameInput.fill("ab");
    await expect(page.getByText("Tối thiểu 3 ký tự.", { exact: true })).toBeVisible({ timeout: 5000 });

    // 3. Test valid username availability check
    await usernameInput.fill(testUsername);
    await expect(page.getByText(/khả dụng/i)).toBeVisible({ timeout: 5000 });

    // 4. Fill form (both password fields & class)
    await page.locator('input[placeholder*="Tối thiểu 6 ký tự"]').fill(testPassword);
    await page.locator('input[placeholder*="Nhập lại mật khẩu"]').fill(testPassword);
    await page.locator('input[placeholder*="Nguyễn Văn"]').fill(testFullName);
    await page.locator('input[placeholder*="DHTH"]').fill("12DHTH01");

    // 5. Submit registration
    await page.click('button[type="submit"]');

    // 6. Assert redirect to Dashboard
    await page.waitForURL("/", { timeout: 15000 });
    await expect(page.locator("h1", { hasText: testFullName })).toBeVisible();
    await expect(page.locator("text=Cấu trúc điểm số")).toBeVisible();
    await expect(page.getByText("+60").first()).toBeVisible(); // Default baseline
  });

  test("Dashboard widgets: ScoreGauge, Criteria, and Form 01 Navigation", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.locator('input[placeholder*="tên đăng nhập"]').fill(testUsername);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // Assert ScoreGauge elements
    await expect(page.locator("text=Cấu trúc điểm số")).toBeVisible();
    await expect(page.getByText("+60").first()).toBeVisible();

    // Navigate to Report page
    await page.click("text=Xuất phiếu QĐ 3385");
    await page.waitForURL(/.*\/report/, { timeout: 15000 });

    // Assert Official HUIT Form 01 Elements
    await expect(page.locator("text=TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP.HCM").first()).toBeVisible();
    await expect(page.locator("text=PHIẾU TỰ ĐÁNH GIÁ KẾT QUẢ RÈN LUYỆN")).toBeVisible();
    await expect(page.getByText(testFullName).first()).toBeVisible();

    // Toggle Class Review Simulation
    await page.click("text=Mô phỏng Lớp xét");
    await expect(page.locator("text=Đang mô phỏng Lớp xét")).toBeVisible();

    // Test evidence URL QR code rendering
    const driveInput = page.locator('input[placeholder*="Google Drive"]');
    await driveInput.fill("https://drive.google.com/drive/folders/test_huit_proofs");
    await expect(page.locator("img[alt='QR Code Minh Chứng']")).toBeVisible();
  });

  test("Goals page: Scholarship Matrix updates dynamically with GPA input", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.locator('input[placeholder*="tên đăng nhập"]').fill(testUsername);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // Navigate to Goals page
    await page.goto("/goals");
    await expect(page.locator("text=Dự Phóng Học Bổng Khuyến Khích HUIT")).toBeVisible();

    // Change GPA to 3.8
    const gpaInput = page.locator('input[step="0.05"]');
    await gpaInput.fill("3.8");

    // Assert scholarship tier reflects the GPA checkmark
    await expect(page.locator("text=GPA ≥ 3.6")).toBeVisible();
  });
});
