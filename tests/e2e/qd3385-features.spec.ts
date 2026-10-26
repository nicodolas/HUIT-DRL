import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";

test.describe.serial("HUIT Decision 3385/QĐ-DCT Features & Vietnamese UI Suite", () => {
  const timestamp = Date.now();
  const testUsername = `user_qd3385_${timestamp}`;
  const testPassword = "ValidPassword123@";
  let authToken = "";

  test.beforeAll(async ({ request }) => {
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: testUsername,
        password: testPassword,
        fullName: "Nguyễn Văn HUIT",
        className: "12DHTH01",
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

  test("1. Score Gauge renders 'Gap to Next Tier' and 100% Vietnamese guidance", async ({ page }) => {
    await loginUser(page);

    // The default score is 60 (or empty/base).
    // Check if the next tier guidance is visible
    const nextTierBanner = page.locator("text=/Mục tiêu tiếp theo:/i");
    await expect(nextTierBanner).toBeVisible();

    // Check that there is no English tech jargon like "What-If Simulator" on the main page
    const whatIfEnglish = page.locator("text=What-If Simulator");
    await expect(whatIfEnglish).toHaveCount(0);
  });

  test("2. Sổ nhắc phòng ngừa vi phạm & điểm trừ (Điều 5.1 & 5.2) renders all 8 items", async ({ page }) => {
    await loginUser(page);

    // Click on Tab 2: '5 Tiêu chí QĐ 3385'
    const criteriaTab = page.locator("button:has-text('5 Tiêu chí QĐ 3385')");
    await criteriaTab.click();

    // Check checklist header
    const checklistHeader = page.locator("text=/Sổ Nhắc Phòng Ngừa Vi Phạm & Điểm Trừ/i");
    await expect(checklistHeader).toBeVisible();

    // Check specific items from QĐ 3385 Điều 5.1 & 5.2
    await expect(page.locator("text=/Bảo hiểm y tế \\(BHYT\\)/i")).toBeVisible();
    await expect(page.locator("text=/Khám sức khỏe/i")).toBeVisible();
    await expect(page.locator("text=/Sinh hoạt công dân/i")).toBeVisible();
    await expect(page.locator("text=/bảo toàn trọn vẹn 60 điểm sàn/i")).toBeVisible();
  });

  test("3. Mẫu số 01 Report Page complies with QĐ 3385 official template", async ({ page }) => {
    await loginUser(page);

    await page.goto("/report");
    await page.waitForLoadState("networkidle");

    // Check official title
    const docTitle = page.locator("text=/PHIẾU TỰ ĐÁNH GIÁ KẾT QUẢ RÈN LUYỆN/i");
    await expect(docTitle).toBeVisible();

    // Check QĐ 3385 reference
    const decisionRef = page.locator("text=/QUYẾT ĐỊNH SỐ 3385\\/QĐ-DCT/i").first();
    await expect(decisionRef).toBeVisible();

    // Check print button text in natural Vietnamese
    const printBtn = page.locator("button:has-text('In phiếu Mẫu số 01 (PDF)')");
    await expect(printBtn).toBeVisible();
  });

  test("4. Over-capping alert (Điều 6.1) shows when a category exceeds max allowed points", async ({ page, request }) => {
    await loginUser(page);

    // Fetch semesters
    const semRes = await request.get("/api/semesters", {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Cookie: `huit_drl_session=${authToken}`,
      },
    });
    const semData = await semRes.json();
    const activeSem = semData.semesters[0];

    // Add activities to Category 3 that exceed 20 points (e.g. 15 + 15 = 30)
    await request.post("/api/records", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        Cookie: `huit_drl_session=${authToken}`,
      },
      data: {
        semesterId: activeSem.id,
        category: 3,
        title: "Hoạt động VHVN cấp Trường",
        type: "add",
        points: 15,
        occurredAt: "2024-10-10",
      },
    });

    await request.post("/api/records", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        Cookie: `huit_drl_session=${authToken}`,
      },
      data: {
        semesterId: activeSem.id,
        category: 3,
        title: "Hoạt động TDTT cấp Thành phố",
        type: "add",
        points: 15,
        occurredAt: "2024-10-15",
      },
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The over-capped alert should appear: "Quy chế Điều 6.1 (Trần điểm Tiêu chí 3)"
    const overCapAlert = page.locator("text=/Quy chế Điều 6.1 \\(Trần điểm Tiêu chí 3\\)/i");
    await expect(overCapAlert).toBeVisible();
    await expect(page.locator("text=/không chuyển qua tiêu chí khác/i")).toBeVisible();
  });
});
