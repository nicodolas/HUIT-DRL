import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";
import { neon } from "@neondatabase/serverless";

test.describe("Admin Public Semesters & Strict User Isolation Suite", () => {
  const timestamp = Date.now();
  const studentUser = `std_sem_${timestamp}`;
  const studentPass = "Password123@";

  const adminUser = `adm_sem_${timestamp}`;
  const adminPass = "AdminPassword123@";

  test("Lifecycle: Admin creates public semester, user cannot create, admin can delete reliably", async ({ page, request }) => {
    // 1. Register student
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: studentUser,
        password: studentPass,
        fullName: "Sinh Viên Thử Nghiệm",
        className: "12DHTH01",
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(regRes.status()).toBe(200);

    // 2. Student attempts to create a custom semester via POST /api/semesters -> MUST BE 403 FORBIDDEN
    const studentCreateRes = await request.post("/api/semesters", {
      data: {
        name: `Học kỳ lậu của sinh viên ${timestamp}`,
        targetScore: 95,
      },
    });
    expect(studentCreateRes.status()).toBe(403);

    // 3. Register and elevate Admin
    const regAdmRes = await request.post("/api/auth/register", {
      data: {
        username: adminUser,
        password: adminPass,
        fullName: "Ban Quản Trị Hệ Thống",
        className: "AdminOffice",
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(regAdmRes.status()).toBe(200);

    const sql = neon(process.env.DATABASE_URL!);
    await sql`UPDATE users SET role = 'admin' WHERE username = ${adminUser}`;

    // 4. Admin logs in
    await page.goto("/login");
    await page.fill('input[placeholder*="tên đăng nhập"]', adminUser);
    await page.fill('input[type="password"]', adminPass);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // 5. Navigate to Admin Semesters Management tab directly
    await page.goto("/admin?tab=semesters");
    await page.waitForURL("/admin?tab=semesters", { timeout: 10000 });
    await expect(page.locator("h2", { hasText: "Danh sách học kỳ trong toàn bộ hệ thống" })).toBeVisible();

    // 6. Admin creates a new public official semester
    const officialSemName = `Học kỳ Niên Giám (Admin ${timestamp.toString().slice(-4)})`;
    await page.click('button:has-text("Tạo học kỳ hệ thống")');
    await page.fill('input[placeholder*="Ví dụ: Học kỳ 1"]', officialSemName);
    await page.click('button[type="submit"]:has-text("Tạo học kỳ")');

    // Verify it appears in the table
    await expect(page.locator("td", { hasText: officialSemName })).toBeVisible({ timeout: 10000 });

    // 7. Admin deletes the test semester cleanly
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    const deleteBtn = page.locator(`tr:has-text("${officialSemName}") button[title="Xóa học kỳ này"]`);
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Verify it is removed and success message appears
    await expect(page.locator("text=thành công")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("td", { hasText: officialSemName })).not.toBeVisible();
  });
});
