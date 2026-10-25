import { test, expect } from "@playwright/test";

test.describe("Phase 22: 5-Pillar Radar Chart & Training Balance Index Suite", () => {
  const timestamp = Date.now();
  const testUsername = `user_radar_${timestamp}`;
  const testPassword = "Password123@";
  const testFullName = `Trần Cân Bằng ${timestamp.toString().slice(-4)}`;
  const testClass = "16DHTH03";

  test("should render interactive 5-pillar SVG radar chart, compute balance index, and display profile archetype", async ({ page }) => {
    // 1. Register student
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

    // 2. Check Radar Card on Dashboard
    const radarCard = page.locator('[data-testid="drl-radar-card"]');
    await expect(radarCard).toBeVisible({ timeout: 10000 });
    await expect(radarCard.getByText("Biểu Đồ Radar & Mức Độ Cân Bằng (5 Tiêu Chí)")).toBeVisible();

    // Verify 5 axis labels in SVG
    const svgChart = radarCard.locator('svg[aria-label="Biểu đồ radar 5 tiêu chí rèn luyện HUIT"]');
    await expect(svgChart).toBeVisible();
    await expect(svgChart.getByText(/TC1/)).toBeVisible();
    await expect(svgChart.getByText(/TC2/)).toBeVisible();
    await expect(svgChart.getByText(/TC3/)).toBeVisible();
    await expect(svgChart.getByText(/TC4/)).toBeVisible();
    await expect(svgChart.getByText(/TC5/)).toBeVisible();

    // Verify Balance Index Gauge & Archetype
    await expect(radarCard.getByText("Chỉ số cân bằng rèn luyện:")).toBeVisible();
    await expect(radarCard.getByText(/mức độ đồng đều 5 tiêu chí/i)).toBeVisible();
    await expect(radarCard.getByText(/Hồ sơ:/i)).toBeVisible();

    // 3. Test Baseline & Target Checkbox Toggles
    const baselineCheckbox = radarCard.locator('input[type="checkbox"]').first();
    await baselineCheckbox.uncheck();
    await baselineCheckbox.check();

    // 4. Test Node Interaction (Click on TC1 label to inspect details)
    const tc1Label = svgChart.getByText(/TC1/);
    await tc1Label.click();

    await expect(radarCard.getByText(/TC1: Nội quy & Pháp luật/i)).toBeVisible();
    await expect(radarCard.getByText(/25\/25đ/i)).toBeVisible();

    // 5. Check Radar Card on Goals page
    await page.goto("/goals");
    const goalsRadarCard = page.locator('[data-testid="drl-radar-card"]');
    await expect(goalsRadarCard).toBeVisible({ timeout: 10000 });
    await expect(goalsRadarCard.getByText("Biểu Đồ Radar & Mức Độ Cân Bằng (5 Tiêu Chí)")).toBeVisible();
  });
});
