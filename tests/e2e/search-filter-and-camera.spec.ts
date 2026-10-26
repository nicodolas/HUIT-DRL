import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";

test.describe.serial("Search, Filter, Camera Capture & Thumbnail Preview Suite", () => {
  const timestamp = Date.now();
  const testUsername = `user_sf_${timestamp}`;
  const testPassword = "Password123@";
  const testFullName = `Nguyễn Tìm Kiếm ${timestamp.toString().slice(-4)}`;
  const testClass = "14DHTH09";
  let authToken = "";

  test.beforeAll(async ({ request }) => {
    // Register test user reliably via API
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: testUsername,
        password: testPassword,
        fullName: testFullName,
        className: testClass,
        faculty: "Công nghệ Thông tin",
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(regRes.status()).toBe(200);
    const data = await regRes.json();
    authToken = data.token;
    expect(authToken).toBeTruthy();
  });

  async function loginUser(page: any) {
    await page.goto("/login");
    await page.fill('input[placeholder*="tên đăng nhập"]', testUsername);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });
  }

  test("1. Streamlined toolbar, Camera Capture, Gallery Upload, and Thumbnail Preview in Modal", async ({ page }) => {
    await loginUser(page);

    // Navigate to Records page
    await page.goto("/records");
    await page.waitForURL(/.*\/records/, { timeout: 15000 });

    // Verify streamlined toolbar on /records
    const primaryAddBtn = page.getByRole("button", { name: "Ghi nhận mục mới" });
    await expect(primaryAddBtn).toBeVisible();

    const dossierBtn = page.getByRole("button", { name: "Hồ sơ ngoại khóa" });
    await expect(dossierBtn).toBeVisible();

    const utilitiesBtn = page.getByRole("button", { name: "Tiện ích" });
    await expect(utilitiesBtn).toBeVisible();

    // Open Utilities dropdown and check items
    await utilitiesBtn.click();
    await expect(page.getByText("Kiểm tra hồ sơ")).toBeVisible();
    await expect(page.getByText("Xuất phiếu QĐ 3385")).toBeVisible();
    await expect(page.getByText("Xuất / Nhập Excel CSV")).toBeVisible();

    // Close utilities dropdown by toggling it
    await utilitiesBtn.click();
    await expect(page.getByText("Kiểm tra hồ sơ")).not.toBeVisible();

    // Open Add Record Modal
    await primaryAddBtn.click();
    const modalHeading = page.getByRole("heading", { name: "Ghi nhận điểm rèn luyện", exact: true });
    await expect(modalHeading).toBeVisible();

    // Verify Camera & Gallery Upload buttons & attributes
    const cameraBtn = page.getByRole("button", { name: "Chụp Camera" });
    const galleryBtn = page.getByRole("button", { name: "Chọn từ thư viện" });
    await expect(cameraBtn).toBeVisible();
    await expect(galleryBtn).toBeVisible();

    const cameraInput = page.locator('input[data-testid="camera-input"]');
    await expect(cameraInput).toHaveAttribute("capture", "environment");
    await expect(cameraInput).toHaveAttribute("accept", "image/*");

    const galleryInput = page.locator('input[data-testid="gallery-input"]');
    await expect(galleryInput).toHaveAttribute("accept", "image/*");

    // Test Image Upload & Thumbnail Preview
    const sampleImageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    await galleryInput.setInputFiles({
      name: "test-chung-chi.png",
      mimeType: "image/png",
      buffer: sampleImageBuffer,
    });

    // Verify Thumbnail Preview Card appears
    const previewImg = page.locator('img[alt="Xem trước ảnh minh chứng"]');
    await expect(previewImg).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Ảnh minh chứng sẵn sàng")).toBeVisible();
    await expect(page.getByRole("button", { name: "Thay ảnh" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Gỡ ảnh" })).toBeVisible();

    // Test "Gỡ ảnh"
    await page.getByRole("button", { name: "Gỡ ảnh" }).click();
    await expect(previewImg).toHaveCount(0);

    // Re-attach image via gallery input
    await galleryInput.setInputFiles({
      name: "test-chung-chi.png",
      mimeType: "image/png",
      buffer: sampleImageBuffer,
    });
    await expect(previewImg).toBeVisible({ timeout: 10000 });

    // Switch to Custom Entry
    await page.getByRole("button", { name: "Tự nhập mục riêng" }).click();
    await page.fill('input[placeholder*="ngày hội việc làm"]', "Hoạt động Chụp ảnh Hội trại 2026");
    await page.fill('input[placeholder*="+4 hoặc -5"]', "5.0");
    await page.fill('input[placeholder*="Hội trường A"]', "Đã nộp minh chứng giấy khen");

    // Save record 1
    const submitBtn = page.getByRole("button", { name: "Xác nhận", exact: true });
    await submitBtn.click();
    await expect(page.getByText("Hoạt động Chụp ảnh Hội trại 2026")).toBeVisible({ timeout: 10000 });

    // Add Record 2 (Penalties, no image)
    await primaryAddBtn.click();
    await expect(modalHeading).toBeVisible();
    await page.getByRole("button", { name: "Tự nhập mục riêng" }).click();
    await page.locator("select").filter({ hasText: /TC 1/ }).selectOption("1");
    await page.fill('input[placeholder*="ngày hội việc làm"]', "Bị trừ điểm không đeo thẻ");
    await page.fill('input[placeholder*="+4 hoặc -5"]', "-2.0");
    await page.fill('input[placeholder*="Hội trường A"]', "Vi phạm cổng trường sáng thứ hai");
    await submitBtn.click();
    await expect(page.getByText("Bị trừ điểm không đeo thẻ")).toBeVisible({ timeout: 10000 });
  });

  test("2. Sổ điểm Search, Category Filter with counts, Status Filter, and 1-Touch Empty State Reset", async ({ page }) => {
    await loginUser(page);

    await page.goto("/records");
    await page.waitForURL(/.*\/records/, { timeout: 15000 });

    // Wait for initial records to finish loading
    await expect(page.getByText("Hoạt động Chụp ảnh Hội trại 2026")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Bị trừ điểm không đeo thẻ")).toBeVisible({ timeout: 10000 });

    // 1. Verify Category Pills with Counts
    const allCatBtn = page.getByRole("button", { name: /Tất cả \(\d+\)/ });
    await expect(allCatBtn).toBeVisible();

    const tc3Btn = page.getByRole("button", { name: /TC3/ }).first();
    await expect(tc3Btn).toBeVisible();
    await tc3Btn.click();
    await expect(page.getByText("Hoạt động Chụp ảnh Hội trại 2026")).toBeVisible();
    await expect(page.getByText("Bị trừ điểm không đeo thẻ")).toHaveCount(0);

    // Reset back to Tất cả
    await allCatBtn.click();
    await expect(page.getByText("Hoạt động Chụp ảnh Hội trại 2026")).toBeVisible();
    await expect(page.getByText("Bị trừ điểm không đeo thẻ")).toBeVisible();

    // 2. Status Filter Testing
    const statusSelect = page.locator('select[aria-label="Bộ lọc trạng thái"]');
    await expect(statusSelect).toBeVisible();

    // Filter "Cộng điểm"
    await statusSelect.selectOption({ label: "Cộng điểm" });
    await expect(page.getByText("Hoạt động Chụp ảnh Hội trại 2026")).toBeVisible();
    await expect(page.getByText("Bị trừ điểm không đeo thẻ")).toHaveCount(0);

    // Filter "Điểm trừ"
    await statusSelect.selectOption({ label: "Điểm trừ" });
    await expect(page.getByText("Bị trừ điểm không đeo thẻ")).toBeVisible();
    await expect(page.getByText("Hoạt động Chụp ảnh Hội trại 2026")).toHaveCount(0);

    // Filter "Có minh chứng"
    await statusSelect.selectOption({ label: "Có minh chứng" });
    await expect(page.getByText("Hoạt động Chụp ảnh Hội trại 2026")).toBeVisible();
    await expect(page.getByText("Bị trừ điểm không đeo thẻ")).toHaveCount(0);

    // Filter "Thiếu minh chứng"
    await statusSelect.selectOption({ label: "Thiếu minh chứng" });
    await expect(page.getByText("Bị trừ điểm không đeo thẻ")).toBeVisible();
    await expect(page.getByText("Hoạt động Chụp ảnh Hội trại 2026")).toHaveCount(0);

    // Reset status filter back to "Tất cả"
    await statusSelect.selectOption({ label: "Tất cả" });

    // 3. Search Bar Testing
    const searchInput = page.locator('input[placeholder*="Tìm kiếm theo tên"]');
    await expect(searchInput).toBeVisible();

    // Search by title
    await searchInput.fill("Hội trại");
    await expect(page.getByText("Hoạt động Chụp ảnh Hội trại 2026")).toBeVisible();
    await expect(page.getByText("Bị trừ điểm không đeo thẻ")).toHaveCount(0);

    // Search by note content
    await searchInput.fill("cổng trường");
    await expect(page.getByText("Bị trừ điểm không đeo thẻ")).toBeVisible();
    await expect(page.getByText("Hoạt động Chụp ảnh Hội trại 2026")).toHaveCount(0);

    // Search by unaccented Vietnamese (tiếng Việt không dấu)
    await searchInput.fill("hoi trai");
    await expect(page.getByText("Hoạt động Chụp ảnh Hội trại 2026")).toBeVisible();
    await expect(page.getByText("Bị trừ điểm không đeo thẻ")).toHaveCount(0);

    // Search by Vietnamese date format (DD/MM)
    const today = new Date();
    const dayStr = String(today.getDate()).padStart(2, "0");
    const monthStr = String(today.getMonth() + 1).padStart(2, "0");
    await searchInput.fill(`${dayStr}/${monthStr}`);
    await expect(page.getByText("Hoạt động Chụp ảnh Hội trại 2026")).toBeVisible();
    await expect(page.getByText("Bị trừ điểm không đeo thẻ")).toBeVisible();

    // Test clear button inside search input
    const clearSearchBtn = page.locator('button[aria-label="Xóa từ khóa tìm kiếm"]');
    await expect(clearSearchBtn).toBeVisible();
    await clearSearchBtn.click();
    await expect(searchInput).toHaveValue("");

    // 4. Friendly Empty State & 1-Touch Reset
    const nonExistentQuery = "hoatdongkhongtontai_999";
    await searchInput.fill(nonExistentQuery);

    const emptyMsg = page.getByText(`Không tìm thấy hoạt động nào phù hợp với từ khóa '${nonExistentQuery}'`);
    await expect(emptyMsg).toBeVisible();

    const resetBtn = page.getByRole("button", { name: "Xóa bộ lọc" });
    await expect(resetBtn).toBeVisible();

    // Click 1-touch reset
    await resetBtn.click();

    // Assert both records reappear and search input is cleared
    await expect(page.getByText("Hoạt động Chụp ảnh Hội trại 2026")).toBeVisible();
    await expect(page.getByText("Bị trừ điểm không đeo thẻ")).toBeVisible();
    await expect(searchInput).toHaveValue("");
  });
});
