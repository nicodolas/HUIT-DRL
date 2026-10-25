/**
 * HUIT Decision 3385/QĐ-DCT 5-Pillar Radar & Balance Index Engine
 * Computes SVG polygon coordinates, balance metrics, and profile archetypes across TC1 - TC5.
 */

export interface RadarPoint {
  category: number;
  code: string;
  shortName: string;
  actualScore: number;
  maxScore: number;
  percent: number; // 0 to 100
  normalizedValue: number; // 0.0 to 1.0
  x: number;
  y: number;
  angle: number;
}

export interface RadarGridLevel {
  level: number; // 25, 50, 75, 100
  polygonPoints: string;
}

export type ProfileArchetype =
  | "toan_dien"
  | "thien_phong_trao"
  | "thien_hoc_thuat"
  | "nguy_co_hoc_vu"
  | "chua_dong_deu";

export interface RadarAnalysisResult {
  points: RadarPoint[];
  currentPolygonPoints: string;
  baselinePolygonPoints: string;
  targetPolygonPoints: string;
  gridLevels: RadarGridLevel[];
  balanceIndex: number; // 0 to 100%
  balanceGrade: "XUẤT SẮC" | "TỐT" | "KHÁ" | "CẦN CẢI THIỆN";
  balanceColor: string;
  balanceBadgeBg: string;
  archetype: ProfileArchetype;
  archetypeLabel: string;
  archetypeDescription: string;
  strongestCategory: { code: string; shortName: string; percent: number };
  weakestCategory: { code: string; shortName: string; percent: number };
  strategicAdvice: string[];
}

export interface CategoryScoreInput {
  category: number;
  cappedScore: number;
  maxPoints: number;
}

const CATEGORY_METAS: Record<number, { code: string; shortName: string; maxPoints: number }> = {
  1: { code: "TC1", shortName: "Nội quy & Pháp luật", maxPoints: 25 },
  2: { code: "TC2", shortName: "Học tập & Học vụ", maxPoints: 20 },
  3: { code: "TC3", shortName: "Phong trào & TDTT", maxPoints: 20 },
  4: { code: "TC4", shortName: "Cộng đồng & Công dân", maxPoints: 15 },
  5: { code: "TC5", shortName: "Cán bộ & NCKH", maxPoints: 20 },
};

export function calculateRadarAnalysis(
  categoryScores: Record<number, CategoryScoreInput>,
  svgSize = 320
): RadarAnalysisResult {
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const radius = (svgSize / 2) * 0.72; // Leave margin for labels

  const points: RadarPoint[] = [];
  const currentCoords: string[] = [];
  const baselineCoords: string[] = [];
  const targetCoords: string[] = [];

  // Default baseline scores per Decision 3385: TC1: 25, TC2: 20, TC3: 0, TC4: 15, TC5: 0
  const BASELINE_SCORES: Record<number, number> = { 1: 25, 2: 20, 3: 0, 4: 15, 5: 0 };
  // Target scores for 90đ (Xuất sắc): TC1: 25, TC2: 20, TC3: 16, TC4: 15, TC5: 14
  const TARGET_SCORES: Record<number, number> = { 1: 25, 2: 20, 3: 16, 4: 15, 5: 14 };

  let totalNormalized = 0;
  const normalizedList: number[] = [];

  for (let i = 0; i < 5; i++) {
    const cat = i + 1;
    const meta = CATEGORY_METAS[cat];
    const actual = categoryScores[cat]?.cappedScore ?? 0;
    const max = meta.maxPoints;

    const normalized = Math.max(0, Math.min(1, actual / max));
    const percent = Math.round(normalized * 100);
    normalizedList.push(normalized);
    totalNormalized += normalized;

    // Angle: -pi/2 points straight up for TC1
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;

    const x = cx + radius * normalized * Math.cos(angle);
    const y = cy + radius * normalized * Math.sin(angle);

    points.push({
      category: cat,
      code: meta.code,
      shortName: meta.shortName,
      actualScore: Math.round(actual * 10) / 10,
      maxScore: max,
      percent,
      normalizedValue: normalized,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      angle,
    });

    currentCoords.push(`${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`);

    // Baseline coord
    const baseNorm = BASELINE_SCORES[cat] / max;
    const bx = cx + radius * baseNorm * Math.cos(angle);
    const by = cy + radius * baseNorm * Math.sin(angle);
    baselineCoords.push(`${Math.round(bx * 10) / 10},${Math.round(by * 10) / 10}`);

    // Target coord
    const targetNorm = TARGET_SCORES[cat] / max;
    const tx = cx + radius * targetNorm * Math.cos(angle);
    const ty = cy + radius * targetNorm * Math.sin(angle);
    targetCoords.push(`${Math.round(tx * 10) / 10},${Math.round(ty * 10) / 10}`);
  }

  // Pre-calculate grid levels (25%, 50%, 75%, 100%)
  const gridLevels: RadarGridLevel[] = [25, 50, 75, 100].map((lvl) => {
    const r = (radius * lvl) / 100;
    const pts = Array.from({ length: 5 })
      .map((_, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const px = Math.round((cx + r * Math.cos(ang)) * 10) / 10;
        const py = Math.round((cy + r * Math.sin(ang)) * 10) / 10;
        return `${px},${py}`;
      })
      .join(" ");
    return { level: lvl, polygonPoints: pts };
  });

  // Balance Index Calculation (Entropy & Completeness)
  const avgCompleteness = totalNormalized / 5;
  let entropy = 0;
  if (totalNormalized > 0) {
    for (const val of normalizedList) {
      if (val > 0) {
        const p = val / totalNormalized;
        entropy -= p * Math.log(p);
      }
    }
  }
  const maxEntropy = Math.log(5);
  const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;
  const balanceIndex = Math.min(
    100,
    Math.max(0, Math.round((0.55 * avgCompleteness + 0.45 * normalizedEntropy) * 100))
  );

  let balanceGrade: RadarAnalysisResult["balanceGrade"] = "KHÁ";
  let balanceColor = "text-amber-600 dark:text-amber-400";
  let balanceBadgeBg = "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";

  if (balanceIndex >= 85) {
    balanceGrade = "XUẤT SẮC";
    balanceColor = "text-emerald-600 dark:text-emerald-400";
    balanceBadgeBg = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
  } else if (balanceIndex >= 70) {
    balanceGrade = "TỐT";
    balanceColor = "text-sky-600 dark:text-sky-400";
    balanceBadgeBg = "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300";
  } else if (balanceIndex >= 50) {
    balanceGrade = "KHÁ";
    balanceColor = "text-amber-600 dark:text-amber-400";
    balanceBadgeBg = "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
  } else {
    balanceGrade = "CẦN CẢI THIỆN";
    balanceColor = "text-rose-600 dark:text-rose-400";
    balanceBadgeBg = "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";
  }

  // Find strongest and weakest
  const sortedPoints = [...points].sort((a, b) => b.percent - a.percent);
  const strongestCategory = {
    code: sortedPoints[0].code,
    shortName: sortedPoints[0].shortName,
    percent: sortedPoints[0].percent,
  };
  const weakestCategory = {
    code: sortedPoints[sortedPoints.length - 1].code,
    shortName: sortedPoints[sortedPoints.length - 1].shortName,
    percent: sortedPoints[sortedPoints.length - 1].percent,
  };

  // Archetype Detection
  let archetype: ProfileArchetype = "chua_dong_deu";
  let archetypeLabel = "Chưa đồng đều";
  let archetypeDescription = "Phân bổ điểm giữa các tiêu chí còn khoảng cách lớn.";

  const tc1 = points[0].percent;
  const tc2 = points[1].percent;
  const tc3 = points[2].percent;
  const tc4 = points[3].percent;
  const tc5 = points[4].percent;

  if (tc2 < 70) {
    archetype = "nguy_co_hoc_vu";
    archetypeLabel = "Cần củng cố Học vụ (TC2)";
    archetypeDescription = "Điểm tiêu chí học tập bị giảm (rớt môn hoặc thi lại). Cần ưu tiên cải thiện học tập.";
  } else if (tc1 >= 90 && tc2 >= 85 && tc3 >= 75 && tc4 >= 85 && tc5 >= 60) {
    archetype = "toan_dien";
    archetypeLabel = "Sinh viên Toàn diện";
    archetypeDescription = "Hồ sơ cân bằng xuất sắc trên cả 5 phương diện. Ứng viên sáng giá cho Sinh viên 5 Tốt.";
  } else if (tc3 >= 75 && tc5 < 35) {
    archetype = "thien_phong_trao";
    archetypeLabel = "Thiên về Phong trào (TC3)";
    archetypeDescription = "Hoạt động sôi nổi trong VHVN-TDTT nhưng chưa khai thác điểm NCKH, cán bộ lớp (TC5).";
  } else if (tc2 >= 95 && tc5 >= 50 && tc3 < 40) {
    archetype = "thien_hoc_thuat";
    archetypeLabel = "Thiên về Học thuật & NCKH";
    archetypeDescription = "Học tập và nghiên cứu rất tốt. Nên bổ sung thêm các hoạt động ngoại khóa cộng đồng.";
  }

  // Strategic Advice Generation
  const strategicAdvice: string[] = [];
  if (tc5 < 50) {
    strategicAdvice.push(
      "Khai thác TC5 (Cán bộ & NCKH): Tiêu chí này còn nhiều dư địa (+20đ). Bạn có thể like/bình chọn sự kiện (+2đ), tham gia CLB (+3đ), hoặc đăng ký đề tài NCKH (+10đ)."
    );
  }
  if (tc3 < 60) {
    strategicAdvice.push(
      "Gia tăng TC3 (Phong trào): Tham gia 2-3 hội thảo kỹ năng mềm hoặc cổ vũ giải bóng đá để nhận thêm +4đ đến +8đ."
    );
  }
  if (tc2 < 90) {
    strategicAdvice.push(
      "Bảo toàn TC2 (Học tập): Giữ không rớt môn để tránh bị trừ từ -2đ đến -20đ làm giảm điểm sàn học kỳ."
    );
  }
  if (strategicAdvice.length === 0) {
    strategicAdvice.push(
      "Duy trì phong độ: Tiếp tục giữ vững tác phong nề nếp và tham gia các hoạt động chất lượng cao để hướng tới xếp loại Xuất sắc toàn khóa."
    );
  }

  return {
    points,
    currentPolygonPoints: currentCoords.join(" "),
    baselinePolygonPoints: baselineCoords.join(" "),
    targetPolygonPoints: targetCoords.join(" "),
    gridLevels,
    balanceIndex,
    balanceGrade,
    balanceColor,
    balanceBadgeBg,
    archetype,
    archetypeLabel,
    archetypeDescription,
    strongestCategory,
    weakestCategory,
    strategicAdvice,
  };
}
