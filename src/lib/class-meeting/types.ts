export interface ClassStudentAssessment {
  id: string;
  mssv: string;
  fullName: string;
  selfScore: number;
  classScore: number;
  rating: "Xuất sắc" | "Tốt" | "Khá" | "Trung bình" | "Yếu" | "Kém";
  note?: string;
  hasDisciplineWarning?: boolean; // Hạ bậc xếp loại theo Điều 12 nếu có
}

export interface ClassMeetingStats {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  averageScore: number;
  counts: {
    xuatSac: number;
    tot: number;
    kha: number;
    trungBinh: number;
    yeu: number;
    kem: number;
  };
  percentages: {
    xuatSac: number;
    tot: number;
    kha: number;
    trungBinh: number;
    yeu: number;
    kem: number;
  };
}

export interface ClassMeetingMetadata {
  className: string;
  facultyName: string;
  academicYear: string;
  semester: string;
  meetingDate: string;
  meetingLocation: string;
  chairperson: string; // Chủ tọa (CVHT hoặc Lớp trưởng)
  secretary: string; // Thư ký
  advisorName: string; // Cố vấn học tập
  classMonitorName: string; // Lớp trưởng
  youthUnionSecretary: string; // Bí thư Chi đoàn
}
