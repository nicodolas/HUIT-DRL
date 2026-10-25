import { CATEGORIES, DisciplineLevel, determineRating, RatingResult } from "./rules";
import { DrlRecord } from "../db/schema";

export interface CategoryScoreResult {
  category: number;
  rawScore: number;
  cappedScore: number;
  maxPoints: number;
  defaultPoints: number;
  remainingCapacity: number;
  recordsCount: number;
}

export interface ScoreCalculationResult {
  totalScore: number;
  rating: RatingResult;
  categories: Record<number, CategoryScoreResult>;
  totalDefaultPoints: number;
  totalEarnedPoints: number;
  totalDeductedPoints: number;
}

export interface GoalSuggestion {
  category: number;
  title: string;
  remainingCapacity: number;
  advice: string[];
}

export interface GoalAnalysisResult {
  targetScore: number;
  currentScore: number;
  gap: number;
  isAchieved: boolean;
  completionPercent: number;
  suggestions: GoalSuggestion[];
}

export function calculateSemesterScore(
  records: DrlRecord[],
  disciplineLevel: DisciplineLevel = "none"
): ScoreCalculationResult {
  const categoryResults: Record<number, CategoryScoreResult> = {};
  let totalDeducted = 0;
  let totalEarned = 0;

  for (let cat = 1; cat <= 5; cat++) {
    const meta = CATEGORIES[cat];
    let sum = meta.defaultPoints;
    let count = 0;

    for (const r of records) {
      if (r.category === cat) {
        count++;
        const pts = Number(r.points) * (r.quantity || 1);
        if (r.type !== "default") {
          sum += pts;
          if (pts > 0) totalEarned += pts;
          else totalDeducted += Math.abs(pts);
        }
      }
    }

    const capped = Math.max(0, Math.min(meta.maxPoints, Math.round(sum * 10) / 10));
    categoryResults[cat] = {
      category: cat,
      rawScore: Math.round(sum * 10) / 10,
      cappedScore: capped,
      maxPoints: meta.maxPoints,
      defaultPoints: meta.defaultPoints,
      remainingCapacity: Math.max(0, meta.maxPoints - capped),
      recordsCount: count,
    };
  }

  const rawTotal = Object.values(categoryResults).reduce((acc, c) => acc + c.cappedScore, 0);
  const totalScore = Math.min(100, Math.max(0, Math.round(rawTotal * 10) / 10));
  const rating = determineRating(totalScore, disciplineLevel);

  return {
    totalScore,
    rating,
    categories: categoryResults,
    totalDefaultPoints: 60,
    totalEarnedPoints: totalEarned,
    totalDeductedPoints: totalDeducted,
  };
}

export function analyzeGoalGap(
  currentScore: number,
  targetScore: number,
  categories: Record<number, CategoryScoreResult>
): GoalAnalysisResult {
  const gap = Math.max(0, targetScore - currentScore);
  const isAchieved = currentScore >= targetScore;
  const completionPercent = Math.min(100, Math.round((currentScore / targetScore) * 100));

  const suggestions: GoalSuggestion[] = [];

  // Gợi ý cho TC3 (Hoạt động phong trào)
  if (categories[3] && categories[3].remainingCapacity > 0) {
    const rem = categories[3].remainingCapacity;
    const advice: string[] = [];
    if (rem >= 6) advice.push("Tham gia 1 cuộc thi VHVN - TDTT cấp Trường (+6đ)");
    if (rem >= 4) advice.push("Tham gia 1 sự kiện chính trị / hội thi cấp Khoa (+4đ)");
    if (rem >= 2) advice.push("Đi cổ vũ các hoạt động thể thao, văn nghệ (+2đ)");
    suggestions.push({
      category: 3,
      title: "Tiêu chí 3: Tham gia Hoạt động & Phong trào",
      remainingCapacity: rem,
      advice,
    });
  }

  // Gợi ý cho TC5 (Cán bộ lớp, CLB, NCKH)
  if (categories[5] && categories[5].remainingCapacity > 0) {
    const rem = categories[5].remainingCapacity;
    const advice: string[] = [];
    if (rem >= 3) advice.push("Tham gia hoạt động CLB/đội nhóm thường xuyên (+3đ/kỳ)");
    if (rem >= 5) advice.push("Tham dự Hội thảo, chuyên đề NCKH cấp Trường (+5đ/chuyên đề)");
    if (rem >= 2) advice.push("Tương tác bình chọn, like các cuộc thi cấp Trường (+2đ/lần)");
    if (rem >= 5) advice.push("Đạt danh hiệu Sinh viên 5 tốt cấp Trường (+5đ)");
    suggestions.push({
      category: 5,
      title: "Tiêu chí 5: Hoạt động Đoàn - Hội, CLB & NCKH",
      remainingCapacity: rem,
      advice,
    });
  }

  // Cảnh báo giữ điểm TC1 & TC2
  if (categories[1] && categories[1].cappedScore < 25) {
    suggestions.push({
      category: 1,
      title: "Tiêu chí 1: Khắc phục điểm trừ nội quy",
      remainingCapacity: categories[1].remainingCapacity,
      advice: ["Chú ý hoàn thành BHYT, SHCD, khám sức khỏe và trang phục đúng quy định để không bị trừ điểm."],
    });
  }

  if (categories[2] && categories[2].cappedScore < 20) {
    suggestions.push({
      category: 2,
      title: "Tiêu chí 2: Cải thiện kết quả học tập",
      remainingCapacity: categories[2].remainingCapacity,
      advice: ["Tập trung ôn tập thi kết thúc học phần để tránh bị rớt môn (-2đ đến -20đ)."],
    });
  }

  return {
    targetScore,
    currentScore,
    gap,
    isAchieved,
    completionPercent,
    suggestions,
  };
}

