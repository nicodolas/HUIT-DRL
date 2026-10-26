import { test, expect } from "@playwright/test";

test.describe("RBAC & UI Craft Refactor: Role Separation & Admin Semesters", () => {
  test.describe.configure({ mode: "serial" });
  const timestamp = Date.now();
  const studentUsername = `std_craft_${timestamp}`;
  const studentPassword = "Password123@";
  const studentFullName = `Lê Văn Học ${timestamp.toString().slice(-4)}`;
  const studentClass = "15DHTH05";

  test("1. Regular registered student strictly has role: 'user', clean UI without clutter, and no admin privileges", async ({
    page,
  }) => {
    // 1. Register a normal student
    await page.goto("/register");
    const usernameInput = page.locator('input[placeholder*="nguyenvana"]');
    await usernameInput.fill(studentUsername);
    await expect(page.getByText(/khả dụng/i)).toBeVisible({ timeout: 10000 });

    await page.locator('input[placeholder*="Tối thiểu 6 ký tự"]').fill(studentPassword);
    await page.locator('input[placeholder*="Nhập lại mật khẩu"]').fill(studentPassword);
    await page.locator('input[placeholder*="Nguyễn Văn"]').fill(studentFullName);
    await page.locator('input[placeholder*="DHTH"]').fill(studentClass);

    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // 2. Check UI Craft & Clean Greeting Header
    // Verify no broken text wrap - greeting is clean
    await expect(page.locator("h1")).toContainText(studentFullName);

    // Verify Admin buttons are NOT visible to normal student
    await expect(page.getByRole("button", { name: "Quản trị CVHT" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Họp lớp & Biên bản" })).not.toBeVisible();

    // Verify the primary action buttons exist cleanly
    await expect(page.getByRole("button", { name: /Ghi hoạt động|Ghi nhận điểm/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Minh chứng|Kho minh chứng/i })).toBeVisible();

    // Verify the "Tiện ích" dropdown exists and contains secondary tools
    const utilitiesDropdown = page.getByRole("button", { name: /Tiện ích/i }).first();
    await expect(utilitiesDropdown).toBeVisible();
    await utilitiesDropdown.click();

    // Check dropdown items (refined personal notebook utilities)
    await expect(page.getByRole("link", { name: "Xuất phiếu Mẫu số 01 (QĐ 3385)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dự báo tốt nghiệp (Điều 12)" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Chỉnh sửa hồ sơ cá nhân" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Xuất / Nhập bảng tính Excel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sao lưu dữ liệu cá nhân" })).toBeVisible();

    // Close dropdown
    await page.keyboard.press("Escape");

    // 3. Check Semester select - normal user should NOT see "+ Tạo học kỳ mới" option
    const semesterSelect = page.getByLabel("Chọn học kỳ rèn luyện");
    await expect(semesterSelect).toBeVisible();
    const studentOptions = await semesterSelect.locator("option").allTextContents();
    expect(studentOptions.some((opt) => opt.includes("+ Tạo học kỳ mới"))).toBe(false);

    // 4. Verify API security: regular student POST to /api/semesters gets 403 Forbidden
    const createSemesterRes = await page.request.post("/api/semesters", {
      data: {
        name: "Học kỳ Hack 99",
      },
    });
    expect(createSemesterRes.status()).toBe(403);
    const createSemesterJson = await createSemesterRes.json();
    expect(createSemesterJson.error).toContain("Quản trị viên (Admin");

    // Verify API security: regular student DELETE to /api/semesters gets 403 Forbidden
    const deleteSemesterRes = await page.request.delete("/api/semesters?id=dummy-id");
    expect(deleteSemesterRes.status()).toBe(403);
    const deleteSemesterJson = await deleteSemesterRes.json();
    expect(deleteSemesterJson.error).toContain("Quản trị viên (Admin");
  });

  test("2. Admin login, access Admin Hub, and create official university semester", async ({ page }) => {
    // 1. Login as Admin
    await page.goto("/login");
    await page.locator('input[placeholder*="tên đăng nhập"]').fill("admin");
    await page.locator('input[type="password"]').fill("AdminHuit2026@");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // 2. Verify Admin controls
    const adminHubBtn = page.getByRole("button", { name: "Quản trị CVHT" });
    await expect(adminHubBtn).toBeVisible();

    // 3. Open Admin Hub
    await adminHubBtn.click();
    const adminModal = page.locator('[data-testid="admin-hub-modal"]');
    await expect(adminModal).toBeVisible();
    await expect(adminModal.getByText("Trung Tâm Quản Trị & CVHT")).toBeVisible();
    await expect(adminModal.getByRole("button", { name: "Tạo học kỳ chính thức", exact: true })).toBeVisible();

    // 4. Admin creates a new official semester
    const newSemName = `Học kỳ Hè (${timestamp.toString().slice(-4)})`;
    const semesterNameInput = adminModal.locator('input[placeholder*="Học kỳ"]');
    await semesterNameInput.fill(newSemName);

    const submitBtn = adminModal.getByRole("button", { name: /Xác nhận tạo học kỳ chính thức|Khởi tạo học kỳ toàn trường/i });
    await submitBtn.click();

    // Verify success message
    await expect(adminModal.getByText(/Đã tạo học kỳ chính thức/i)).toBeVisible({ timeout: 10000 });

    // Close admin modal
    await adminModal.getByLabel("Đóng").click();

    // Verify newly created semester is in the semester select and Admin sees "+ Tạo học kỳ mới..."
    const semesterSelect = page.getByLabel("Chọn học kỳ rèn luyện");
    await expect(semesterSelect).toContainText(newSemName);
    await expect(semesterSelect).toContainText("+ Tạo học kỳ mới");
  });

  test("3. Regular student automatically inherits and syncs official semesters created by Admin", async ({ page }) => {
    // 1. Login back as the regular student
    await page.goto("/login");
    await page.locator('input[placeholder*="tên đăng nhập"]').fill(studentUsername);
    await page.locator('input[type="password"]').fill(studentPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // 2. Semester select should contain the newly created official semester
    const newSemName = `Học kỳ Hè (${timestamp.toString().slice(-4)})`;
    const semesterSelect = page.getByLabel("Chọn học kỳ rèn luyện");
    await expect(semesterSelect).toBeVisible();
    await expect(semesterSelect).toContainText(newSemName);
    const studentOptions = await semesterSelect.locator("option").allTextContents();

    // 3. Switch to that official semester
    const targetOption = studentOptions.find((opt) => opt.includes(newSemName));
    if (targetOption) {
      await semesterSelect.selectOption({ label: targetOption });
    }

    // Verify active semester chip updated in the greeting area
    await expect(page.locator("main")).toContainText(newSemName);
  });

  test.afterAll(async () => {
    try {
      const { db } = await import("../src/lib/db");
      const { semesters, drlRecords } = await import("../src/lib/db/schema");
      const { eq, like } = await import("drizzle-orm");
      
      const sems = await db.select({ id: semesters.id }).from(semesters).where(like(semesters.name, "Học kỳ Hè (%)"));
      if (sems.length > 0) {
        for (const s of sems) {
          await db.delete(drlRecords).where(eq(drlRecords.semesterId, s.id));
        }
        await db.delete(semesters).where(like(semesters.name, "Học kỳ Hè (%)"));
      }
    } catch (e) {
      // Ignore cleanup error
    }
  });
});
