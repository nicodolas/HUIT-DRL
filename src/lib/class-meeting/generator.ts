import { ClassStudentAssessment, ClassMeetingStats } from "./types";

export function determineClassRating(score: number, hasDisciplineWarning: boolean = false): ClassStudentAssessment["rating"] {
  let initial: ClassStudentAssessment["rating"] = "Kém";
  if (score >= 90) initial = "Xuất sắc";
  else if (score >= 80) initial = "Tốt";
  else if (score >= 65) initial = "Khá";
  else if (score >= 50) initial = "Trung bình";
  else if (score >= 35) initial = "Yếu";
  else initial = "Kém";

  if (!hasDisciplineWarning) return initial;

  // Hạ 1 bậc xếp loại nếu có kỷ luật
  switch (initial) {
    case "Xuất sắc":
      return "Tốt";
    case "Tốt":
      return "Khá";
    case "Khá":
      return "Trung bình";
    case "Trung bình":
      return "Yếu";
    case "Yếu":
    case "Kém":
      return "Kém";
  }
}

export function computeClassMeetingStats(
  roster: ClassStudentAssessment[],
  presentCount?: number
): ClassMeetingStats {
  const total = roster.length;
  if (total === 0) {
    return {
      totalStudents: 0,
      presentCount: 0,
      absentCount: 0,
      averageScore: 0,
      counts: { xuatSac: 0, tot: 0, kha: 0, trungBinh: 0, yeu: 0, kem: 0 },
      percentages: { xuatSac: 0, tot: 0, kha: 0, trungBinh: 0, yeu: 0, kem: 0 },
    };
  }

  const counts = {
    xuatSac: 0,
    tot: 0,
    kha: 0,
    trungBinh: 0,
    yeu: 0,
    kem: 0,
  };

  let sum = 0;
  for (const s of roster) {
    sum += s.classScore;
    switch (s.rating) {
      case "Xuất sắc":
        counts.xuatSac++;
        break;
      case "Tốt":
        counts.tot++;
        break;
      case "Khá":
        counts.kha++;
        break;
      case "Trung bình":
        counts.trungBinh++;
        break;
      case "Yếu":
        counts.yeu++;
        break;
      case "Kém":
        counts.kem++;
        break;
    }
  }

  const present = presentCount !== undefined ? Math.min(total, presentCount) : total;

  return {
    totalStudents: total,
    presentCount: present,
    absentCount: Math.max(0, total - present),
    averageScore: Math.round((sum / total) * 10) / 10,
    counts,
    percentages: {
      xuatSac: Math.round((counts.xuatSac / total) * 1000) / 10,
      tot: Math.round((counts.tot / total) * 1000) / 10,
      kha: Math.round((counts.kha / total) * 1000) / 10,
      trungBinh: Math.round((counts.trungBinh / total) * 1000) / 10,
      yeu: Math.round((counts.yeu / total) * 1000) / 10,
      kem: Math.round((counts.kem / total) * 1000) / 10,
    },
  };
}

export function generateSampleClassRoster(
  currentStudent: { mssv?: string; fullName: string; currentScore: number },
  className: string = "12DHTH01"
): ClassStudentAssessment[] {
  const baseStudents: Omit<ClassStudentAssessment, "rating">[] = [
    {
      id: "std-curr",
      mssv: currentStudent.mssv || "2001210001",
      fullName: currentStudent.fullName,
      selfScore: currentStudent.currentScore,
      classScore: currentStudent.currentScore,
      note: "Đầy đủ minh chứng hợp lệ",
    },
    {
      id: "std-1",
      mssv: "2001210012",
      fullName: "Nguyễn Văn An",
      selfScore: 92,
      classScore: 92,
      note: "Ủy viên BCH Chi đoàn, SV5T cấp trường",
    },
    {
      id: "std-2",
      mssv: "2001210045",
      fullName: "Trần Thị Bích",
      selfScore: 85,
      classScore: 84,
      note: "Tham gia tình nguyện Mùa Hè Xanh",
    },
    {
      id: "std-3",
      mssv: "2001210088",
      fullName: "Lê Hoàng Cường",
      selfScore: 78,
      classScore: 75,
      note: "Vắng 1 buổi sinh hoạt chuyên đề",
    },
    {
      id: "std-4",
      mssv: "2001210103",
      fullName: "Phạm Minh Đức",
      selfScore: 88,
      classScore: 86,
      note: "Thành viên CLB Tin học HUIT",
    },
    {
      id: "std-5",
      mssv: "2001210156",
      fullName: "Võ Thị Ánh Hạnh",
      selfScore: 68,
      classScore: 68,
      note: "",
    },
    {
      id: "std-6",
      mssv: "2001210199",
      fullName: "Đỗ Quốc Huy",
      selfScore: 58,
      classScore: 55,
      note: "Thiếu minh chứng phong trào",
    },
    {
      id: "std-7",
      mssv: "2001210234",
      fullName: "Ngô Gia Khiêm",
      selfScore: 45,
      classScore: 42,
      note: "Cảnh cáo học tập HK trước",
      hasDisciplineWarning: true,
    },
    {
      id: "std-8",
      mssv: "2001210280",
      fullName: "Bùi Mai Lan",
      selfScore: 95,
      classScore: 94,
      note: "Giải Nhì NCKH cấp Trường HUIT",
    },
    {
      id: "std-9",
      mssv: "2001210310",
      fullName: "Huỳnh Tấn Phát",
      selfScore: 72,
      classScore: 70,
      note: "",
    },
  ];

  return baseStudents.map((s) => ({
    ...s,
    rating: determineClassRating(s.classScore, s.hasDisciplineWarning),
  }));
}
