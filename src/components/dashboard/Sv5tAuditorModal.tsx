"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Printer,
  Share2,
  ShieldCheck,
  BookOpen,
  Activity,
  HeartHandshake,
  Globe,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { DrlRecord } from "@/lib/db/schema";
import { evaluateSv5t, Sv5tEvaluationResult, Sv5tPillar } from "@/lib/sv5t/rules";
import { DisciplineLevel } from "@/lib/drl/rules";

interface Sv5tAuditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  drlScore: number;
  disciplineLevel: DisciplineLevel | string;
  records: DrlRecord[];
  studentName?: string;
  studentClass?: string;
}

export const Sv5tAuditorModal: React.FC<Sv5tAuditorModalProps> = ({
  isOpen,
  onClose,
  drlScore,
  disciplineLevel,
  records,
  studentName = "Sinh Viên HUIT",
  studentClass = "Khoa CNTT",
}) => {
  const [gpa, setGpa] = useState<number>(3.2);
  const [hasFailedCourse, setHasFailedCourse] = useState<boolean>(false);
  const [hasFitnessCertificate, setHasFitnessCertificate] = useState<boolean>(false);
  const [hasForeignLangCert, setHasForeignLangCert] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedGpa = localStorage.getItem("huit_student_gpa");
      if (savedGpa && !isNaN(Number(savedGpa))) setGpa(Number(savedGpa));

      const savedFitness = localStorage.getItem("huit_sv5t_fitness");
      if (savedFitness) setHasFitnessCertificate(savedFitness === "true");

      const savedLang = localStorage.getItem("huit_sv5t_lang");
      if (savedLang) setHasForeignLangCert(savedLang === "true");
    }
  }, []);

  if (!isOpen) return null;

  const result: Sv5tEvaluationResult = evaluateSv5t({
    drlScore,
    disciplineLevel,
    gpa,
    records,
    hasFailedCourse,
    hasFitnessCertificate,
    hasForeignLangCert,
  });

  const getPillarIcon = (pillarId: string) => {
    switch (pillarId) {
      case "dao_duc":
        return <ShieldCheck className="w-5 h-5 text-indigo-600" />;
      case "hoc_tap":
        return <BookOpen className="w-5 h-5 text-blue-600" />;
      case "the_luc":
        return <Activity className="w-5 h-5 text-emerald-600" />;
      case "tinh_nguyen":
        return <HeartHandshake className="w-5 h-5 text-rose-600" />;
      case "hoi_nhap":
        return <Globe className="w-5 h-5 text-amber-600" />;
      default:
        return <Award className="w-5 h-5 text-slate-600" />;
    }
  };

  const handleShareZalo = async () => {
    const text = `🏆 Kết quả Tự Đánh Giá "Sinh Viên 5 Tốt" HUIT\n👤 Sinh viên: ${studentName}\n📊 Điểm rèn luyện: ${drlScore}/100\n📚 GPA: ${gpa.toFixed(2)}\n🌟 Tiến độ SV5T: ${result.passedPillarsCount}/5 Tiêu chuẩn ${result.isQualified ? " (ĐỦ ĐIỀU KIỆN)" : ""}\nKiểm tra chi tiết tại HUIT DRL!`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Thẩm Định "Sinh Viên 5 Tốt" HUIT
              </h2>
              <p className="text-[11px] text-slate-300">
                Tiêu chuẩn Hội Sinh viên Việt Nam Trường ĐH Công Thương TP.HCM
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
          {/* Main Status Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              result.isQualified
                ? result.qualifiedLevel === "trương"
                  ? "bg-purple-50/70 border-purple-200 text-purple-900"
                  : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                : "bg-amber-50/70 border-amber-200 text-amber-900"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 border border-current shadow-2xs">
                  {result.isQualified
                    ? `ĐẠT CHUẨN CẤP ${result.qualifiedLevel.toUpperCase()}`
                    : "ĐANG HOÀN THIỆN TIÊU CHUẨN"}
                </span>
                <span className="text-xs font-mono font-bold">
                  {result.passedPillarsCount}/5 Đạt
                </span>
              </div>
              <p className="text-sm font-semibold">
                {result.isQualified
                  ? `Chúc mừng! Bạn đã thỏa mãn 5/5 tiêu chuẩn danh hiệu "Sinh viên 5 tốt" cấp ${result.qualifiedLevel}.`
                  : `Bạn đã đạt ${result.passedPillarsCount} trên 5 tiêu chuẩn. Hoàn thiện các tiêu chuẩn còn lại để đủ điều kiện xét tuyển.`}
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleShareZalo}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>{copiedShare ? "Đã chép!" : "Chia sẻ"}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>In bản khai</span>
              </button>
            </div>
          </div>

          {/* Quick Config Row */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                GPA học tập (thang 4):
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="4.0"
                  value={gpa}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setGpa(val);
                    localStorage.setItem("huit_student_gpa", String(val));
                  }}
                  className="w-18 p-1.5 bg-white border border-slate-300 rounded-md font-mono font-bold text-center text-slate-900"
                />
                <span className="text-[11px] text-slate-500">
                  {gpa >= 2.8 ? "✓ Đạt chuẩn" : "✗ Chưa đạt"}
                </span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nợ môn / Học phần rớt:
              </label>
              <label className="flex items-center space-x-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={hasFailedCourse}
                  onChange={(e) => setHasFailedCourse(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
                />
                <span className="text-slate-700">Có môn bị điểm F</span>
              </label>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Chứng nhận thể thao & ngoại ngữ:
              </label>
              <div className="space-y-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasFitnessCertificate}
                    onChange={(e) => {
                      setHasFitnessCertificate(e.target.checked);
                      localStorage.setItem("huit_sv5t_fitness", String(e.target.checked));
                    }}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-3.5 h-3.5"
                  />
                  <span className="text-slate-700 text-[11px]">Có chứng chỉ thể thao / giải chạy</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasForeignLangCert}
                    onChange={(e) => {
                      setHasForeignLangCert(e.target.checked);
                      localStorage.setItem("huit_sv5t_lang", String(e.target.checked));
                    }}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-3.5 h-3.5"
                  />
                  <span className="text-slate-700 text-[11px]">Có TOEIC / IELTS / VSTEP</span>
                </label>
              </div>
            </div>
          </div>

          {/* Pillars List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Chi tiết thẩm định 5 tiêu chuẩn
            </h3>

            {result.pillars.map((pillar: Sv5tPillar) => (
              <div
                key={pillar.pillarId}
                className={`p-3.5 rounded-xl border transition-all ${
                  pillar.isPassed
                    ? "bg-white border-slate-200"
                    : "bg-amber-50/30 border-amber-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-slate-100">
                      {getPillarIcon(pillar.pillarId)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {pillar.title}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {pillar.shortDesc}
                      </p>
                    </div>
                  </div>

                  <div>
                    {pillar.isPassed ? (
                      <span className="flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ĐẠT</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>CHƯA ĐẠT</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 space-y-1.5 pl-9">
                  {pillar.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between text-xs py-1 border-t border-slate-100"
                    >
                      <div className="pr-3">
                        <span
                          className={`font-medium ${
                            item.isMet ? "text-slate-800" : "text-slate-500"
                          }`}
                        >
                          {item.name}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Minh chứng đề xuất: {item.evidenceHint}
                        </p>
                      </div>
                      <span
                        className={`font-bold shrink-0 text-xs ${
                          item.isMet ? "text-emerald-600" : "text-slate-300"
                        }`}
                      >
                        {item.isMet ? "✓" : "✗"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations box */}
          {result.recommendations.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
              <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold">
                <HelpCircle className="w-4 h-4" />
                <span>Gợi ý hoàn thiện tiêu chuẩn SV5T</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4 leading-relaxed">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Quy định xét SV5T Đoàn TN - Hội Sinh viên HUIT</span>
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
