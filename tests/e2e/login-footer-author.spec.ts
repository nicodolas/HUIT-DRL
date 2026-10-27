import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Login & Register Footer Author Attribution Suite", () => {
  const artifactDir = "C:/Users/Admin/.gemini/antigravity/brain/f50425b0-0e04-4b9c-9d96-16e1f38ec306";

  test("Login page displays author 'pon0212' with correct GitHub link", async ({ page }) => {
    await page.goto("/login");

    // 1. Verify author text and github link
    const authorLink = page.locator('a[href="https://github.com/pon0212"]');
    await expect(authorLink).toBeVisible();
    await expect(authorLink).toHaveText(/pon0212/);
    await expect(authorLink).toHaveAttribute("target", "_blank");
    await expect(authorLink).toHaveAttribute("rel", "noopener noreferrer");

    // 2. Take screenshot of login page in light mode
    await page.screenshot({
      path: path.join(artifactDir, "login_page_author_light.png"),
      fullPage: false,
    });

    // 3. Emulate dark mode on login page
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
    });
    await page.waitForTimeout(200);

    // Verify author link in dark mode
    await expect(authorLink).toBeVisible();

    // 4. Take screenshot of login page in dark mode
    await page.screenshot({
      path: path.join(artifactDir, "login_page_author_dark.png"),
      fullPage: false,
    });
  });

  test("Register page also displays author 'pon0212' with correct GitHub link", async ({ page }) => {
    await page.goto("/register");

    const authorLink = page.locator('a[href="https://github.com/pon0212"]');
    await expect(authorLink).toBeVisible();
    await expect(authorLink).toHaveText(/pon0212/);
  });
});

