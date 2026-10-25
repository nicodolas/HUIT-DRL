import { DrlAppealData } from "./types";

export function formatHuitAppealText(data: DrlAppealData): string {
  return `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
---------------------------------

ĐƠN KHIẾU NẠI VỀ KẾT QUẢ ĐÁNH GIÁ ĐIỂM RÈN LUYỆN
(Căn cứ Điều 13, Quyết định số 3385/QĐ-DCT của Hiệu trưởng Trường Đại học Công Thương TP.HCM)

Kính gửi:
- Ban Chủ nhiệm ${data.faculty}
- Cố vấn học tập lớp ${data.studentClass}
- Hội đồng Đánh giá Điểm rèn luyện cấp Khoa

Tên em là: ${data.studentName}
Mã số sinh viên: ${data.studentId}
Lớp sinh hoạt: ${data.studentClass}
Khoa đào tạo: ${data.faculty}
Học kỳ khiếu nại: ${data.semesterName} - Năm học ${data.academicYear}

Nay em làm đơn này kính xin Thầy/Cô xem xét lại kết quả đánh giá điểm rèn luyện của em ở Tiêu chí số ${data.category}, với các nội dung cụ thể như sau:

1. Kết quả điểm hiện tại:
- Điểm sinh viên tự chấm (Form 01): ${data.selfScore} điểm
- Điểm công bố hiện tại: ${data.announcedScore} điểm
- Điểm đề nghị thẩm định lại: ${data.requestedScore} điểm

2. Lý do khiếu nại:
${data.reasonPreset}

3. Giải trình chi tiết:
${data.customExplanation}

4. Minh chứng hợp lệ kèm theo:
${data.evidenceDescription}

Căn cứ theo Điều 13 Quyết định số 3385/QĐ-DCT về quyền khiếu nại của sinh viên, em kính mong Ban Chủ nhiệm Khoa, Cố vấn học tập và Hội đồng đánh giá xem xét, đối chiếu lại minh chứng để điều chỉnh điểm rèn luyện đúng với nỗ lực và quá trình rèn luyện thực tế của em.

Em xin chân thành cảm ơn Quý Thầy/Cô!

TP. Hồ Chí Minh, ngày ${data.submissionDate}
Người làm đơn
(Ký và ghi rõ họ tên)

${data.studentName}`;
}
