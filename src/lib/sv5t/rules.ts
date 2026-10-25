/**
 * HUIT "Sinh Viên 5 Tốt" (SV5T) Evaluation Rules Engine
 * Standards established by Hội Sinh viên Việt Nam & HUIT Đoàn - Hội Sinh viên.
 */

import { DrlRecord } from "@/lib/db/schema";
import { DisciplineLevel } from "@/lib/drl/rules";

export interface Sv5tCriterionItem {
  id: string;
  name: string;
  description: string;
  isMet: boolean;
  isRequired: boolean;
  evidenceHint: string;
}

export interface Sv5tPillar {
  pillarId: "dao_duc" | "hoc_tap" | "the_luc" | "tinh_nguyen" | "hoi_nhap";
  title: string;
  shortDesc: string;
  iconName: string;
  isPassed: boolean;
  passedCount: number;
  totalRequired: number;
  items: Sv5tCriterionItem[];
}

export interface Sv5tEvaluationResult {
  isQualified: boolean;
  qualifiedLevel: "trương" | "khoa" | "none";
  passedPillarsCount: number;
  totalPillars: 5;
  pillars: Sv5tPillar[];
  recommendations: string[];
}

export interface Sv5tInputs {
  drlScore: number;
  disciplineLevel: DisciplineLevel | string;
  gpa: number;
  records: DrlRecord[];
  hasFailedCourse?: boolean;
  hasFitnessCertificate?: boolean;
  hasForeignLangCert?: boolean;
}

export function evaluateSv5t(inputs: Sv5tInputs): Sv5tEvaluationResult {
  const {
    drlScore,
    disciplineLevel = "none",
    gpa,
    records,
    hasFailedCourse = false,
    hasFitnessCertificate = false,
    hasForeignLangCert = false,
  } = inputs;

  const hasDiscipline = disciplineLevel && disciplineLevel !== "none";

  // Check keywords in logged activities
  const activityNames = records.map((r) => ((r.title || "") + " " + (r.note || "")).toLowerCase());

  const hasVolunteerActivity = activityNames.some((name) =>
    name.includes("mùa hè xanh") ||
    name.includes("xuân tình nguyện") ||
    name.includes("tiếp sức mùa thi") ||
    name.includes("hiến máu") ||
    name.includes("tình nguyện") ||
    name.includes("chủ nhật xanh")
  );

  const tc3RecordsCount = records.filter((r) => r.category === 3).length;

  const hasAcademicContest = activityNames.some((name) =>
    name.includes("nckh") ||
    name.includes("nghiên cứu khoa học") ||
    name.includes("olympic") ||
    name.includes("học thuật") ||
    name.includes("seminar") ||
    name.includes("ý tưởng sáng tạo")
  );

  const hasSportsActivity = activityNames.some((name) =>
    name.includes("hội thao") ||
    name.includes("giải bóng") ||
    name.includes("chạy bộ") ||
    name.includes("marathon") ||
    name.includes("cầu lông") ||
    name.includes("thể dục") ||
    name.includes("thanh niên khỏe")
  ) || hasFitnessCertificate;

  const hasIntegrationActivity = activityNames.some((name) =>
    name.includes("tiếng anh") ||
    name.includes("toeic") ||
    name.includes("ielts") ||
    name.includes("kỹ năng") ||
    name.includes("hội nhập") ||
    name.includes("giao lưu quốc tế") ||
    name.includes("workshop")
  ) || hasForeignLangCert;

  // 1. ĐẠO ĐỨC TỐT
  const daoDucItems: Sv5tCriterionItem[] = [
    {
      id: "dd_drl",
      name: "Điểm rèn luyện đạt từ 80 điểm trở lên",
      description: "ĐRL học kỳ hoặc năm học đạt mức Tốt hoặc Xuất sắc",
      isMet: drlScore >= 80,
      isRequired: true,
      evidenceHint: "Bảng điểm rèn luyện xác nhận bởi Nhà trường",
    },
    {
      id: "dd_no_discipline",
      name: "Không vi phạm quy chế, kỷ luật",
      description: "Không bị kỷ luật từ mức Khiển trách trở lên",
      isMet: !hasDiscipline,
      isRequired: true,
      evidenceHint: "Xác nhận tư cách sinh viên từ Cố vấn học tập",
    },
  ];
  const isDaoDucPassed = daoDucItems.every((item) => item.isMet);

  // 2. HỌC TẬP TỐT
  const hocTapItems: Sv5tCriterionItem[] = [
    {
      id: "ht_gpa",
      name: "Điểm trung bình tích lũy GPA ≥ 2.80",
      description: "Mức Khá/Giỏi theo thang điểm tín chỉ 4.0",
      isMet: gpa >= 2.80,
      isRequired: true,
      evidenceHint: "Bảng điểm học tập chính thức",
    },
    {
      id: "ht_no_fail",
      name: "Không nợ môn trong kỳ/năm xét duyệt",
      description: "Đã hoàn thành các học phần đăng ký",
      isMet: !hasFailedCourse,
      isRequired: true,
      evidenceHint: "Bảng điểm không có điểm F",
    },
    {
      id: "ht_academic_event",
      name: "Tham gia NCKH hoặc cuộc thi học thuật",
      description: "Đề tài NCKH, Olympic sinh viên, hoặc hội thảo chuyên môn",
      isMet: hasAcademicContest,
      isRequired: false,
      evidenceHint: "Giấy chứng nhận tham gia NCKH hoặc giải học thuật",
    },
  ];
  const isHocTapPassed = hocTapItems[0].isMet && hocTapItems[1].isMet;

  // 3. THỂ LỰC TỐT
  const theLucItems: Sv5tCriterionItem[] = [
    {
      id: "tl_activity",
      name: "Tham gia Hội thao / Đạt tiêu chuẩn rèn luyện thể lực",
      description: "Tham gia Hội thao sinh viên HUIT hoặc giải thể thao cấp Khoa trở lên",
      isMet: hasSportsActivity,
      isRequired: true,
      evidenceHint: "Giấy chứng nhận hội thao hoặc thẻ VĐV giải chạy",
    },
  ];
  const isTheLucPassed = theLucItems.every((item) => item.isMet);

  // 4. TÌNH NGUYỆN TỐT
  const tinhNguyenItems: Sv5tCriterionItem[] = [
    {
      id: "tn_campaign",
      name: "Tham gia Chiến dịch tình nguyện lớn hoặc ≥ 3 hoạt động TC3",
      description: "Mùa hè xanh, Tiếp sức mùa thi, Xuân tình nguyện, Hiến máu nhân đạo",
      isMet: hasVolunteerActivity || tc3RecordsCount >= 3,
      isRequired: true,
      evidenceHint: "Giấy chứng nhận chiến dịch tình nguyện hoặc giấy hiến máu",
    },
  ];
  const isTinhNguyenPassed = tinhNguyenItems.every((item) => item.isMet);

  // 5. HỘI NHẬP TỐT
  const hoiNhapItems: Sv5tCriterionItem[] = [
    {
      id: "hn_skills_or_lang",
      name: "Chứng chỉ ngoại ngữ / Tin học / Tập huấn kỹ năng",
      description: "TOEIC/IELTS/VSTEP, chứng chỉ tin học MOS, hoặc workshop kỹ năng mềm",
      isMet: hasIntegrationActivity,
      isRequired: true,
      evidenceHint: "Chứng chỉ hoặc chứng nhận tham gia workshop hội nhập",
    },
  ];
  const isHoiNhapPassed = hoiNhapItems.every((item) => item.isMet);

  const pillars: Sv5tPillar[] = [
    {
      pillarId: "dao_duc",
      title: "1. Đạo Đức Tốt",
      shortDesc: "ĐRL ≥ 80đ & Không kỷ luật",
      iconName: "ShieldCheck",
      isPassed: isDaoDucPassed,
      passedCount: daoDucItems.filter((i) => i.isMet).length,
      totalRequired: daoDucItems.length,
      items: daoDucItems,
    },
    {
      pillarId: "hoc_tap",
      title: "2. Học Tập Tốt",
      shortDesc: "GPA ≥ 2.80 & Không nợ môn",
      iconName: "BookOpen",
      isPassed: isHocTapPassed,
      passedCount: hocTapItems.filter((i) => i.isMet).length,
      totalRequired: 2,
      items: hocTapItems,
    },
    {
      pillarId: "the_luc",
      title: "3. Thể Lực Tốt",
      shortDesc: "Hội thao / Thể dục thể thao",
      iconName: "Activity",
      isPassed: isTheLucPassed,
      passedCount: theLucItems.filter((i) => i.isMet).length,
      totalRequired: 1,
      items: theLucItems,
    },
    {
      pillarId: "tinh_nguyen",
      title: "4. Tình Nguyện Tốt",
      shortDesc: "Chiến dịch tình nguyện / Hiến máu",
      iconName: "HeartHandshake",
      isPassed: isTinhNguyenPassed,
      passedCount: tinhNguyenItems.filter((i) => i.isMet).length,
      totalRequired: 1,
      items: tinhNguyenItems,
    },
    {
      pillarId: "hoi_nhap",
      title: "5. Hội Nhập Tốt",
      shortDesc: "Ngoại ngữ / Tin học / Kỹ năng mềm",
      iconName: "Globe",
      isPassed: isHoiNhapPassed,
      passedCount: hoiNhapItems.filter((i) => i.isMet).length,
      totalRequired: 1,
      items: hoiNhapItems,
    },
  ];

  const passedPillarsCount = pillars.filter((p) => p.isPassed).length;
  const isQualified = passedPillarsCount === 5;

  let qualifiedLevel: "trương" | "khoa" | "none" = "none";
  if (isQualified) {
    // Trường level requires higher GPA (>= 3.2) or DRL (>= 90)
    qualifiedLevel = gpa >= 3.20 && drlScore >= 85 ? "trương" : "khoa";
  }

  // Generate actionable recommendations
  const recommendations: string[] = [];
  if (!isDaoDucPassed) {
    if (drlScore < 80) recommendations.push(`Cần thêm ${80 - drlScore} điểm rèn luyện để đạt tối thiểu 80đ (Loại Tốt).`);
    if (hasDiscipline) recommendations.push("Bạn có quyết định kỷ luật chưa được xóa bỏ, không đủ điều kiện xét danh hiệu.");
  }
  if (!isHocTapPassed) {
    if (gpa < 2.80) recommendations.push(`GPA hiện tại (${gpa.toFixed(2)}) chưa đạt ngưỡng tối thiểu 2.80.`);
    if (hasFailedCourse) recommendations.push("Cần hoàn thành cải thiện các học phần còn nợ để đảm bảo không rớt môn.");
  }
  if (!isTheLucPassed) {
    recommendations.push("Ghi nhận thêm hoạt động Thể thao / Hội thao sinh viên HUIT để hoàn tất tiêu chuẩn Thể lực.");
  }
  if (!isTinhNguyenPassed) {
    recommendations.push("Tham gia 1 chiến dịch tình nguyện (Mùa hè xanh, Xuân tình nguyện, Hiến máu) hoặc thêm các hoạt động Tiêu chí 3.");
  }
  if (!isHoiNhapPassed) {
    recommendations.push("Bổ sung chứng chỉ ngoại ngữ (TOEIC/IELTS/VSTEP) hoặc workshop kỹ năng hội nhập quốc tế.");
  }

  return {
    isQualified,
    qualifiedLevel,
    passedPillarsCount,
    totalPillars: 5,
    pillars,
    recommendations,
  };
}
