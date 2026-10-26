import { test, expect } from "@playwright/test";
import { calculateSemesterScore } from "../../src/lib/drl/calculator";
import { determineRating } from "../../src/lib/drl/rules";
import { getValidTestCaptchaToken } from "./helpers/auth";

test.describe("Phase 26: Edge Cases & Business Logic Boundary Suite", () => {
  test("Edge Case: QĐ 3385 Discipline Downgrading Boundaries", () => {
    // 1. High score with discipline 'khien_trach' cannot exceed Khá
    const khienTrachRating = determineRating(98, "khien_trach");
    expect(khienTrachRating.code).toBe("kha");
    expect(khienTrachRating.label).toBe("Khá");

    // 2. High score with discipline 'canh_cao' cannot exceed Trung bình
    const canhCaoRating = determineRating(95, "canh_cao");
    expect(canhCaoRating.code).toBe("trung_binh");
    expect(canhCaoRating.label).toBe("Trung bình");

    // 3. High score with discipline 'dinh_chi' is 'khong_danh_gia'
    const dinhChiRating = determineRating(100, "dinh_chi");
    expect(dinhChiRating.code).toBe("khong_danh_gia");
    expect(dinhChiRating.label).toBe("Không đánh giá");

    // 4. Score tiers boundary testing
    expect(determineRating(90, "none").code).toBe("xuat_sac");
    expect(determineRating(89.9, "none").code).toBe("tot");
    expect(determineRating(80, "none").code).toBe("tot");
    expect(determineRating(79.9, "none").code).toBe("kha");
    expect(determineRating(70, "none").code).toBe("kha");
    expect(determineRating(69.9, "none").code).toBe("trung_binh");
    expect(determineRating(50, "none").code).toBe("trung_binh");
    expect(determineRating(49.9, "none").code).toBe("yeu");
    expect(determineRating(35, "none").code).toBe("yeu");
    expect(determineRating(34.9, "none").code).toBe("kem");
    expect(determineRating(0, "none").code).toBe("kem");
  });

  test("Edge Case: Category Capping & Negative Score Clamping", () => {
    // 1. Baseline with 0 activities = 60 points (TC1: 25, TC2: 20, TC3: 0, TC4: 15, TC5: 0)
    const baseline = calculateSemesterScore([]);
    expect(baseline.totalScore).toBe(60);
    expect(baseline.rating.code).toBe("trung_binh");

    // 2. Severe penalties in Category 1: Cannot drop below 0
    const severePenaltyRecords: any[] = [
      {
        id: "pen_1",
        category: 1,
        title: "Vi phạm nghiêm trọng 1",
        type: "deduct",
        points: "-20",
        quantity: 1,
      },
      {
        id: "pen_2",
        category: 1,
        title: "Vi phạm nghiêm trọng 2",
        type: "deduct",
        points: "-20",
        quantity: 1,
      },
    ];
    const penaltyResult = calculateSemesterScore(severePenaltyRecords);
    // TC1: 25 - 40 = -15, but capped at Math.max(0, ...) => 0
    expect(penaltyResult.categories[1].cappedScore).toBe(0);
    // Total: 0 + 20 + 0 + 15 + 0 = 35 points
    expect(penaltyResult.totalScore).toBe(35);
    expect(penaltyResult.rating.code).toBe("yeu");

    // 3. Overflow points in Category 3: Max is 20 points
    const overflowRecords: any[] = [
      {
        id: "act_1",
        category: 3,
        title: "Hoạt động vượt trần",
        type: "add",
        points: "50",
        quantity: 1,
      },
    ];
    const overflowResult = calculateSemesterScore(overflowRecords);
    expect(overflowResult.categories[3].cappedScore).toBe(20);
    expect(overflowResult.categories[3].remainingCapacity).toBe(0);
  });

  test("Edge Case: Boundary inputs via API (fractional points, 255-char title, 1000-char note, max quantity)", async ({
    request,
  }) => {
    const edgeUser = `edge_${Date.now()}`;
    const token = getValidTestCaptchaToken();

    // Register test user
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: edgeUser,
        password: "ValidPassword123!",
        fullName: "Edge Case Tester",
        captchaToken: token,
      },
    });
    expect(regRes.status()).toBe(200);

    // Login
    await request.post("/api/auth/login", {
      data: { username: edgeUser, password: "ValidPassword123!" },
    });

    const semsRes = await request.get("/api/semesters");
    const semsData = await semsRes.json();
    const semId = semsData.semesters[0].id;

    // 1. Title at exact 255 characters boundary
    const boundaryTitle = "A".repeat(255);
    const boundaryNote = "B".repeat(1000);

    const addRes = await request.post("/api/records", {
      data: {
        semesterId: semId,
        category: 3,
        title: boundaryTitle,
        type: "add",
        points: 2.5, // fractional point
        quantity: 100, // should clamp to 50
        note: boundaryNote,
      },
    });
    expect(addRes.status()).toBe(200);
    const { recordId } = await addRes.json();

    // Fetch and verify bounds
    const getRes = await request.get(`/api/records?semesterId=${semId}`);
    expect(getRes.status()).toBe(200);
    const getData = await getRes.json();
    const rec = getData.records.find((r: any) => r.id === recordId);
    expect(rec).toBeDefined();
    expect(rec.title.length).toBe(255);
    expect(rec.note.length).toBe(1000);
    expect(Number(rec.points)).toBe(2.5);
    expect(rec.quantity).toBe(50); // Clamped from 100 to 50
  });

  test("Edge Case: Deleting the sole remaining semester is strictly prevented", async ({ request }) => {
    const soleUser = `sole_${Date.now()}`;
    const token = getValidTestCaptchaToken();

    await request.post("/api/auth/register", {
      data: {
        username: soleUser,
        password: "ValidPassword123!",
        fullName: "Sole Semester Tester",
        captchaToken: token,
      },
    });
    await request.post("/api/auth/login", {
      data: { username: soleUser, password: "ValidPassword123!" },
    });

    const semsRes = await request.get("/api/semesters");
    const semsData = await semsRes.json();
    expect(semsData.semesters.length).toBeGreaterThan(0);
    const targetSemesterId = semsData.semesters[0].id;

    // Attempt to delete semester as regular student (Blocked by RBAC with 403 Forbidden)
    const delRes = await request.delete(`/api/semesters?id=${targetSemesterId}`);
    expect(delRes.status()).toBe(403);
    const delData = await delRes.json();
    expect(delData.error).toContain("Quản trị viên");
  });
});

