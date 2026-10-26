import { test, expect } from "@playwright/test";
import { evaluateSv5t } from "../../src/lib/sv5t/rules";
import { isValidEvidenceUrl } from "../../src/lib/security/sanitizer";

test.describe("Sinh Viên 5 Tốt (SV5T) & Media Security Suite", () => {
  test("SV5T Evaluation Engine correctly assesses 5 pillars", async () => {
    // Case 1: Baseline student (60 pts, 3.2 GPA, no extra activities)
    const baselineResult = evaluateSv5t({
      drlScore: 60,
      disciplineLevel: "none",
      gpa: 3.2,
      records: [],
    });

    expect(baselineResult.isQualified).toBe(false);
    expect(baselineResult.passedPillarsCount).toBe(1); // Only Academics passed (Ethics failed 60 < 80, Fitness/Volunteer/Integration empty)
    expect(baselineResult.recommendations.length).toBeGreaterThan(0);

    // Case 2: High achieving student (92 pts, 3.6 GPA, all pillars completed)
    const starStudentResult = evaluateSv5t({
      drlScore: 92,
      disciplineLevel: "none",
      gpa: 3.6,
      records: [
        {
          id: "1",
          userId: "u1",
          semesterId: "s1",
          category: 3,
          points: "5",
          title: "Tham gia Chiến dịch Mùa hè xanh 2025",
          createdAt: new Date(),
        } as any,
        {
          id: "2",
          userId: "u1",
          semesterId: "s1",
          category: 4,
          points: "4",
          title: "Tham gia Hội thao Sinh viên HUIT môn Cầu lông",
          createdAt: new Date(),
        } as any,
        {
          id: "3",
          userId: "u1",
          semesterId: "s1",
          category: 2,
          points: "5",
          title: "Tham gia Hội nghị NCKH sinh viên cấp Khoa",
          createdAt: new Date(),
        } as any,
        {
          id: "4",
          userId: "u1",
          semesterId: "s1",
          category: 5,
          points: "3",
          title: "Tham gia Workshop Hội nhập và Tiếng Anh giao tiếp",
          createdAt: new Date(),
        } as any,
      ],
      hasFitnessCertificate: true,
      hasForeignLangCert: true,
    });

    expect(starStudentResult.isQualified).toBe(true);
    expect(starStudentResult.passedPillarsCount).toBe(5);
    expect(starStudentResult.qualifiedLevel).toBe("trương");
    expect(starStudentResult.recommendations.length).toBe(0);
  });

  test("Evidence URL sanitizer validates WebP/JPEG data URLs and blocks dangerous schemes", async () => {
    // Safe compressed data URLs
    expect(isValidEvidenceUrl("data:image/webp;base64,UklGRkAAAABXRUJQVlA4WAoAAAAQAAAAAQAA")).toBe(true);
    expect(isValidEvidenceUrl("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD")).toBe(true);
    expect(isValidEvidenceUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB")).toBe(true);

    // Safe regular HTTP/HTTPS
    expect(isValidEvidenceUrl("https://drive.google.com/drive/folders/123456")).toBe(true);
    expect(isValidEvidenceUrl("http://example.com/chung-nhan.jpg")).toBe(true);

    // Malicious schemes must be blocked
    expect(isValidEvidenceUrl("javascript:alert('xss')")).toBe(false);
    expect(isValidEvidenceUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isValidEvidenceUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isValidEvidenceUrl("file:///C:/Windows/system32/cmd.exe")).toBe(false);
  });

  test("Browser UI: Open SV5T Auditor Modal on Dashboard and toggle criteria", async ({ page }) => {
    const testUsername = `sv5t_${Date.now()}`;
    const testPassword = "Password123!";
    const testFullName = "Sinh Viên Năm Tốt HUIT";

    // Register
    await page.goto("/register");
    await page.locator('input[placeholder*="nguyenvana"]').fill(testUsername);
    await expect(page.getByText(/khả dụng/i)).toBeVisible({ timeout: 5000 });
    await page.locator('input[placeholder*="Tối thiểu 6 ký tự"]').fill(testPassword);
    await page.locator('input[placeholder*="Nhập lại mật khẩu"]').fill(testPassword);
    await page.locator('input[placeholder*="Nguyễn Văn"]').fill(testFullName);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });

    // Open SV5T Auditor Modal via Utilities Menu
    const utilitiesDropdown = page.getByRole("button", { name: "Tiện ích khác" });
    await expect(utilitiesDropdown).toBeVisible({ timeout: 10000 });
    await utilitiesDropdown.click();
    await page.getByRole("button", { name: /Sinh viên 5 tốt/i }).click();
    await expect(page.locator("text=Thẩm Định \"Sinh Viên 5 Tốt\" HUIT")).toBeVisible();
    await expect(page.locator("text=1. Đạo Đức Tốt")).toBeVisible();
    await expect(page.locator("text=2. Học Tập Tốt")).toBeVisible();
    await expect(page.locator("text=3. Thể Lực Tốt")).toBeVisible();
    await expect(page.locator("text=4. Tình Nguyện Tốt")).toBeVisible();
    await expect(page.locator("text=5. Hội Nhập Tốt")).toBeVisible();

    // Toggle sports certificate checkbox
    const fitnessCheckbox = page.locator('input[type="checkbox"]').nth(1);
    await fitnessCheckbox.check();

    // Close modal
    await page.click("text=Đóng");
    await expect(page.locator("text=Thẩm Định \"Sinh Viên 5 Tốt\" HUIT")).not.toBeVisible();
  });
});
