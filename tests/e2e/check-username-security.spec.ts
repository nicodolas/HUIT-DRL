import { test, expect } from "@playwright/test";
import { registerTestUser, getValidTestCaptchaToken } from "./helpers/auth";

test.describe.serial("Check-Username Anti-DoS & Rate Limiting Security Suite", () => {
  const timestamp = Date.now();
  const existingUser = `testuser_${timestamp}`;

  test.beforeAll(async ({ request }) => {
    // Register one test user
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: existingUser,
        password: "ValidPassword123@",
        fullName: "Người Dùng Thử Nghiệm",
        className: "12DHTH01",
        faculty: "Công nghệ Thông tin",
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(regRes.status()).toBe(200);
  });

  test("1. Available check: Random non-existent username returns available: true", async ({ request }) => {
    const randomUser = `fresh_${Date.now()}`;
    const res = await request.get(`/api/auth/check-username?username=${randomUser}`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.available).toBe(true);
    expect(data.valid).toBe(true);
    expect(data.message).toContain("khả dụng");
  });

  test("2. Taken check: Existing username returns available: false", async ({ request }) => {
    const res = await request.get(`/api/auth/check-username?username=${existingUser}`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.available).toBe(false);
    expect(data.valid).toBe(true);
    expect(data.message).toContain("đã được sử dụng");
  });

  test("3. Validation check: Invalid format or length < 3 rejected without querying DB", async ({ request }) => {
    const shortRes = await request.get("/api/auth/check-username?username=ab");
    const shortData = await shortRes.json();
    expect(shortData.available).toBe(false);
    expect(shortData.valid).toBe(false);

    const specialCharRes = await request.get("/api/auth/check-username?username=user@!#$");
    const specialData = await specialCharRes.json();
    expect(specialData.available).toBe(false);
    expect(specialData.valid).toBe(false);
  });

  test("4. Anti-DoS Rate Limiting: Rapid requests exceed 45/min threshold and trigger 429 Too Many Requests", async ({ request }) => {
    // Send 50 requests with a custom simulated IP to test rate limiter
    const spoofedIp = `198.51.100.${timestamp.toString().slice(-2)}`;
    let got429 = false;

    for (let i = 0; i < 50; i++) {
      const res = await request.get(`/api/auth/check-username?username=scan_${i}`, {
        headers: {
          "x-forwarded-for": spoofedIp,
        },
      });

      if (res.status() === 429) {
        got429 = true;
        const data = await res.json();
        expect(data.rateLimited).toBe(true);
        expect(res.headers()["retry-after"]).toBeTruthy();
        break;
      }
    }

    expect(got429).toBe(true);
  });

  test("5. UI Live Check: Typing username in /register shows debounced check result", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    const usernameInput = page.locator('input[placeholder*="nguyenvana"]');
    await expect(usernameInput).toBeVisible();

    // Type the existing username
    await usernameInput.fill(existingUser);

    // Wait for debounced response
    const statusMsg = page.locator("text=/Tên đăng nhập này đã được sử dụng/i");
    await expect(statusMsg).toBeVisible({ timeout: 5000 });

    // Type another unique username
    const brandNewUser = `new_student_${Date.now()}`;
    await usernameInput.fill(brandNewUser);

    const availableMsg = page.locator("text=/Tên đăng nhập hợp lệ và khả dụng/i");
    await expect(availableMsg).toBeVisible({ timeout: 5000 });
  });
});
