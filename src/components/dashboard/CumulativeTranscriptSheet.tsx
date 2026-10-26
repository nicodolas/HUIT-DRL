"use client";

import React from "react";
import { X, Printer, Award, GraduationCap, CheckCircle2, AlertTriangle, FileText } from "lucide-react";

interface SemesterSummary {
  id: string;
  name: string;
  isCurrent: boolean;
  totalScore: number;
  rating: {
    label: string;
    code: string;
  };
  disciplineLevel: string;
}

interface CumulativeTranscriptSheetProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    username: string;
    fullName: string;
    className?: string | null;
    faculty?: string | null;
  };
  analyticsData: {
    totalSemesters: number;
    cumulativeAverage: number;
    cumulativeRating: {
      label: string;
      code: string;
      note?: string;
    } | null;
    hasGraduationDisciplinePenalty?: boolean;
    semesterBreakdown: SemesterSummary[];
  } | null;
}

export const CumulativeTranscriptSheet: React.FC<CumulativeTranscriptSheetProps> = ({
  isOpen,
  onClose,
  user,
  analyticsData,
}) => {
  if (!isOpen || !analyticsData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        {/* Modal Top Bar - Hidden when printing */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between no-print border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <GraduationCap className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Bảng Điểm Rèn Luyện Toàn Khóa Tốt Nghiệp</h2>
              <p className="text-[11px] text-slate-300">
                Căn cứ theo Điều 12 Quyết định 3385/QĐ-DCT ({analyticsData.totalSemesters} học kỳ)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>In bản A4</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Transcript Content */}
        <div className="p-8 sm:p-10 space-y-6 max-h-[80vh] overflow-y-auto print:max-h-none print:p-0 text-slate-900 dark:text-slate-100">
          {/* Institutional Header */}
          <div className="grid grid-cols-2 gap-4 text-center pb-4 border-b border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <p className="font-medium uppercase text-slate-600 dark:text-slate-400">BỘ CÔNG THƯƠNG</p>
              <p className="font-bold uppercase text-slate-900 dark:text-white mt-0.5">
                TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP.HCM
              </p>
              <div className="w-20 h-0.5 bg-slate-900 dark:bg-slate-400 mx-auto mt-1" />
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900 dark:text-white">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p className="font-semibold text-slate-800 dark:text-slate-300 mt-0.5">Độc lập - Tự do - Hạnh phúc</p>
              <div className="w-24 h-0.5 bg-slate-900 dark:bg-slate-400 mx-auto mt-1" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-1">
            <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-white">
              BẢNG TỔNG HỢP ĐIỂM RÈN LUYỆN TOÀN KHÓA HỌC
            </h1>
            <p className="text-[11px] italic text-slate-500 dark:text-slate-400">
              (Dùng cho xét tốt nghiệp và lưu hồ sơ sinh viên theo Quyết định số 3385/QĐ-DCT)
            </p>
          </div>

          {/* Student Info Box */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Họ và tên sinh viên:</span>{" "}
              <span className="font-bold text-slate-900 dark:text-white">{user.fullName}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Tên tài khoản / Mã định danh:</span>{" "}
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">@{user.username}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Khoa:</span>{" "}
              <span className="font-medium text-slate-900 dark:text-white">{user.faculty || "Chưa cập nhật"}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Lớp sinh hoạt:</span>{" "}
              <span className="font-medium text-slate-900 dark:text-white">{user.className || "Chưa cập nhật"}</span>
            </div>
          </div>

          {/* Semesters Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-300 dark:border-slate-700">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700">
                  <th className="p-2 border-r border-slate-300 dark:border-slate-700 text-center w-12">STT</th>
                  <th className="p-2 border-r border-slate-300 dark:border-slate-700">Học kỳ đánh giá</th>
                  <th className="p-2 border-r border-slate-300 dark:border-slate-700 text-center w-24">Điểm rèn luyện</th>
                  <th className="p-2 border-r border-slate-300 dark:border-slate-700 text-center w-28">Xếp loại</th>
                  <th className="p-2 text-center w-24">Kỷ luật</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.semesterBreakdown.map((s, idx) => (
                  <tr key={s.id} className="border-b border-slate-200 dark:border-slate-800">
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-white">
                      {s.name}
                      {s.isCurrent && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                          Hiện tại
                        </span>
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center font-bold font-mono text-slate-900 dark:text-white">
                      {s.totalScore}đ
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center font-semibold text-slate-800 dark:text-slate-200">
                      {s.rating.label}
                    </td>
                    <td className="p-2 text-center text-slate-600 dark:text-slate-400">
                      {s.disciplineLevel && s.disciplineLevel !== "none" ? (
                        <span className="text-red-700 dark:text-red-400 font-bold">{s.disciplineLevel}</span>
                      ) : (
                        "Không"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cumulative Result Highlight Box */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="text-slate-500 dark:text-slate-400 font-medium">
                Công thức tính theo Điều 12 QĐ 3385:
              </div>
              <div className="font-mono text-slate-800 dark:text-slate-200">
                ĐRL Toàn khóa = Tổng điểm các HK / {analyticsData.totalSemesters} ={" "}
                <span className="font-bold text-base text-slate-900 dark:text-white">
                  {analyticsData.cumulativeAverage} điểm
                </span>
              </div>
              {analyticsData.hasGraduationDisciplinePenalty && (
                <p className="text-[11px] text-red-700 dark:text-red-400 font-medium">
                  * Đã hạ 1 bậc xếp loại tốt nghiệp do có học kỳ bị kỷ luật từ mức Cảnh cáo trở lên.
                </p>
              )}
            </div>

            <div className="text-center sm:text-right shrink-0">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                Xếp Loại Toàn Khóa Tốt Nghiệp
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {analyticsData.cumulativeRating ? analyticsData.cumulativeRating.label : "Chưa xác định"}
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-6 text-center pt-6 text-xs">
            <div>
              <p className="font-bold uppercase text-slate-800 dark:text-slate-200">SINH VIÊN XÁC NHẬN</p>
              <p className="italic text-[11px] text-slate-500 dark:text-slate-400">(Ký và ghi rõ họ tên)</p>
              <div className="h-16" />
              <p className="font-bold text-slate-900 dark:text-white">{user.fullName}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-800 dark:text-slate-200">HỘI ĐỒNG ĐÁNH GIÁ ĐRL TRƯỜNG</p>
              <p className="italic text-[11px] text-slate-500 dark:text-slate-400">(Ký, đóng dấu và ghi rõ họ tên)</p>
              <div className="h-16" />
              <p className="text-slate-400 dark:text-slate-500">....................................</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-900/90 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

