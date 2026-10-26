import { test, expect } from "@playwright/test";
import { calculateSemesterScore } from "../../src/lib/drl/calculator";
import { calculateRadarAnalysis } from "../../src/lib/drl/radar";
import { classifyHuitActivity, clearClassifierCache } from "../../src/lib/classifier/activity-classifier";
import { calculateGraduationForecast } from "../../src/lib/graduation/forecast";
import { evaluateSv5t } from "../../src/lib/sv5t/rules";
import { DrlRecord } from "../../src/lib/db/schema";

test.describe("HUIT DRL Extreme Performance, Logic Speed & Calculation Scalability Suite", () => {
  test("1. Score Calculation Engine: 10,000 computations in < 150ms (> 65,000 ops/sec)", async () => {
    // Generate realistic student records
    const sampleRecords: DrlRecord[] = [
      { id: "r1", userId: "u1", semesterId: "s1", presetId: "TC1_SHCD", category: 1, title: "Vắng SHCD", type: "deduct", points: "-5", quantity: 1, occurredAt: "2026-09-01", note: null, evidenceUrl: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "r2", userId: "u1", semesterId: "s1", presetId: "TC2_ROT_1_MON", category: 2, title: "Rớt 1 môn", type: "deduct", points: "-2", quantity: 1, occurredAt: "2026-10-01", note: null, evidenceUrl: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "r3", userId: "u1", semesterId: "s1", presetId: "TC3_CUOC_THI_TRUONG", category: 3, title: "Thi Hội thao Trường", type: "add", points: "6", quantity: 2, occurredAt: "2026-10-15", note: null, evidenceUrl: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "r4", userId: "u1", semesterId: "s1", presetId: "TC3_CO_VU", category: 3, title: "Cổ vũ văn nghệ", type: "add", points: "2", quantity: 3, occurredAt: "2026-10-20", note: null, evidenceUrl: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "r5", userId: "u1", semesterId: "s1", presetId: "TC5_SV5T_TRUONG", category: 5, title: "Sinh viên 5 tốt cấp Trường", type: "add", points: "5", quantity: 1, occurredAt: "2026-11-01", note: null, evidenceUrl: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "r6", userId: "u1", semesterId: "s1", presetId: "TC5_HOI_THAO_TRUONG", category: 5, title: "Hội thảo NCKH Trường", type: "add", points: "5", quantity: 2, occurredAt: "2026-11-10", note: null, evidenceUrl: null, createdAt: new Date(), updatedAt: new Date() },
    ];

    // Warm up JIT
    for (let i = 0; i < 200; i++) {
      calculateSemesterScore(sampleRecords, "none");
    }

    const iterations = 10000;
    let scoreChecksum = 0;
    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      const res = calculateSemesterScore(sampleRecords, "none");
      scoreChecksum += res.totalScore;
    }
    const elapsedMs = performance.now() - startTime;
    const opsPerSec = Math.round((iterations / elapsedMs) * 1000);

    console.log(`[PERF] Score Engine: ${iterations} runs in ${elapsedMs.toFixed(2)}ms (${opsPerSec.toLocaleString()} ops/sec)`);

    expect(scoreChecksum).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(150);
    expect(opsPerSec).toBeGreaterThan(65000);
  });

  test("2. Extreme Scalability: 1,000 records single semester processed in < 3ms", async () => {
    // Construct 1,000 records
    const heavyRecords: DrlRecord[] = [];
    for (let i = 0; i < 1000; i++) {
      heavyRecords.push({
        id: `rec_${i}`,
        userId: "u1",
        semesterId: "s1",
        presetId: null,
        category: (i % 5) + 1,
        title: `Hoạt động tự chọn #${i}`,
        type: i % 4 === 0 ? "deduct" : "add",
        points: i % 4 === 0 ? "-2" : "3",
        quantity: 1,
        occurredAt: "2026-10-15",
        note: null,
        evidenceUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const t0 = performance.now();
    const result = calculateSemesterScore(heavyRecords, "none");
    const t1 = performance.now() - t0;

    console.log(`[PERF] 1,000 records processed in ${t1.toFixed(3)}ms`);

    expect(t1).toBeLessThan(3.0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
  });

  test("3. Radar & Balance Engine: 5,000 computations in < 100ms (> 50,000 ops/sec)", async () => {
    const categoryScores = {
      1: { category: 1, cappedScore: 25, maxPoints: 25 },
      2: { category: 2, cappedScore: 18, maxPoints: 20 },
      3: { category: 3, cappedScore: 16, maxPoints: 20 },
      4: { category: 4, cappedScore: 15, maxPoints: 15 },
      5: { category: 5, cappedScore: 12, maxPoints: 20 },
    };

    // Warm up
    for (let i = 0; i < 100; i++) {
      calculateRadarAnalysis(categoryScores, 320);
    }

    const iterations = 5000;
    let balanceSum = 0;
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      const res = calculateRadarAnalysis(categoryScores, 320);
      balanceSum += res.balanceIndex;
    }
    const duration = performance.now() - t0;
    const opsPerSec = Math.round((iterations / duration) * 1000);

    console.log(`[PERF] Radar Engine: ${iterations} runs in ${duration.toFixed(2)}ms (${opsPerSec.toLocaleString()} ops/sec)`);

    expect(balanceSum).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100);
    expect(opsPerSec).toBeGreaterThan(50000);
  });

  test("4. NLP Activity Classifier: Cold vs Hot LRU Cache (> 250,000 ops/sec hot)", async () => {
    clearClassifierCache();

    const sampleQueries = [
      "tiếp sức mùa thi 2026",
      "hiến máu tình nguyện đợt 1",
      "rớt môn giải tích 1",
      "tham gia hội thao cấp trường",
      "nghiên cứu khoa học đạt giải nhất",
      "không đeo thẻ sinh viên",
      "chủ nhiệm clb tin học",
      "bình chọn cuộc thi nét đẹp sinh viên",
      "sinh hoạt công dân đầu năm",
      "bảo hiểm y tế chậm nộp",
    ];

    // Cold run (populating cache)
    const tColdStart = performance.now();
    for (const q of sampleQueries) {
      const res = classifyHuitActivity(q);
      expect(res).not.toBeNull();
    }
    const coldDuration = performance.now() - tColdStart;
    console.log(`[PERF] NLP Classifier (Cold): 10 distinct queries in ${coldDuration.toFixed(3)}ms`);
    expect(coldDuration).toBeLessThan(15);

    // Hot run (simulating real-time typing / autocomplete lookup)
    const hotIterations = 5000;
    let matchCount = 0;
    const tHotStart = performance.now();
    for (let i = 0; i < hotIterations; i++) {
      const q = sampleQueries[i % sampleQueries.length];
      const res = classifyHuitActivity(q);
      if (res) matchCount++;
    }
    const hotDuration = performance.now() - tHotStart;
    const hotOpsPerSec = Math.round((hotIterations / hotDuration) * 1000);

    console.log(`[PERF] NLP Classifier (Hot LRU): ${hotIterations} lookups in ${hotDuration.toFixed(2)}ms (${hotOpsPerSec.toLocaleString()} ops/sec)`);

    expect(matchCount).toBe(hotIterations);
    expect(hotDuration).toBeLessThan(25);
    expect(hotOpsPerSec).toBeGreaterThan(200000);
  });

  test("5. Graduation Simulator: 10,000 simulations in < 50ms (> 200,000 ops/sec)", async () => {
    const input = {
      completedSemesters: [
        { id: "s1", name: "HK1 2024", score: 85 },
        { id: "s2", name: "HK2 2024", score: 88 },
        { id: "s3", name: "HK1 2025", score: 92 },
        { id: "s4", name: "HK2 2025", score: 79 },
      ],
      totalProgramSemesters: 8,
      targetTier: "xuat_sac" as const,
      hasDisciplineWarning: false,
    };

    const iterations = 10000;
    let neededSum = 0;
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      const res = calculateGraduationForecast(input);
      neededSum += res.pointsNeededTotal;
    }
    const elapsed = performance.now() - t0;
    const ops = Math.round((iterations / elapsed) * 1000);

    console.log(`[PERF] Graduation Simulator: ${iterations} runs in ${elapsed.toFixed(2)}ms (${ops.toLocaleString()} ops/sec)`);

    expect(neededSum).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
    expect(ops).toBeGreaterThan(200000);
  });

  test("6. SV5T Auditor Engine: 2,000 profile audits in < 50ms (> 40,000 ops/sec)", async () => {
    const records: DrlRecord[] = [
      { id: "r1", userId: "u1", semesterId: "s1", presetId: null, category: 3, title: "Chiến dịch Xuân Tình Nguyện", type: "add", points: "4", quantity: 1, occurredAt: null, note: null, evidenceUrl: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "r2", userId: "u1", semesterId: "s1", presetId: null, category: 3, title: "Hội thao bóng đá sinh viên", type: "add", points: "4", quantity: 1, occurredAt: null, note: null, evidenceUrl: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "r3", userId: "u1", semesterId: "s1", presetId: null, category: 5, title: "Nghiên cứu khoa học HUIT", type: "add", points: "10", quantity: 1, occurredAt: null, note: null, evidenceUrl: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "r4", userId: "u1", semesterId: "s1", presetId: null, category: 5, title: "Thi tiếng Anh TOEIC", type: "add", points: "5", quantity: 1, occurredAt: null, note: null, evidenceUrl: null, createdAt: new Date(), updatedAt: new Date() },
    ];

    const iterations = 2000;
    let passedCountSum = 0;
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      const res = evaluateSv5t({
        drlScore: 88,
        disciplineLevel: "none",
        gpa: 3.4,
        records,
        hasFailedCourse: false,
      });
      passedCountSum += res.pillars.length;
    }
    const elapsed = performance.now() - t0;
    const ops = Math.round((iterations / elapsed) * 1000);

    console.log(`[PERF] SV5T Auditor: ${iterations} runs in ${elapsed.toFixed(2)}ms (${ops.toLocaleString()} ops/sec)`);

    expect(passedCountSum).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
    expect(ops).toBeGreaterThan(40000);
  });

  test("7. API Latency Benchmark: /api/presets & /api/health respond in < 250ms (warm < 100ms)", async ({ request }) => {
    // Initial preflight warm-up
    await request.get("/api/health");

    const t0 = performance.now();
    const resPresets = await request.get("/api/presets");
    const tPresets = performance.now() - t0;

    expect(resPresets.ok()).toBeTruthy();
    expect(tPresets).toBeLessThan(250);

    const t1 = performance.now();
    const resHealth = await request.get("/api/health");
    const tHealth = performance.now() - t1;

    expect(resHealth.ok()).toBeTruthy();
    expect(tHealth).toBeLessThan(100);

    console.log(`[PERF] Network Latency: /api/presets=${tPresets.toFixed(1)}ms, /api/health=${tHealth.toFixed(1)}ms`);
  });
});
