export interface CategoryMeta {
  id: number;
  code: string;
  name: string;
  shortName: string;
  maxPoints: number;
  defaultPoints: number;
  color: string;
  description: string;
}

export const CATEGORIES: Record<number, CategoryMeta> = {
  1: {
    id: 1,
    code: "TC1",
    name: "Ý thức chấp hành pháp luật và nội quy, quy chế",
    shortName: "Chấp hành nội quy",
    maxPoints: 25,
    defaultPoints: 25,
    color: "#003366",
    description: "Mặc định +25đ. Trừ điểm khi vi phạm SHCD, BHYT, đồng phục, tài chính, nội quy trường.",
  },
  2: {
    id: 2,
    code: "TC2",
    name: "Ý thức và thái độ trong học tập",
    shortName: "Học tập & Học vụ",
    maxPoints: 20,
    defaultPoints: 20,
    color: "#0284c7",
    description: "Mặc định +20đ. Trừ điểm khi thi rớt môn (-2đ/môn đến -20đ), vi phạm học vụ.",
  },
  3: {
    id: 3,
    code: "TC3",
    name: "Hoạt động chính trị - xã hội, VHVN, TDTT",
    shortName: "Phong trào & Hoạt động",
    maxPoints: 20,
    defaultPoints: 0,
    color: "#f37021",
    description: "Cộng điểm khi tham gia sự kiện (+4đ), thi VHVN-TDTT (+4đ đến +6đ), cổ vũ (+2đ). Trần 20đ.",
  },
  4: {
    id: 4,
    code: "TC4",
    name: "Trách nhiệm công dân trong quan hệ cộng đồng",
    shortName: "Quan hệ cộng đồng",
    maxPoints: 15,
    defaultPoints: 15,
    color: "#10b981",
    description: "Mặc định +15đ. Trừ 15đ nếu phát ngôn sai lệch trên MXH hoặc vi phạm an ninh trật tự.",
  },
  5: {
    id: 5,
    code: "TC5",
    name: "Công tác cán bộ lớp, đoàn thể, NCKH, thành tích xuất sắc",
    shortName: "Cán bộ, NCKH & Khen thưởng",
    maxPoints: 20,
    defaultPoints: 0,
    color: "#8b5cf6",
    description: "Cán bộ lớp/đoàn thể (+3 đến +10đ), giải NCKH (+4 đến +20đ), SV5T (+5đ đến +10đ), like/bình chọn (+1đ, +2đ).",
  },
};

export type DisciplineLevel = "none" | "khien_trach" | "canh_cao" | "dinh_chi";

export interface RatingResult {
  code: "xuat_sac" | "tot" | "kha" | "trung_binh" | "yeu" | "kem" | "khong_danh_gia";
  label: string;
  color: string;
  badgeBg: string;
  note?: string;
}

export function determineRating(score: number, discipline: DisciplineLevel = "none"): RatingResult {
  if (discipline === "dinh_chi") {
    return {
      code: "khong_danh_gia",
      label: "Không đánh giá",
      color: "#6b7280",
      badgeBg: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      note: "Do bị kỷ luật mức đình chỉ học tập",
    };
  }

  let code: RatingResult["code"] = score < 35 ? "kem" : "yeu";
  let label = score < 35 ? "Kém" : "Yếu";
  let color = score < 35 ? "#dc2626" : "#ef4444";
  let badgeBg =
    score < 35
      ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400"
      : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400";

  if (score >= 90) {
    code = "xuat_sac";
    label = "Xuất sắc";
    color = "#10b981";
    badgeBg = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400";
  } else if (score >= 80) {
    code = "tot";
    label = "Tốt";
    color = "#0284c7";
    badgeBg = "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-400";
  } else if (score >= 70) {
    code = "kha";
    label = "Khá";
    color = "#f59e0b";
    badgeBg = "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400";
  } else if (score >= 50) {
    code = "trung_binh";
    label = "Trung bình";
    color = "#f97316";
    badgeBg = "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400";
  }

  // Điều 7.2: Ràng buộc kỷ luật
  if (discipline === "khien_trach" && (code === "xuat_sac" || code === "tot")) {
    return {
      code: "kha",
      label: "Khá",
      color: "#f59e0b",
      badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400",
      note: "Hạ xuống loại Khá do bị kỷ luật Khiển trách",
    };
  }

  if (discipline === "canh_cao" && (code === "xuat_sac" || code === "tot" || code === "kha")) {
    return {
      code: "trung_binh",
      label: "Trung bình",
      color: "#f97316",
      badgeBg: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400",
      note: "Hạ xuống loại Trung bình do bị kỷ luật Cảnh cáo",
    };
  }

  return { code, label, color, badgeBg };
}

