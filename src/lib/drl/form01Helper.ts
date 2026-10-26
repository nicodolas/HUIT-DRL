import { DrlRecord, Semester } from "@/lib/db/schema";
import { ScoreCalculationResult, calculateSemesterScore } from "@/lib/drl/calculator";
import { CATEGORIES, DisciplineLevel } from "@/lib/drl/rules";
import { OFFICIAL_CRITERIA_GROUPS, DetailedCategoryGroup, DetailedCriterionItem } from "./detailedCriteria";

export interface AuditStatsResult {
  total: number;
  valid: number;
  pending: number;
  missing: number;
  rejected: number;
  safetyPercent: number;
  atRiskPoints: number;
  safePoints: number;
}

export function calculateAuditStats(records: DrlRecord[]): AuditStatsResult {
  const nonDefault = records.filter((r) => r.type !== "default");
  const total = nonDefault.length;
  if (total === 0) {
    return {
      total: 0,
      valid: 0,
      pending: 0,
      missing: 0,
      rejected: 0,
      safetyPercent: 100,
      atRiskPoints: 0,
      safePoints: 0,
    };
  }

  let valid = 0;
  let pending = 0;
  let missing = 0;
  let rejected = 0;
  let safePoints = 0;
  let atRiskPoints = 0;

  for (const r of nonDefault) {
    const pts = Math.abs(Number(r.points) * (r.quantity || 1));
    const status = r.auditStatus || (r.evidenceUrl ? "pending_review" : "missing");

    if (status === "valid") {
      valid++;
      safePoints += pts;
    } else if (status === "pending_review") {
      pending++;
      safePoints += pts;
    } else if (status === "rejected") {
      rejected++;
      atRiskPoints += pts;
    } else {
      // missing
      missing++;
      atRiskPoints += pts;
    }
  }

  const safetyPercent = Math.round(((valid + pending) / total) * 100);

  return {
    total,
    valid,
    pending,
    missing,
    rejected,
    safetyPercent,
    atRiskPoints,
    safePoints,
  };
}

export interface DetailedCategoryRow {
  group: DetailedCategoryGroup;
  categoryScore: number;
  maxPoints: number;
  subRows: {
    item: DetailedCriterionItem;
    studentScore: number;
    hasActivities: boolean;
    records: DrlRecord[];
  }[];
}

export function buildDetailedForm01Data(
  records: DrlRecord[],
  disciplineLevel: DisciplineLevel = "none"
): {
  groups: DetailedCategoryRow[];
  scoreSummary: ScoreCalculationResult;
} {
  const scoreSummary = calculateSemesterScore(records, disciplineLevel);

  const groups: DetailedCategoryRow[] = OFFICIAL_CRITERIA_GROUPS.map((grp) => {
    const catRecords = records.filter((r) => r.category === grp.category);
    const catResult = scoreSummary.categories[grp.category] || {
      rawScore: grp.defaultPoints,
      cappedScore: grp.defaultPoints,
      maxPoints: grp.maxPoints,
    };

    const subRows = grp.items.map((item) => {
      if (item.type === "default") {
        return {
          item,
          studentScore: grp.defaultPoints,
          hasActivities: true,
          records: [],
        };
      }

      // Match records by presetId, title keywords, or code
      const matched = catRecords.filter((r) => {
        if (r.presetId && r.presetId.toUpperCase().includes(item.id.replace("TC" + grp.category + "_", ""))) {
          return true;
        }
        const titleLower = (r.title || "").toLowerCase();
        const itemLower = item.title.toLowerCase();

        if (item.id.includes("ROT") && titleLower.includes("rớt")) return true;
        if (item.id.includes("SHCD") && titleLower.includes("shcd")) return true;
        if (item.id.includes("BHYT") && titleLower.includes("bhyt")) return true;
        if (item.id.includes("DONG_PHUC") && (titleLower.includes("thẻ sv") || titleLower.includes("đồng phục"))) return true;
        if (item.id.includes("CO_VU") && titleLower.includes("cổ vũ")) return true;
        if (item.id.includes("SV5T") && (titleLower.includes("sinh viên 5 tốt") || titleLower.includes("sv5t"))) return true;
        if (item.id.includes("NCKH") && titleLower.includes("nckh")) return true;
        if (item.id.includes("CLB") && titleLower.includes("clb")) return true;

        // Generic fallback check
        const words = itemLower.split(" ").filter((w) => w.length > 4);
        return words.some((w) => titleLower.includes(w));
      });

      let studentScore = 0;
      for (const m of matched) {
        studentScore += Number(m.points) * (m.quantity || 1);
      }

      return {
        item,
        studentScore,
        hasActivities: matched.length > 0,
        records: matched,
      };
    });

    return {
      group: grp,
      categoryScore: catResult.cappedScore,
      maxPoints: grp.maxPoints,
      subRows,
    };
  });

  return { groups, scoreSummary };
}

export interface Form01ExportPayload {
  documentTitle: string;
  regulationBasis: string;
  exportedAt: string;
  student: {
    fullName: string;
    username: string;
    studentId?: string;
    faculty?: string;
    className?: string;
  };
  semester: {
    id: string;
    name: string;
    disciplineLevel?: string;
  };
  scoreSummary: {
    totalScore: number;
    rating: string;
    categories: Record<number, { score: number; maxPoints: number; name: string }>;
  };
  classEvaluation: {
    totalClassScore: number;
    categories: Record<number, number>;
  };
  evidenceFolderUrl?: string;
  recordsCount: number;
  records: Array<{
    id: string;
    category: number;
    title: string;
    points: number;
    quantity: number;
    totalPoints: number;
    occurredAt?: string | null;
    evidenceUrl?: string | null;
    auditStatus?: string;
    auditComment?: string | null;
  }>;
}

export function createForm01ExportData(
  student: { fullName: string; username: string; faculty?: string; className?: string },
  semester: Semester,
  scoreSummary: ScoreCalculationResult,
  records: DrlRecord[],
  classScores: Record<number, number>,
  evidenceFolderUrl?: string
): Form01ExportPayload {
  const catSummary: Record<number, { score: number; maxPoints: number; name: string }> = {};
  for (let c = 1; c <= 5; c++) {
    catSummary[c] = {
      score: scoreSummary.categories[c]?.cappedScore || 0,
      maxPoints: CATEGORIES[c].maxPoints,
      name: CATEGORIES[c].name,
    };
  }

  const totalClass = Math.min(
    100,
    Object.values(classScores).reduce((a, b) => a + b, 0)
  );

  return {
    documentTitle: "PHIẾU ĐÁNH GIÁ KẾT QUẢ RÈN LUYỆN SINH VIÊN (MẪU 01)",
    regulationBasis: "Quyết định số 3385/QĐ-DCT ngày 12/8/2026 của Hiệu trưởng Trường Đại học Công Thương TP.HCM",
    exportedAt: new Date().toISOString(),
    student,
    semester: {
      id: semester.id,
      name: semester.name,
      disciplineLevel: semester.disciplineLevel,
    },
    scoreSummary: {
      totalScore: scoreSummary.totalScore,
      rating: scoreSummary.rating.label,
      categories: catSummary,
    },
    classEvaluation: {
      totalClassScore: totalClass,
      categories: classScores,
    },
    evidenceFolderUrl,
    recordsCount: records.length,
    records: records.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      points: Number(r.points),
      quantity: r.quantity || 1,
      totalPoints: Number(r.points) * (r.quantity || 1),
      occurredAt: r.occurredAt,
      evidenceUrl: r.evidenceUrl,
      auditStatus: r.auditStatus || (r.evidenceUrl ? "pending_review" : "missing"),
      auditComment: r.auditComment,
    })),
  };
}
