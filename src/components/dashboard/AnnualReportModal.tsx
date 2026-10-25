"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Printer,
  Share2,
  Calendar,
  Award,
  TrendingUp,
  GraduationCap,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Semester, DrlRecord } from "@/lib/db/schema";
import { calculateSemesterScore, ScoreCalculationResult } from "@/lib/drl/calculator";
import { determineRating, CATEGORIES } from "@/lib/drl/rules";

interface AnnualReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  semesters: Semester[];
}

export const AnnualReportModal: React.FC<AnnualReportModalProps> = ({
  isOpen,
  onClose,
  user,
  semesters,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>("2025 - 2026");
  const [copied, setCopied] = useState<boolean>(false);
  const [yearSemestersData, setYearSemestersData] = useState<{
    semesters: { semester: Semester; result: ScoreCalculationResult }[];
    annualScore: number;
    annualRating: any;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Extract all distinct academic years from semester names
  const academicYears = useMemo(() => {
    const years = new Set<string>();
    semesters.forEach((s) => {
      const match = s.name.match(/\((20\d\d\s*-\s*20\d\d)\)/);
      if (match) {
        years.add(match[1]);
      } else {
        years.add("2025 - 2026");
      }
    });
    return Array.from(years);
  }, [semesters]);

  // Load records and calculate for all semesters in the selected year
  React.useEffect(() => {
    if (!isOpen || semesters.length === 0) return;

    const matchedSemesters = semesters.filter((s) =>
      s.name.includes(selectedYear) || (academicYears.length === 1)
    );

    if (matchedSemesters.length === 0) {
      setYearSemestersData(null);
      return;
    }

    setLoading(true);

    Promise.all(
      matchedSemesters.map(async (sem) => {
        try {
          const res = await fetch(`/api/records?semesterId=${sem.id}`);
          const data = await res.json();
          const recs: DrlRecord[] = data.records || [];
          const disc = (sem.disciplineLevel || "none") as any;
          const result = calculateSemesterScore(recs, disc);
          return { semester: sem, result };
        } catch {
          const disc = (sem.disciplineLevel || "none") as any;
          const result = calculateSemesterScore([], disc);
          return { semester: sem, result };
        }
      })
    ).then((items) => {
      const totalScores = items.map((i) => i.result.totalScore);
      const avg = totalScores.length > 0
        ? Math.round((totalScores.reduce((a, b) => a + b, 0) / totalScores.length) * 10) / 10
        : 60;

      // Has discipline in any semester of the year
      const hasWarningDiscipline = items.some(
        (i) => i.semester.disciplineLevel && i.semester.disciplineLevel !== "none"
      );

      const rating = determineRating(avg, hasWarningDiscipline ? "canh_cao" : "none");

      setYearSemestersData({
        semesters: items,
        annualScore: avg,
        annualRating: rating,
      });
      setLoading(false);
    });
  }, [isOpen, selectedYear, semesters, academicYears]);

  if (!isOpen) return null;

  const handleShareZalo = async () => {
    if (!yearSemestersData) return;
    const text = `📊 BẢNG TỔNG HỢP ĐIỂM RÈN LUYỆN NĂM HỌC ${selectedYear}\n👤 Sinh viên: ${user?.fullName || "Sinh viên"}\n🏫 Trường ĐH Công Thương TP.HCM (HUIT)\n📈 Điểm trung bình năm: ${yearSemestersData.annualScore}/100\n🏆 Xếp loại: ${yearSemestersData.annualRating.label}\nTheo dõi chi tiết tại HUIT DRL!`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Tổng Hợp Điểm Rèn Luyện Năm Học (Điều 11)
              </h2>
              <p className="text-[11px] text-slate-300">
                Quyết định số 3385/QĐ-DCT • Trường Đại học Công Thương TP.HCM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Year selector & actions toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-700">Chọn năm học:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {academicYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Năm học {yr}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleShareZalo}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>{copied ? "Đã chép!" : "Chia sẻ"}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>In A4 Năm Học</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Đang tính toán kết quả năm học...
            </div>
          ) : yearSemestersData ? (
            <div className="space-y-5">
              {/* Annual Score Banner */}
              <div className="p-4 rounded-xl bg-linear-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-400 text-slate-900 font-bold uppercase">
                      ĐIỀU 11 QĐ 3385
                    </span>
                    <span className="text-xs text-slate-300">
                      Năm học {selectedYear}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">
                    Điểm Rèn Luyện Cả Năm: {yearSemestersData.annualScore} điểm
                  </h3>
                  <p className="text-xs text-slate-300">
                    Trung bình cộng từ {yearSemestersData.semesters.length} học kỳ chính
                  </p>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">
                      XẾP LOẠI NĂM HỌC
                    </span>
                    <span
                      className="text-sm font-extrabold px-3 py-1 rounded-lg inline-block mt-0.5"
                      style={{
                        backgroundColor: `${yearSemestersData.annualRating.color}25`,
                        color: yearSemestersData.annualRating.color,
                        border: `1px solid ${yearSemestersData.annualRating.color}`,
                      }}
                    >
                      {yearSemestersData.annualRating.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Breakdown Table by Criteria and Semesters */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Bảng đối chiếu điểm chi tiết giữa các học kỳ
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Thang 100 điểm
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="p-3 font-semibold">Nội dung đánh giá (QĐ 3385)</th>
                        <th className="p-3 font-semibold text-center w-24">Điểm trần</th>
                        {yearSemestersData.semesters.map((s, idx) => (
                          <th key={s.semester.id} className="p-3 font-semibold text-center">
                            {s.semester.name.split("(")[0].trim() || `HK ${idx + 1}`}
                          </th>
                        ))}
                        <th className="p-3 font-semibold text-center bg-amber-50/50 text-amber-900">
                          TB Năm
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[1, 2, 3, 4, 5].map((catNum) => {
                        const max = CATEGORIES[catNum].maxPoints;
                        const catScores = yearSemestersData.semesters.map(
                          (s) => s.result.categories[catNum]?.cappedScore ?? 0
                        );
                        const catAvg =
                          catScores.length > 0
                            ? Math.round((catScores.reduce((a, b) => a + b, 0) / catScores.length) * 10) / 10
                            : 0;

                        return (
                          <tr key={catNum} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 text-slate-900 font-medium">
                              <span className="font-bold text-slate-500 mr-1.5 font-mono">
                                TC{catNum}:
                              </span>
                              {CATEGORIES[catNum].name}
                            </td>
                            <td className="p-3 text-center text-slate-500 font-mono">
                              {max}đ
                            </td>
                            {catScores.map((sc, i) => (
                              <td key={i} className="p-3 text-center font-mono font-bold text-slate-800">
                                {sc}
                              </td>
                            ))}
                            <td className="p-3 text-center font-mono font-extrabold text-amber-800 bg-amber-50/30">
                              {catAvg}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Total row */}
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                        <td className="p-3 text-slate-900 uppercase">
                          Tổng điểm rèn luyện
                        </td>
                        <td className="p-3 text-center text-slate-600 font-mono">
                          100đ
                        </td>
                        {yearSemestersData.semesters.map((s) => (
                          <td key={s.semester.id} className="p-3 text-center font-mono font-bold text-slate-900">
                            {s.result.totalScore}
                          </td>
                        ))}
                        <td className="p-3 text-center font-mono font-extrabold text-amber-900 bg-amber-100/50 text-sm">
                          {yearSemestersData.annualScore}
                        </td>
                      </tr>
                      {/* Rating row */}
                      <tr className="bg-white">
                        <td className="p-3 text-slate-700 font-medium">
                          Xếp loại học kỳ & năm học
                        </td>
                        <td className="p-3 text-center text-slate-400 font-mono">-</td>
                        {yearSemestersData.semesters.map((s) => (
                          <td key={s.semester.id} className="p-3 text-center font-bold">
                            <span
                              className="px-2 py-0.5 rounded text-[10px]"
                              style={{
                                backgroundColor: `${s.result.rating.color}18`,
                                color: s.result.rating.color,
                              }}
                            >
                              {s.result.rating.label}
                            </span>
                          </td>
                        ))}
                        <td className="p-3 text-center font-bold bg-amber-50/30">
                          <span
                            className="px-2 py-0.5 rounded text-[10px]"
                            style={{
                              backgroundColor: `${yearSemestersData.annualRating.color}25`,
                              color: yearSemestersData.annualRating.color,
                            }}
                          >
                            {yearSemestersData.annualRating.label}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Regulation Quote Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-1">
                <span className="font-bold text-slate-800 block">
                  Trích Điều 11 QĐ 3385/QĐ-DCT:
                </span>
                <p>
                  "1. Điểm rèn luyện của năm học là trung bình cộng điểm rèn luyện của các học kỳ trong năm học đó.
                  2. Kết quả rèn luyện của năm học được lưu vào hồ sơ quản lý sinh viên của Trường và được sử dụng để xét học bổng, khen thưởng, kỷ luật."
                </p>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Không tìm thấy dữ liệu học kỳ cho năm học {selectedYear}. Vui lòng tạo học kỳ tương ứng.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Hệ thống ĐRL Trường ĐH Công Thương TP.HCM</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
