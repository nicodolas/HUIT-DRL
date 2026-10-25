"use client";

import React, { useState } from "react";
import { X, Users, Award, FileText, Printer, Check, Plus, Trash2, SlidersHorizontal } from "lucide-react";
import { ClassStudentAssessment, ClassMeetingMetadata } from "@/lib/class-meeting/types";
import { computeClassMeetingStats, determineClassRating, generateSampleClassRoster } from "@/lib/class-meeting/generator";
import { triggerHaptic } from "@/lib/native/platform";

interface ClassMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    fullName: string;
    studentId?: string;
    className?: string;
    faculty?: string;
  };
  currentScore: number;
  currentSemester: string;
  currentYear: string;
}

export function ClassMeetingModal({
  isOpen,
  onClose,
  currentUser,
  currentScore,
  currentSemester,
  currentYear,
}: ClassMeetingModalProps) {
  const [activeTab, setActiveTab] = useState<"roster" | "stats" | "minutes">("roster");
  const [roster, setRoster] = useState<ClassStudentAssessment[]>(() =>
    generateSampleClassRoster(
      {
        mssv: currentUser.studentId,
        fullName: currentUser.fullName,
        currentScore,
      },
      currentUser.className || "12DHTH01"
    )
  );

  const [metadata, setMetadata] = useState<ClassMeetingMetadata>({
    className: currentUser.className || "12DHTH01",
    facultyName: currentUser.faculty || "Khoa Công Nghệ Thông Tin",
    academicYear: currentYear || "2024-2025",
    semester: currentSemester || "Học kỳ 1",
    meetingDate: new Date().toLocaleDateString("vi-VN"),
    meetingLocation: "Phòng học B.302 (hoặc MS Teams)",
    chairperson: "Cố vấn học tập & Lớp trưởng",
    secretary: "Bí thư Chi đoàn",
    advisorName: "TS. Nguyễn Văn Hướng (CVHT)",
    classMonitorName: currentUser.fullName,
    youthUnionSecretary: "Trần Thị Bích",
  });

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const stats = computeClassMeetingStats(roster);

  const handleScoreChange = (id: string, newScore: number) => {
    setRoster((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const boundedScore = Math.max(0, Math.min(100, Math.round(newScore)));
        return {
          ...s,
          classScore: boundedScore,
          rating: determineClassRating(boundedScore, s.hasDisciplineWarning),
        };
      })
    );
  };

  const handleToggleDiscipline = (id: string) => {
    triggerHaptic("warning");
    setRoster((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextWarning = !s.hasDisciplineWarning;
        return {
          ...s,
          hasDisciplineWarning: nextWarning,
          rating: determineClassRating(s.classScore, nextWarning),
        };
      })
    );
  };

  const handleDeleteStudent = (id: string) => {
    triggerHaptic("light");
    setRoster((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddStudent = () => {
    triggerHaptic("light");
    const nextNum = roster.length + 1;
    const newStudent: ClassStudentAssessment = {
      id: `std-${Date.now()}`,
      mssv: `2001210${nextNum < 10 ? "0" + nextNum : nextNum}`,
      fullName: `Sinh viên mới ${nextNum}`,
      selfScore: 75,
      classScore: 75,
      rating: "Khá",
      note: "",
    };
    setRoster((prev) => [...prev, newStudent]);
  };

  const handleCopyMinutes = () => {
    triggerHaptic("success");
    const text = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nTRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP. HỒ CHÍ MINH (HUIT)\n${metadata.facultyName}\nLớp: ${metadata.className}\n\nBIÊN BẢN HỌP ĐÁNH GIÁ ĐIỂM RÈN LUYỆN\n${metadata.semester} - Năm học ${metadata.academicYear}\n\n1. Thời gian & Địa điểm: ${metadata.meetingDate} tại ${metadata.meetingLocation}\n2. Sĩ số: ${stats.presentCount}/${stats.totalStudents} sinh viên tham gia\n3. Chủ tọa: ${metadata.chairperson} | Thư ký: ${metadata.secretary}\n4. Kết quả phân loại điểm rèn luyện:\n- Xuất sắc (>=90đ): ${stats.counts.xuatSac} SV (${stats.percentages.xuatSac}%)\n- Tốt (80-89đ): ${stats.counts.tot} SV (${stats.percentages.tot}%)\n- Khá (65-79đ): ${stats.counts.kha} SV (${stats.percentages.kha}%)\n- Trung bình (50-64đ): ${stats.counts.trungBinh} SV (${stats.percentages.trungBinh}%)\n- Yếu (35-49đ): ${stats.counts.yeu} SV (${stats.percentages.yeu}%)\n- Kém (<35đ): ${stats.counts.kem} SV (${stats.percentages.kem}%)\nĐiểm trung bình toàn lớp: ${stats.averageScore}/100`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRatingBadge = (rating: ClassStudentAssessment["rating"]) => {
    switch (rating) {
      case "Xuất sắc":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "Tốt":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
      case "Khá":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
      case "Trung bình":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
      case "Yếu":
      case "Kém":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Ban Cán Sự: Họp Lớp & Biên Bản ĐRL (Điều 9-10)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tổng hợp điểm lớp, thống kê phân loại và lập biên bản họp xét ĐRL theo QĐ 3385/QĐ-DCT
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-white dark:bg-slate-900">
          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("roster");
            }}
            className={`py-3 px-4 font-semibold text-xs sm:text-sm border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === "roster"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Danh sách Lớp ({roster.length})</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("stats");
            }}
            className={`py-3 px-4 font-semibold text-xs sm:text-sm border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === "stats"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Thống Kê Phân Loại</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("minutes");
            }}
            className={`py-3 px-4 font-semibold text-xs sm:text-sm border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === "minutes"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Biên Bản Họp Lớp (Mẫu A4)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: ROSTER */}
          {activeTab === "roster" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-200 dark:border-blue-800/40">
                <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                  💡 <strong>Quy trình Họp lớp (Điều 9):</strong> Ban cán sự và tập thể lớp rà soát minh chứng, biểu quyết thống nhất điểm từng sinh viên. Nếu có kỷ luật cảnh cáo trở lên, đánh dấu để hạ bậc xếp loại.
                </div>
                <button
                  onClick={handleAddStudent}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Sinh Viên</span>
                </button>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">MSSV</th>
                      <th className="py-2.5 px-3">Họ và Tên</th>
                      <th className="py-2.5 px-3 text-center">SV Tự Chấm</th>
                      <th className="py-2.5 px-3 text-center">Lớp Chấm</th>
                      <th className="py-2.5 px-3 text-center">Xếp Loại</th>
                      <th className="py-2.5 px-3">Kỷ luật / Ghi chú</th>
                      <th className="py-2.5 px-2 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {roster.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-600 dark:text-slate-400">
                          {s.mssv}
                        </td>
                        <td className="py-2.5 px-3 font-medium">
                          {s.fullName}
                          {s.hasDisciplineWarning && (
                            <span className="block text-[10px] text-rose-500 font-semibold">
                              (Đã hạ 1 bậc do vi phạm)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500">
                          {s.selfScore}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={s.classScore}
                            onChange={(e) => handleScoreChange(s.id, Number(e.target.value))}
                            className="w-16 px-1.5 py-1 text-center font-bold text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getRatingBadge(s.rating)}`}>
                            {s.rating}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleToggleDiscipline(s.id)}
                              className={`text-[11px] px-2 py-0.5 rounded border transition ${
                                s.hasDisciplineWarning
                                  ? "bg-rose-100 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
                                  : "bg-slate-100 border-slate-200 text-slate-500 hover:text-rose-600 dark:bg-slate-800 dark:border-slate-700"
                              }`}
                            >
                              {s.hasDisciplineWarning ? "⚠ Kỷ luật" : "+ Kỷ luật"}
                            </button>
                            <span className="text-xs text-slate-400 truncate max-w-[120px]">{s.note}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => handleDeleteStudent(s.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition"
                            title="Xóa khỏi danh sách"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: STATS */}
          {activeTab === "stats" && (
            <div className="space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Sĩ số lớp</div>
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                    {stats.totalStudents} SV
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Tham gia họp</div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {stats.presentCount} SV
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Điểm TB toàn lớp</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {stats.averageScore} đ
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Đạt loại Khá trở lên</div>
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {stats.percentages.xuatSac + stats.percentages.tot + stats.percentages.kha}%
                  </div>
                </div>
              </div>

              {/* Progress Bar Distribution */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Cơ cấu Xếp loại Điểm Rèn Luyện Lớp</span>
                  <span className="text-xs font-normal text-slate-500">Chuẩn Điều 10 QĐ 3385/QĐ-DCT</span>
                </h4>

                {[
                  { label: "Xuất sắc (90 - 100 điểm)", count: stats.counts.xuatSac, pct: stats.percentages.xuatSac, color: "bg-emerald-500" },
                  { label: "Tốt (80 - 89 điểm)", count: stats.counts.tot, pct: stats.percentages.tot, color: "bg-blue-500" },
                  { label: "Khá (65 - 79 điểm)", count: stats.counts.kha, pct: stats.percentages.kha, color: "bg-amber-500" },
                  { label: "Trung bình (50 - 64 điểm)", count: stats.counts.trungBinh, pct: stats.percentages.trungBinh, color: "bg-orange-500" },
                  { label: "Yếu (35 - 49 điểm)", count: stats.counts.yeu, pct: stats.percentages.yeu, color: "bg-rose-400" },
                  { label: "Kém (Dưới 35 điểm)", count: stats.counts.kem, pct: stats.percentages.kem, color: "bg-rose-600" },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span>{item.label}</span>
                      <span>{item.count} SV ({item.pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} transition-all duration-300`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MINUTES (BIÊN BẢN HỌP LỚP A4) */}
          {activeTab === "minutes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mẫu biên bản họp đánh giá kết quả rèn luyện cấp Chi đoàn / Lớp chuẩn HUIT
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCopyMinutes}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <FileText className="w-3.5 h-3.5" />}
                    <span>{copied ? "Đã chép!" : "Sao chép"}</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic("medium");
                      window.print();
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>In Biên Bản A4</span>
                  </button>
                </div>
              </div>

              {/* Printable Paper Preview */}
              <div className="p-6 bg-white dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-serif leading-relaxed space-y-4 shadow-sm text-xs sm:text-sm">
                <div className="grid grid-cols-2 text-center text-xs pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="font-bold uppercase tracking-wider">TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP.HCM</p>
                    <p className="font-semibold uppercase">{metadata.facultyName}</p>
                    <p className="italic">Lớp: {metadata.className}</p>
                  </div>
                  <div>
                    <p className="font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="font-semibold">Độc lập - Tự do - Hạnh phúc</p>
                    <p className="italic text-[11px] mt-1">TP. Hồ Chí Minh, ngày {metadata.meetingDate}</p>
                  </div>
                </div>

                <div className="text-center py-2">
                  <h3 className="text-base sm:text-lg font-bold uppercase tracking-wide">
                    BIÊN BẢN HỌP ĐÁNH GIÁ ĐIỂM RÈN LUYỆN
                  </h3>
                  <p className="italic text-xs font-sans">
                    ({metadata.semester} - Năm học {metadata.academicYear})
                  </p>
                </div>

                <div className="space-y-2 text-xs font-sans">
                  <p><strong>1. Thời gian:</strong> {metadata.meetingDate}</p>
                  <p><strong>2. Địa điểm:</strong> {metadata.meetingLocation}</p>
                  <p>
                    <strong>3. Thành phần tham dự:</strong>
                    <br />- Cố vấn học tập: {metadata.advisorName}
                    <br />- Chủ tọa cuộc họp: {metadata.chairperson}
                    <br />- Thư ký ghi biên bản: {metadata.secretary}
                    <br />- Sĩ số lớp: Có mặt {stats.presentCount}/{stats.totalStudents} sinh viên (Vắng: {stats.absentCount})
                  </p>
                  <p>
                    <strong>4. Nội dung cuộc họp:</strong>
                    <br />- Lớp trưởng phổ biến quy chế đánh giá ĐRL theo Quyết định số 3385/QĐ-DCT của Hiệu trưởng Trường Đại học Công Thương TP.HCM.
                    <br />- Từng sinh viên báo cáo kết quả tự chấm (Form 01) và xuất trình minh chứng tương ứng.
                    <br />- Tập thể lớp đóng góp ý kiến, thẩm định minh chứng và tiến hành biểu quyết thống nhất điểm Lớp đánh giá.
                  </p>
                  <p><strong>5. Kết quả phân loại điểm rèn luyện của lớp:</strong></p>
                </div>

                {/* Table inside Minutes */}
                <table className="w-full text-xs font-sans border-collapse border border-slate-300 dark:border-slate-700 text-center">
                  <thead className="bg-slate-100 dark:bg-slate-900 font-semibold">
                    <tr>
                      <th className="border border-slate-300 dark:border-slate-700 py-1.5 px-2">STT</th>
                      <th className="border border-slate-300 dark:border-slate-700 py-1.5 px-2">Xếp loại</th>
                      <th className="border border-slate-300 dark:border-slate-700 py-1.5 px-2">Khung điểm</th>
                      <th className="border border-slate-300 dark:border-slate-700 py-1.5 px-2">Số lượng</th>
                      <th className="border border-slate-300 dark:border-slate-700 py-1.5 px-2">Tỷ lệ (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">1</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1 font-semibold text-emerald-600">Xuất sắc</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">90 - 100 điểm</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">{stats.counts.xuatSac}</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">{stats.percentages.xuatSac}%</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">2</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1 font-semibold text-blue-600">Tốt</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">80 - 89 điểm</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">{stats.counts.tot}</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">{stats.percentages.tot}%</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">3</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1 font-semibold text-amber-600">Khá</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">65 - 79 điểm</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">{stats.counts.kha}</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">{stats.percentages.kha}%</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">4</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1 font-semibold text-orange-600">Trung bình</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">50 - 64 điểm</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">{stats.counts.trungBinh}</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">{stats.percentages.trungBinh}%</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">5</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1 font-semibold text-rose-500">Yếu / Kém</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">&lt; 50 điểm</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">{stats.counts.yeu + stats.counts.kem}</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1">{Math.round((stats.percentages.yeu + stats.percentages.kem) * 10) / 10}%</td>
                    </tr>
                    <tr className="font-bold bg-slate-50 dark:bg-slate-900">
                      <td colSpan={3} className="border border-slate-300 dark:border-slate-700 py-1.5">TỔNG CỘNG</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1.5">{stats.totalStudents}</td>
                      <td className="border border-slate-300 dark:border-slate-700 py-1.5">100%</td>
                    </tr>
                  </tbody>
                </table>

                {/* Signatures */}
                <div className="grid grid-cols-3 text-center text-xs font-sans pt-6">
                  <div>
                    <p className="font-bold">BÍ THƯ CHI ĐOÀN</p>
                    <p className="italic text-[10px] text-slate-500">(Ký và ghi rõ họ tên)</p>
                    <div className="h-14 flex items-end justify-center font-semibold text-slate-600">
                      {metadata.youthUnionSecretary}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold">LỚP TRƯỞNG</p>
                    <p className="italic text-[10px] text-slate-500">(Ký và ghi rõ họ tên)</p>
                    <div className="h-14 flex items-end justify-center font-semibold text-slate-600">
                      {metadata.classMonitorName}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold">CỐ VẤN HỌC TẬP</p>
                    <p className="italic text-[10px] text-slate-500">(Xác nhận và ký tên)</p>
                    <div className="h-14 flex items-end justify-center font-semibold text-slate-600">
                      {metadata.advisorName}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-xs text-slate-500">
          <span>Quyết định số 3385/QĐ-DCT HUIT</span>
          <button
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="px-4 py-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
