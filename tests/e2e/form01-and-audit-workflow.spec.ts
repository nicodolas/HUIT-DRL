import { test, expect } from "@playwright/test";

test.describe.serial("Phase 27 & 28: Official HUIT Form 01 Standardized Sheet & Evidence Audit Workflow", () => {
  let testUsername = "";
  let testFullName = "";
  const testPassword = "Password123@";
  const testClass = "14DHTH08";

  test.beforeAll(() => {
    const timestamp = Date.now();
    testUsername = `user_form01_${timestamp}`;
    testFullName = `Đoàn Văn Kiểm Duyệt ${timestamp.toString().slice(-4)}`;
  });

  test("1. End-to-End Evidence Audit Workflow: status markers, safety index, and class monitor review", async ({ page, request }) => {
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

    // 2. Add activity with Google Drive proof
    const addBtn = page.getByRole("button", { name: "Ghi nhận điểm" });
    await addBtn.click();

    const customTab = page.getByRole("button", { name: "Tự nhập mục riêng" });
    await customTab.click();

    await page.fill('input[placeholder*="ngày hội việc làm"]', "Giải Nhì Hội thao bóng đá HUIT 2026");
    await page.fill('input[placeholder*="+4 hoặc -5"]', "4.0");
    await page.fill('input[placeholder*="drive.google.com"]', "https://drive.google.com/file/d/huit-sports-award/view");

    const saveRecordBtn = page.getByRole("button", { name: "Xác nhận", exact: true });
    await saveRecordBtn.click();

    await expect(page.getByText("Giải Nhì Hội thao bóng đá HUIT 2026")).toBeVisible({ timeout: 10000 });

    // Verify Audit Safety Bar rendered on dashboard
    await expect(page.getByText(/Chỉ số an toàn minh chứng/i)).toBeVisible();
    await expect(page.getByText(/Chờ duyệt: 1/i)).toBeVisible();

    // 3. Test quick inline audit review modal
    // Click on the status badge button "Chờ lớp duyệt"
    const pendingBadge = page.getByRole("button", { name: /Chờ lớp duyệt/i }).first();
    await expect(pendingBadge).toBeVisible();
    await pendingBadge.click();

    // The Quick Audit Status Modal should open
    await expect(page.getByText("Rà Soát Minh Chứng & Trạng Thái")).toBeVisible();

    // Switch status to "Hợp lệ"
    const validOption = page.locator("button", { hasText: "Hợp lệ" }).last();
    await validOption.click();

    // Enter review comment
    const commentInput = page.locator("textarea");
    await commentInput.fill("Đã đối soát minh chứng huy chương Hội thao, hợp lệ +4đ");

    // Click "Cập nhật trạng thái"
    const updateBtn = page.getByRole("button", { name: "Cập nhật trạng thái" });
    await updateBtn.click();

    // Verify badge updated to "Hợp lệ" and comment is displayed
    await expect(page.getByRole("button", { name: "Hợp lệ" }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Đã đối soát minh chứng huy chương Hội thao, hợp lệ +4đ")).toBeVisible();

    // 4. Test Filter buttons in RecordList
    const validFilterBtn = page.getByRole("button", { name: /^Hợp lệ \(\d+\)/i });
    await expect(validFilterBtn).toBeVisible();
    await validFilterBtn.click();
    await expect(page.getByText("Giải Nhì Hội thao bóng đá HUIT 2026")).toBeVisible();
  });

  test("2. Official Form 01 (QĐ 3385) Standardized Sheet, Detailed Criteria Breakdown, and JSON Backup", async ({ page }) => {
    // 1. Login with student registered in test 1
    await page.goto("/login");
    await page.locator('input[placeholder*="tên đăng nhập"]').fill(testUsername);
    await page.locator('input[placeholder*="mật khẩu"]').fill(testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // 2. Navigate to Form 01 Report Page
    const form01Link = page.getByRole("link", { name: /Xuất phiếu QĐ 3385/i });
    await expect(form01Link).toBeVisible();
    await form01Link.click();
    await page.waitForURL(/\/report/, { timeout: 10000 });

    // 3. Verify Official Institutional Header Elements
    await expect(page.getByText("BỘ CÔNG THƯƠNG").first()).toBeVisible();
    await expect(page.getByText("TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP.HCM").first()).toBeVisible();
    await expect(page.getByText("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM").first()).toBeVisible();
    await expect(page.getByText("Độc lập - Tự do - Hạnh phúc").first()).toBeVisible();

    // 4. Verify Official Form 01 Title & Decree 3385 Reference
    await expect(page.getByText("PHIẾU TỰ ĐÁNH GIÁ KẾT QUẢ RÈN LUYỆN")).toBeVisible();
    await expect(page.getByText(/QUYẾT ĐỊNH SỐ 3385\/QĐ-DCT/i).first()).toBeVisible();

    // 5. Verify Student Information Section
    await expect(page.getByText(testFullName).first()).toBeVisible();
    await expect(page.getByText(testClass).first()).toBeVisible();
    await expect(page.getByText("Đại học chính quy")).toBeVisible();

    // 6. Verify 3 Official Signature Blocks
    await expect(page.getByText("SINH VIÊN TỰ ĐÁNH GIÁ")).toBeVisible();
    await expect(page.getByText("BAN CÁN SỰ LỚP")).toBeVisible();
    await expect(page.getByText("CỐ VẤN HỌC TẬP")).toBeVisible();

    // 7. Toggle between Summary 5 Groups and Detailed Sub-criteria (65 criteria)
    const toggleCriteriaBtn = page.getByRole("button", { name: /Xem chi tiết tiểu mục/i });
    await expect(toggleCriteriaBtn).toBeVisible();
    await toggleCriteriaBtn.click();

    // In detailed view, verify official sub-item codes (1.1, 2.1, 3.1, etc.)
    await expect(page.getByRole("cell", { name: "1.1", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "2.1", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "3.1", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "4.1", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "5.1", exact: true })).toBeVisible();

    // Toggle back to summary view
    const toggleSummaryBtn = page.getByRole("button", { name: /Xem tóm tắt 5 tiêu chí/i });
    await expect(toggleSummaryBtn).toBeVisible();
    await toggleSummaryBtn.click();

    // 8. Test Simulated Class Review
    const simulateReviewBtn = page.getByRole("button", { name: /Mô phỏng Lớp xét/i });
    await expect(simulateReviewBtn).toBeVisible();
    await simulateReviewBtn.click();
    await expect(page.getByText("Đang mô phỏng Lớp xét")).toBeVisible();

    // 9. Test JSON Backup Export button
    const jsonExportBtn = page.getByRole("button", { name: /Sao lưu JSON/i });
    await expect(jsonExportBtn).toBeVisible();

    // Setup download event listener
    const downloadPromise = page.waitForEvent("download");
    await jsonExportBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(`HUIT_DRL_Form01_${testUsername}`);
  });

  test("3. Craft UI & Anti-AI-Slop Assurance: Zero robotic buzzwords and pristine typography", async ({ page }) => {
    await page.goto("/login");

    // Verify no robotic AI slogans or buzzwords on auth/landing
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("trí tuệ nhân tạo đột phá");
    expect(bodyText).not.toContain("siêu việt");
    expect(bodyText).not.toContain("ma thuật");

    // Login and check dashboard
    await page.locator('input[placeholder*="tên đăng nhập"]').fill(testUsername);
    await page.locator('input[placeholder*="mật khẩu"]').fill(testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });
    await expect(page.getByRole("button", { name: "Ghi nhận điểm" })).toBeVisible({ timeout: 10000 });

    const dashboardText = await page.textContent("body");
    expect(dashboardText).not.toContain("AI slop");
    expect(dashboardText).not.toContain("trợ lý siêu phàm");

    // Verify official academic terminology
    expect(dashboardText).toContain("QĐ 3385");
    expect(dashboardText).toContain("mặc định");
    expect(dashboardText).toContain("Sổ điểm");
  });
});
