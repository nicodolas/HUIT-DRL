import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";

test.describe.serial("Security Hardening & Profile Editing Suite (CWE-915 Anti-Privilege Escalation)", () => {
  const timestamp = Date.now();
  const testUsername = `user_prof_${timestamp}`;
  const testPassword = "ValidPassword123@";
  const initialFullName = `Sinh Viên Thử Nghiệm ${timestamp.toString().slice(-4)}`;
  const initialClass = "12DHTH01";
  const initialFaculty = "Công nghệ Thông tin";
  let authToken = "";

  test("1. Profile Edit: User can update permissible fields (fullName, faculty, className) via API", async ({
    request,
  }) => {
    // 1. Register student with valid test captcha
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: testUsername,
        password: testPassword,
        fullName: initialFullName,
        className: initialClass,
        faculty: initialFaculty,
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(regRes.status()).toBe(200);
    const regData = await regRes.json();
    authToken = regData.token;
    expect(authToken).toBeTruthy();

    const authHeader = { Authorization: `Bearer ${authToken}` };

    // 2. Perform legitimate PATCH to update fullName, faculty, className
    const updatedName = "Nguyễn Hoàng Minh Khang";
    const updatedFaculty = "Công nghệ Thực phẩm";
    const updatedClass = "14DHTP02";

    const patchRes = await request.patch("/api/auth/me", {
      headers: authHeader,
      data: {
        fullName: updatedName,
        faculty: updatedFaculty,
        className: updatedClass,
      },
    });

    expect(patchRes.status()).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.success).toBe(true);
    expect(patchData.user.fullName).toBe(updatedName);
    expect(patchData.user.faculty).toBe(updatedFaculty);
    expect(patchData.user.className).toBe(updatedClass);
    expect(patchData.user.role).toBe("user"); // Must remain regular user

    // 3. Verify via GET /api/auth/me
    const getRes = await request.get("/api/auth/me", { headers: authHeader });
    expect(getRes.status()).toBe(200);
    const getData = await getRes.json();
    expect(getData.user.fullName).toBe(updatedName);
    expect(getData.user.faculty).toBe(updatedFaculty);
    expect(getData.user.className).toBe(updatedClass);
    expect(getData.user.username).toBe(testUsername);
    expect(getData.user.role).toBe("user");
  });

  test("2. ANTI-TAMPERING: Forged request passing role='admin' is strictly rejected with 403 Forbidden", async ({
    request,
  }) => {
    const authHeader = { Authorization: `Bearer ${authToken}` };

    // Attempt Privilege Escalation via role: 'admin'
    const hackRes = await request.patch("/api/auth/me", {
      headers: authHeader,
      data: {
        fullName: "Hacker User",
        role: "admin",
      },
    });

    expect(hackRes.status()).toBe(403);
    const hackData = await hackRes.json();
    expect(hackData.error).toContain("vai trò");

    // Verify role in DB has NOT escalated to admin
    const verifyRes = await request.get("/api/auth/me", { headers: authHeader });
    const verifyData = await verifyRes.json();
    expect(verifyData.user.role).toBe("user");
    expect(verifyData.user.fullName).not.toBe("Hacker User");
  });

  test("3. ANTI-TAMPERING: Forged request passing isAdmin=true is strictly rejected with 403 Forbidden", async ({
    request,
  }) => {
    const authHeader = { Authorization: `Bearer ${authToken}` };

    // Attempt privilege elevation via isAdmin flag
    const hackRes = await request.patch("/api/auth/me", {
      headers: authHeader,
      data: {
        isAdmin: true,
      },
    });

    expect(hackRes.status()).toBe(403);
    const verifyRes = await request.get("/api/auth/me", { headers: authHeader });
    const verifyData = await verifyRes.json();
    expect(verifyData.user.role).toBe("user");
  });

  test("4. IMMUTABILITY: Attempt to alter username via API is rejected with 400 Bad Request", async ({
    request,
  }) => {
    const authHeader = { Authorization: `Bearer ${authToken}` };

    // Attempt to rename username
    const hackRes = await request.patch("/api/auth/me", {
      headers: authHeader,
      data: {
        username: "super_admin_hacker",
      },
    });

    expect(hackRes.status()).toBe(400);
    const hackData = await hackRes.json();
    expect(hackData.error).toContain("Tên đăng nhập");

    // Verify username remained untouched
    const verifyRes = await request.get("/api/auth/me", { headers: authHeader });
    const verifyData = await verifyRes.json();
    expect(verifyData.user.username).toBe(testUsername);
  });

  test("5. IMMUTABILITY: Attempt to alter user ID via API is rejected with 400 Bad Request", async ({
    request,
  }) => {
    const authHeader = { Authorization: `Bearer ${authToken}` };

    const hackRes = await request.patch("/api/auth/me", {
      headers: authHeader,
      data: {
        id: "arbitrary-forged-id-12345",
      },
    });

    expect(hackRes.status()).toBe(400);
    const hackData = await hackRes.json();
    expect(hackData.error).toContain("định danh");
  });

  test("6. UI Verification: User navigates to /profile, edits info while username remains locked and disabled", async ({
    page,
  }) => {
    // 1. Login
    await page.goto("/login");
    await page.fill('input[placeholder*="tên đăng nhập"]', testUsername);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // 2. Navigate to Profile page
    await page.goto("/profile");
    await expect(page.locator("h1", { hasText: "Tài khoản cá nhân" })).toBeVisible();

    // 3. Click 'Chỉnh sửa hồ sơ'
    const editBtn = page.getByRole("button", { name: /Chỉnh sửa hồ sơ/i });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // 4. Verify username input is strictly disabled and readOnly
    const usernameInput = page.locator(`input[value="@${testUsername}"]`);
    await expect(usernameInput).toBeVisible();
    await expect(usernameInput).toBeDisabled();

    // 5. Fill new name and class
    const newDisplayName = "Trịnh Trần Phương Tuấn";
    const newClass = "15DHTH09";

    const nameInput = page.locator('input[placeholder*="Nguyễn Văn An"]');
    await nameInput.fill(newDisplayName);

    const classInput = page.locator('input[placeholder*="13DHTH03"]');
    await classInput.fill(newClass);

    // 6. Submit form
    const saveBtn = page.getByRole("button", { name: "Lưu thay đổi" });
    await saveBtn.click();

    // 7. Verify success toast and updated display
    await expect(page.getByText("Cập nhật thông tin hồ sơ thành công!")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("h2", { hasText: newDisplayName })).toBeVisible();
    await expect(page.getByText(newClass)).toBeVisible();
  });

  test("7. StudentId / MSSV: Optional field can be updated on /profile and auto-fills into /report with inline edit", async ({
    page,
    request,
  }) => {
    const authHeader = { Authorization: `Bearer ${authToken}` };
    const customMssv = "2001210999";

    // 1. Update studentId via API
    const patchRes = await request.patch("/api/auth/me", {
      headers: authHeader,
      data: { studentId: customMssv },
    });
    expect(patchRes.status()).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.user.studentId).toBe(customMssv);

    // 2. Login to UI
    await page.goto("/login");
    await page.fill('input[placeholder*="tên đăng nhập"]', testUsername);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // 3. Check /profile reflects custom MSSV
    await page.goto("/profile");
    await expect(page.getByText(`MSSV: ${customMssv}`)).toBeVisible();
    await expect(page.getByText(customMssv, { exact: true })).toBeVisible();

    // 4. Navigate to /report and verify MSSV auto-fills
    await page.goto("/report");
    await expect(page.getByText(customMssv, { exact: true })).toBeVisible();

    // 5. Test inline edit on /report directly
    const editMssvBtn = page.getByRole("button", { name: "Sửa MSSV" });
    await expect(editMssvBtn).toBeVisible();
    await editMssvBtn.click();

    const inlineInput = page.locator('input[placeholder="Ví dụ: 2001210123"]');
    await expect(inlineInput).toBeVisible();
    await inlineInput.fill("2001210888");

    // Click "Lưu"
    const saveInlineBtn = page.getByRole("button", { name: "Lưu", exact: true });
    await saveInlineBtn.click();

    // Verify updated MSSV on /report
    await expect(page.getByText("2001210888", { exact: true })).toBeVisible();
  });
});

