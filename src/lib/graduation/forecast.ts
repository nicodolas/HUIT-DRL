/**
 * HUIT DRL Graduation Forecast & Target Simulator Engine
 * Grounded in Decision 3385/QĐ-DCT, Điều 12: Đánh giá kết quả rèn luyện toàn khóa học
 */

export type GraduationTier = "xuat_sac" | "tot" | "kha" | "trung_binh";

export interface CompletedSemesterScore {
  id: string;
  name: string;
  score: number;
}

export interface GraduationForecastInput {
  completedSemesters: CompletedSemesterScore[];
  totalProgramSemesters: number; // typically 8 for standard 4-year degree
  targetTier: GraduationTier;
  customTargetScore?: number;
  hasDisciplineWarning?: boolean; // Điều 12 Khoản 3
}

export interface CategoryRoadmapAdvice {
  category: number;
  code: string;
  name: string;
  recommendedPoints: number;
  maxPoints: number;
  actionGuide: string;
}

export interface GraduationForecastResult {
  completedCount: number;
  totalProgramSemesters: number;
  remainingSemestersCount: number;
  currentSum: number;
  currentAverage: number;
  targetScore: number;
  targetTierLabel: string;
  pointsNeededTotal: number;
  requiredAveragePerRemaining: number;
  isFeasible: boolean;
  feasibilityLevel: "guaranteed" | "easy" | "moderate" | "challenging" | "extreme" | "impossible";
  feasibilityLabel: string;
  feasibilityColor: string;
  feasibilityBadgeBg: string;
  disciplineDowngraded: boolean;
  disciplineWarningMessage?: string;
  effectiveProjectedTierLabel: string;
  categoryRoadmap: CategoryRoadmapAdvice[];
}

export const TIER_THRESHOLDS: Record<GraduationTier, { minScore: number; label: string }> = {
  xuat_sac: { minScore: 90, label: "Xuất sắc" },
  tot: { minScore: 80, label: "Tốt" },
  kha: { minScore: 70, label: "Khá" },
  trung_binh: { minScore: 50, label: "Trung bình" },
};

export function calculateGraduationForecast(input: GraduationForecastInput): GraduationForecastResult {
  const {
    completedSemesters,
    totalProgramSemesters = 8,
    targetTier,
    customTargetScore,
    hasDisciplineWarning = false,
  } = input;

  const completedCount = completedSemesters.length;
  const currentSum = completedSemesters.reduce((acc, s) => acc + (Number(s.score) || 0), 0);
  const currentAverage = completedCount > 0 ? Math.round((currentSum / completedCount) * 10) / 10 : 0;

  const remainingSemestersCount = Math.max(1, totalProgramSemesters - completedCount);

  // Target score determination
  const baseTargetScore = customTargetScore ?? TIER_THRESHOLDS[targetTier].minScore;
  const targetTierLabel = TIER_THRESHOLDS[targetTier]?.label || "Xuất sắc";

  const targetSum = baseTargetScore * totalProgramSemesters;
  const pointsNeededTotal = Math.max(0, Math.round((targetSum - currentSum) * 10) / 10);
  const requiredAveragePerRemaining =
    Math.round((pointsNeededTotal / remainingSemestersCount) * 10) / 10;

  // Feasibility determination
  let feasibilityLevel: GraduationForecastResult["feasibilityLevel"] = "moderate";
  let feasibilityLabel = "Khả thi";
  let feasibilityColor = "text-sky-600 dark:text-sky-400";
  let feasibilityBadgeBg = "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800";
  let isFeasible = true;

  if (requiredAveragePerRemaining <= 0) {
    feasibilityLevel = "guaranteed";
    feasibilityLabel = "Đã chắc chắn đạt mục tiêu";
    feasibilityColor = "text-emerald-600 dark:text-emerald-400";
    feasibilityBadgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
  } else if (requiredAveragePerRemaining <= 75) {
    feasibilityLevel = "easy";
    feasibilityLabel = "Rất thuận lợi (≤ 75đ/HK)";
    feasibilityColor = "text-emerald-600 dark:text-emerald-400";
    feasibilityBadgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
  } else if (requiredAveragePerRemaining <= 85) {
    feasibilityLevel = "moderate";
    feasibilityLabel = "Vừa sức, khả thi cao (76 - 85đ/HK)";
    feasibilityColor = "text-sky-600 dark:text-sky-400";
    feasibilityBadgeBg = "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800";
  } else if (requiredAveragePerRemaining <= 93) {
    feasibilityLevel = "challenging";
    feasibilityLabel = "Thách thức, cần nỗ lực (86 - 93đ/HK)";
    feasibilityColor = "text-amber-600 dark:text-amber-400";
    feasibilityBadgeBg = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
  } else if (requiredAveragePerRemaining <= 100) {
    feasibilityLevel = "extreme";
    feasibilityLabel = "Cực đại, sát trần (94 - 100đ/HK)";
    feasibilityColor = "text-orange-600 dark:text-orange-400";
    feasibilityBadgeBg = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800";
  } else {
    feasibilityLevel = "impossible";
    feasibilityLabel = "Bất khả thi (> 100đ/HK)";
    feasibilityColor = "text-rose-600 dark:text-rose-400";
    feasibilityBadgeBg = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
    isFeasible = false;
  }

  // Discipline Downgrade Rule (Điều 12 Khoản 3)
  let disciplineDowngraded = false;
  let disciplineWarningMessage: string | undefined;
  let effectiveProjectedTierLabel = targetTierLabel;

  if (hasDisciplineWarning) {
    disciplineDowngraded = true;
    if (targetTier === "xuat_sac" || targetTier === "tot") {
      disciplineWarningMessage =
        "Lưu ý Điều 12 Khoản 3: Sinh viên bị kỷ luật cảnh cáo trở lên toàn khóa sẽ bị hạ 1 bậc xếp loại và không được xếp loại Xuất sắc hoặc Tốt khi tốt nghiệp.";
      effectiveProjectedTierLabel = "Khá (Bị giới hạn trần)";
    } else {
      disciplineWarningMessage =
        "Lưu ý Điều 12 Khoản 3: Sinh viên bị kỷ luật cảnh cáo sẽ bị hạ 1 bậc xếp loại tốt nghiệp toàn khóa.";
      effectiveProjectedTierLabel = "Trung bình (Đã hạ 1 bậc)";
    }
  }

  // Actionable Category Roadmap for remaining semesters
  // Standard breakdown to reach requiredAveragePerRemaining:
  const targetPerSem = Math.min(100, Math.max(60, requiredAveragePerRemaining));
  const diffFromBase = Math.max(0, targetPerSem - 60);

  // Allocate diffFromBase to TC3 (up to 20) and TC5 (up to 20)
  const tc3Target = Math.min(20, Math.round(diffFromBase * 0.65 * 10) / 10);
  const tc5Target = Math.min(20, Math.round((diffFromBase - tc3Target) * 10) / 10);

  const categoryRoadmap: CategoryRoadmapAdvice[] = [
    {
      category: 1,
      code: "TC1",
      name: "Ý thức chấp hành nội quy, pháp luật",
      recommendedPoints: 25,
      maxPoints: 25,
      actionGuide: "Giữ trọn 25/25đ mặc định. Đi SHCD đúng giờ, đóng BHYT đúng hạn, mang thẻ SV.",
    },
    {
      category: 2,
      code: "TC2",
      name: "Ý thức học tập & học vụ",
      recommendedPoints: 20,
      maxPoints: 20,
      actionGuide: "Bảo toàn 20/20đ. Không rớt môn (tránh bị trừ -2đ/môn đến -20đ), không vi phạm thi cử.",
    },
    {
      category: 3,
      code: "TC3",
      name: "Phong trào, VHVN, TDTT",
      recommendedPoints: tc3Target,
      maxPoints: 20,
      actionGuide: `Đạt tối thiểu ${tc3Target}đ/20đ: Tham gia ${Math.ceil(tc3Target / 4)} sự kiện/hội thảo cấp trường hoặc khoa (+4đ/sự kiện).`,
    },
    {
      category: 4,
      code: "TC4",
      name: "Phẩm chất công dân & cộng đồng",
      recommendedPoints: 15,
      maxPoints: 15,
      actionGuide: "Giữ 15/15đ mặc định. Tích cực tham gia hoạt động cộng đồng, văn hóa ứng xử tốt.",
    },
    {
      category: 5,
      code: "TC5",
      name: "Cán bộ, NCKH & Thành tích",
      recommendedPoints: tc5Target,
      maxPoints: 20,
      actionGuide: tc5Target > 0
        ? `Cần thêm ${tc5Target}đ: Đảm nhận ban cán sự lớp (+3đ đến +6đ) hoặc tham gia NCKH/SV5T (+5đ đến +10đ).`
        : "Không bắt buộc điểm phụ trợ, chỉ cần duy trì các tiêu chuẩn cơ bản.",
    },
  ];

  return {
    completedCount,
    totalProgramSemesters,
    remainingSemestersCount,
    currentSum,
    currentAverage,
    targetScore: baseTargetScore,
    targetTierLabel,
    pointsNeededTotal,
    requiredAveragePerRemaining,
    isFeasible,
    feasibilityLevel,
    feasibilityLabel,
    feasibilityColor,
    feasibilityBadgeBg,
    disciplineDowngraded,
    disciplineWarningMessage,
    effectiveProjectedTierLabel,
    categoryRoadmap,
  };
}

export function simulateRemainingSemestersScore(
  completedScores: number[],
  simulatedScores: number[]
): {
  overallAverage: number;
  overallRating: { label: string; color: string; badgeBg: string };
  totalSemesters: number;
} {
  const allScores = [...completedScores, ...simulatedScores];
  const totalSemesters = allScores.length;
  if (totalSemesters === 0) {
    return {
      overallAverage: 0,
      overallRating: { label: "Chưa có", color: "text-slate-500", badgeBg: "bg-slate-100 text-slate-700" },
      totalSemesters: 0,
    };
  }

  const sum = allScores.reduce((acc, v) => acc + (Number(v) || 0), 0);
  const overallAverage = Math.round((sum / totalSemesters) * 10) / 10;

  let label = "Yếu";
  let color = "text-rose-600";
  let badgeBg = "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";

  if (overallAverage >= 90) {
    label = "Xuất sắc";
    color = "text-emerald-600";
    badgeBg = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
  } else if (overallAverage >= 80) {
    label = "Tốt";
    color = "text-sky-600";
    badgeBg = "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300";
  } else if (overallAverage >= 70) {
    label = "Khá";
    color = "text-amber-600";
    badgeBg = "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
  } else if (overallAverage >= 50) {
    label = "Trung bình";
    color = "text-orange-600";
    badgeBg = "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300";
  }

  return { overallAverage, overallRating: { label, color, badgeBg }, totalSemesters };
}
