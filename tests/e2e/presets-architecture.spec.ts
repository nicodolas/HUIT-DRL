import { test, expect } from "@playwright/test";
import { DEFAULT_HUIT_PRESETS, getDefaultPresets, mergeWithCustomPresets } from "../../src/lib/presets/default-presets";

test.describe("HUIT QĐ 3385 Criteria Presets Architecture & Hybrid Storage Engine", () => {
  test("Code Baseline contains complete QĐ 3385 presets across all 5 categories", async () => {
    const presets = getDefaultPresets();
    expect(presets.length).toBeGreaterThanOrEqual(45);

    // Verify all 5 categories are represented
    const categories = new Set(presets.map((p) => p.category));
    expect(categories.has(1)).toBeTruthy();
    expect(categories.has(2)).toBeTruthy();
    expect(categories.has(3)).toBeTruthy();
    expect(categories.has(4)).toBeTruthy();
    expect(categories.has(5)).toBeTruthy();

    // Verify key regulation codes exist
    const codes = new Set(presets.map((p) => p.code));
    expect(codes.has("TC1_SHCD")).toBeTruthy();
    expect(codes.has("TC1_DONG_PHUC")).toBeTruthy();
    expect(codes.has("TC2_ROT_1_MON")).toBeTruthy();
    expect(codes.has("TC3_CUOC_THI_TRUONG")).toBeTruthy();
    expect(codes.has("TC4_PHAT_NGON_MXH")).toBeTruthy();
    expect(codes.has("TC5_SV5T_TRUONG")).toBeTruthy();
    expect(codes.has("TC5_NCKH_QG")).toBeTruthy();

    // Verify numeric points and valid types
    for (const p of presets) {
      expect(["default", "add", "deduct"]).toContain(p.type);
      expect(Number.isFinite(parseFloat(p.points))).toBeTruthy();
      expect(p.title.length).toBeGreaterThan(5);
    }
  });

  test("mergeWithCustomPresets properly merges and allows dynamic overrides", async () => {
    const custom = [
      {
        id: "TC3_CUOC_THI_TRUONG",
        category: 3,
        code: "TC3_CUOC_THI_TRUONG",
        title: "Cuộc thi cấp Trường (Đặc biệt sửa điểm)",
        type: "add",
        points: "8",
        maxPointsCategory: 20,
        unit: "HĐ",
        description: "Điểm cộng tăng theo kỳ đặc biệt",
      },
      {
        id: "TC3_CUSTOM_EVENT",
        category: 3,
        code: "TC3_CUSTOM_EVENT",
        title: "Hoạt động tình nguyện hè bổ sung",
        type: "add",
        points: "5",
        maxPointsCategory: 20,
        unit: "HĐ",
        description: "Tiêu chí mới do BGH bổ sung",
      },
    ];

    const merged = mergeWithCustomPresets(custom);
    // Overridden item
    const overridden = merged.find((p) => p.code === "TC3_CUOC_THI_TRUONG");
    expect(overridden).toBeDefined();
    expect(overridden?.points).toBe("8");
    expect(overridden?.title).toContain("Đặc biệt");

    // Newly appended item
    const newItem = merged.find((p) => p.code === "TC3_CUSTOM_EVENT");
    expect(newItem).toBeDefined();
    expect(newItem?.points).toBe("5");

    // Existing items preserved
    const shcd = merged.find((p) => p.code === "TC1_SHCD");
    expect(shcd).toBeDefined();
    expect(shcd?.points).toBe("-5");
  });

  test("GET /api/presets returns merged presets with Cache-Control headers", async ({ request }) => {
    const res = await request.get("/api/presets");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.presets)).toBeTruthy();
    expect(data.presets.length).toBeGreaterThanOrEqual(45);

    const cacheHeader = res.headers()["cache-control"];
    expect(cacheHeader).toContain("public");
  });
});
