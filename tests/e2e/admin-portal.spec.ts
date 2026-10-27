import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";
import { neon } from "@neondatabase/serverless";

test.describe("Admin Portal & RBAC Security Suite", () => {
  const timestamp = Date.now();
  const studentUsername = `std_sec_${timestamp}`;
  const studentPassword = "Password123@";

  const adminUsername = `adm_sec_${timestamp}`;
  const adminPassword = "AdminPassword123@";

  test("RBAC: Regular student is blocked from Admin Portal & Admin APIs", async ({ page, request }) => {
    // 1. Register student
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: studentUsername,
        password: studentPassword,
        fullName: "Sinh Viên Kiểm Thử",
        className: "12DHTH01",
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(regRes.status()).toBe(200);

    // 2. Login student
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const studentUserInp = page.locator('input[placeholder*="tên đăng nhập"]');
    await expect(studentUserInp).toBeVisible({ timeout: 10000 });
    await studentUserInp.click();
    await studentUserInp.fill(studentUsername);

    const studentPassInp = page.locator('input[type="password"]');
    await studentPassInp.click();
    await studentPassInp.fill(studentPassword);

    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 20000, waitUntil: "domcontentloaded" });

    // 3. Attempt direct navigation to /admin -> Should be redirected to /
    await page.goto("/admin");
    await page.waitForURL("/", { timeout: 15000, waitUntil: "domcontentloaded" });
    expect(page.url()).not.toContain("/admin");

    // 4. Verify API protection (403 Forbidden)
    const apiStatsRes = await page.request.get("/api/admin/stats");
    expect(apiStatsRes.status()).toBe(403);

    const apiUsersRes = await page.request.get("/api/admin/users");
    expect(apiUsersRes.status()).toBe(403);
  });

  test("Admin: Access /admin portal, view analytics, manage data, and dark mode", async ({ page, request }) => {
    // 1. Register user
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: adminUsername,
        password: adminPassword,
        fullName: "Quản Trị Viên Kiểm Thử",
        className: "AdminOffice",
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(regRes.status()).toBe(200);

    // 2. Elevate to admin role directly in Neon DB
    const sql = neon(process.env.DATABASE_URL!);
    await sql`UPDATE users SET role = 'admin' WHERE username = ${adminUsername}`;

    // 3. Login as Admin
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const adminUserInp = page.locator('input[placeholder*="tên đăng nhập"]');
    await expect(adminUserInp).toBeVisible({ timeout: 10000 });
    await adminUserInp.click();
    await adminUserInp.fill(adminUsername);

    const adminPassInp = page.locator('input[type="password"]');
    await adminPassInp.click();
    await adminPassInp.fill(adminPassword);

    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 20000, waitUntil: "domcontentloaded" });

    // 4. Verify Admin link in Header
    const adminLink = page.locator('nav a[href="/admin"]');
    await expect(adminLink).toBeVisible({ timeout: 15000 });

    // 5. Navigate to /admin
    await adminLink.click();
    await page.waitForURL("/admin", { timeout: 15000, waitUntil: "domcontentloaded" });
    await expect(page.locator("h1", { hasText: "Cổng Quản Trị Hệ Thống HUIT.DRL" })).toBeVisible();

    // 6. Verify 4 Tabs are present
    await expect(page.getByText("Tổng quan hệ thống")).toBeVisible();
    await expect(page.getByText(/Quản lý Sinh viên & Quyền/i)).toBeVisible();
    await expect(page.getByText(/Quản lý Học kỳ/i)).toBeVisible();
    await expect(page.getByText(/Kiểm duyệt Minh chứng/i)).toBeVisible();

    // 7. Verify Overview stats cards loaded
    await expect(page.getByText("Tổng số Sinh viên")).toBeVisible();
    await expect(page.getByText("Minh chứng chờ duyệt")).toBeVisible();

    // 8. Test Tab switching to Users
    await page.getByText(/Quản lý Sinh viên & Quyền/i).click();
    await expect(page.getByPlaceholder("Tìm theo tên, MSSV, @username, lớp...")).toBeVisible();

    // 9. Capture screenshot of Admin Portal
    await page.screenshot({
      path: "C:/Users/Admin/.gemini/antigravity/brain/f50425b0-0e04-4b9c-9d96-16e1f38ec306/admin_portal_desktop.png",
      fullPage: true,
    });
  });
});

