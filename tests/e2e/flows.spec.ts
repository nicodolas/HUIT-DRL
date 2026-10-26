import { test, expect } from "@playwright/test";
import { getValidTestCaptchaToken } from "./helpers/auth";

test.describe("Full HUIT DRL End-to-End User Journey", () => {
  const username = `sv_${Date.now()}`;
  const password = "HuitSecurePassword2026!";
  const fullName = "Sinh Viên HUIT Tiêu Biểu";

  test("1. Username check & registration with username-only", async ({ request }) => {
    // Check available username
    const checkRes = await request.get(`/api/auth/check-username?username=${username}`);
    const checkData = await checkRes.json();
    expect(checkData.available).toBe(true);

    // Register user
    const regRes = await request.post("/api/auth/register", {
      data: {
        username,
        password,
        fullName,
        faculty: "Công nghệ Thông tin",
        className: "14DHTH08",
        captchaToken: getValidTestCaptchaToken(),
      },
    });
    expect(regRes.status()).toBe(200);
    const regData = await regRes.json();
    expect(regData.user.username).toBe(username);
    expect(regData.user.fullName).toBe(fullName);
    expect(regData.user.email).toBeUndefined();
    expect(regData.user.mssv).toBeUndefined();
  });

  test("2. Login and initial 60-point baseline verification", async ({ request }) => {
    const loginRes = await request.post("/api/auth/login", {
      data: { username, password },
    });
    expect(loginRes.status()).toBe(200);

    const semsRes = await request.get("/api/semesters");
    const semsData = await semsRes.json();
    expect(semsData.semesters.length).toBeGreaterThan(0);
    const sem = semsData.semesters[0];

    // Check records
    const recRes = await request.get(`/api/records?semesterId=${sem.id}`);
    const recData = await recRes.json();

    // Baseline 60 default points (TC1: 25, TC2: 20, TC4: 15)
    expect(recData.scoreSummary.totalScore).toBe(60);
    expect(recData.scoreSummary.categories[1].cappedScore).toBe(25);
    expect(recData.scoreSummary.categories[2].cappedScore).toBe(20);
    expect(recData.scoreSummary.categories[4].cappedScore).toBe(15);
  });

  test("3. Adding activities, setting deadline, and verifying rating progress", async ({ request }) => {
    await request.post("/api/auth/login", {
      data: { username, password },
    });

    const semsRes = await request.get("/api/semesters");
    const semsData = await semsRes.json();
    const sem = semsData.semesters[0];

    // Update semester submission deadline
    const updateSemRes = await request.put("/api/semesters", {
      data: {
        id: sem.id,
        submissionDeadline: "2026-11-20",
        targetScore: 90,
      },
    });
    expect(updateSemRes.status()).toBe(200);

    // Add TC3 activity: +6đ
    const add1 = await request.post("/api/records", {
      data: {
        semesterId: sem.id,
        category: 3,
        title: "Thi Hội Thao HUIT 2026",
        type: "add",
        points: 6,
        occurredAt: "2026-10-15",
        evidenceUrl: "https://drive.google.com/file/d/evidence_thethao_1/view",
      },
    });
    expect(add1.status()).toBe(200);

    // Add TC3 activity: +14đ (reaches TC3 cap of 20)
    const add2 = await request.post("/api/records", {
      data: {
        semesterId: sem.id,
        category: 3,
        title: "Chiến dịch Mùa Hè Xanh",
        type: "add",
        points: 14,
        occurredAt: "2026-10-20",
        evidenceUrl: "https://drive.google.com/file/d/evidence_mhx_2/view",
      },
    });
    expect(add2.status()).toBe(200);

    // Add TC5 activity: +10đ (Ban cán sự lớp)
    const add3 = await request.post("/api/records", {
      data: {
        semesterId: sem.id,
        category: 5,
        title: "Ủy viên BCH Chi đoàn - Lớp phó học tập",
        type: "add",
        points: 10,
        occurredAt: "2026-10-01",
        evidenceUrl: "https://drive.google.com/file/d/evidence_bcs_3/view",
      },
    });
    expect(add3.status()).toBe(200);

    // Score should now be 60 (base) + 20 (TC3) + 10 (TC5) = 90 (Xuất sắc)
    const checkRecRes = await request.get(`/api/records?semesterId=${sem.id}`);
    const checkData = await checkRecRes.json();
    expect(checkData.scoreSummary.totalScore).toBe(90);
    expect(checkData.scoreSummary.rating.code).toBe("xuat_sac");
    expect(checkData.scoreSummary.rating.label).toBe("Xuất sắc");
  });
});

