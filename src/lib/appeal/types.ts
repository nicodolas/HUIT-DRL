export interface DrlAppealData {
  studentName: string;
  studentId: string;
  studentClass: string;
  faculty: string;
  semesterName: string;
  academicYear: string;
  category: number;
  selfScore: number;
  announcedScore: number;
  requestedScore: number;
  reasonPreset: string;
  customExplanation: string;
  evidenceDescription: string;
  submissionDate: string;
}

export interface AppealReasonPreset {
  id: string;
  title: string;
  categoryDefault: number;
  sampleExplanation: string;
  sampleEvidence: string;
}

export const HUIT_APPEAL_PRESETS: AppealReasonPreset[] = [
  {
    id: "attendance_omission",
    title: "Bị ghi nhận vắng mặt dù có tham gia hoạt động cấp Khoa/Trường",
    categoryDefault: 1,
    sampleExplanation: "Em có tham gia đầy đủ buổi Sinh hoạt Công dân - HSSV hoặc Tọa đàm học thuật, tuy nhiên do trục trặc hệ thống quét mã QR điểm danh nên tên em chưa được cập nhật vào danh sách cộng điểm.",
    sampleEvidence: "Ảnh chụp màn hình xác nhận tham gia từ Ban tổ chức / Biên lai điểm danh / Ảnh chụp tại hội trường.",
  },
  {
    id: "research_award",
    title: "Minh chứng NCKH / SV5T / Khen thưởng chưa được cộng điểm",
    categoryDefault: 2,
    sampleExplanation: "Em đã đạt giải hoặc nộp bài báo cáo NCKH / Chứng chỉ Tin học / Ngoại ngữ đạt chuẩn nhưng điểm Tiêu chí 2 của em vẫn giữ nguyên mức mặc định, chưa được cộng bổ sung.",
    sampleEvidence: "Bản sao Giấy chứng nhận giải thưởng NCKH sinh viên cấp Trường / Chứng chỉ hoặc xác nhận của Khoa.",
  },
  {
    id: "volunteer_missing",
    title: "Hoạt động tình nguyện / Chủ nhật xanh chưa được ghi nhận",
    categoryDefault: 4,
    sampleExplanation: "Em đã hoàn thành chiến dịch Mùa Hè Xanh / Tiếp Sức Mùa Thi / Ngày Chủ nhật xanh nhưng Ban cán sự lớp chưa đối soát kịp danh sách minh chứng dẫn đến thiếu điểm Tiêu chí 4.",
    sampleEvidence: "Giấy chứng nhận tình nguyện do Đoàn - Hội cấp / Xác nhận của Bí thư Đoàn Khoa.",
  },
  {
    id: "mistaken_deduction",
    title: "Bị trừ điểm nhầm lẫn biên bản kỷ luật hoặc trùng họ tên",
    categoryDefault: 3,
    sampleExplanation: "Em nhận thấy mình bị trừ điểm do trùng họ tên với một bạn sinh viên khác trong danh sách vi phạm nề nếp thi cử hoặc quy chế giảng đường.",
    sampleEvidence: "Xác nhận không vi phạm từ Cố vấn học tập và Ban quản lý giảng đường.",
  },
  {
    id: "class_meeting_discrepancy",
    title: "Điểm họp lớp đánh giá chênh lệch so với Form 01 tự chấm",
    categoryDefault: 1,
    sampleExplanation: "Trong buổi họp xét ĐRL lớp, điểm của em bị điều chỉnh giảm so với phiếu tự chấm Form 01 nhưng em không được thông báo lý do cụ thể theo quy định tại Điều 9 QĐ 3385/QĐ-DCT.",
    sampleEvidence: "Phiếu tự chấm Form 01 lưu trữ trên hệ thống và các minh chứng đính kèm tương ứng.",
  },
];

