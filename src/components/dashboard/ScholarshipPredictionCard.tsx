"use client";

import React, { useState, useEffect } from "react";
import { GraduationCap, Award, AlertCircle, CheckCircle2, ChevronRight, TrendingUp } from "lucide-react";
import { DisciplineLevel } from "@/lib/drl/rules";

interface ScholarshipPredictionCardProps {
  currentDrlScore: number;
  disciplineLevel?: DisciplineLevel | string;
}

interface ScholarshipTier {
  name: string;
  minGpa: number;
  minDrl: number;
  colorClass: string;
  badgeBg: string;
  badgeText: string;
}

const SCHOLARSHIP_TIERS: ScholarshipTier[] = [
  {
    name: "Xuất Sắc",
    minGpa: 3.6,
    minDrl: 90,
    colorClass: "border-purple-200 bg-purple-50/50 text-purple-900",
    badgeBg: "bg-purple-100 text-purple-800",
    badgeText: "Học bổng Xuất sắc",
  },
  {
    name: "Giỏi",
    minGpa: 3.2,
    minDrl: 80,
    colorClass: "border-emerald-200 bg-emerald-50/50 text-emerald-900",
    badgeBg: "bg-emerald-100 text-emerald-800",
    badgeText: "Học bổng Giỏi",
  },
  {
    name: "Khá",
    minGpa: 2.5,
    minDrl: 70,
    colorClass: "border-blue-200 bg-blue-50/50 text-blue-900",
    badgeBg: "bg-blue-100 text-blue-800",
    badgeText: "Học bổng Khá",
  },
];

export const ScholarshipPredictionCard: React.FC<ScholarshipPredictionCardProps> = ({
  currentDrlScore,
  disciplineLevel = "none",
}) => {
  const [gpa, setGpa] = useState<number>(3.2);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("huit_student_gpa");
      if (saved && !isNaN(Number(saved))) {
        setGpa(Number(saved));
      }
    }
  }, []);

  const handleGpaChange = (newGpa: number) => {
    const clamped = Math.max(0, Math.min(4.0, Math.round(newGpa * 100) / 100));
    setGpa(clamped);
    if (typeof window !== "undefined") {
      localStorage.setItem("huit_student_gpa", String(clamped));
    }
  };

  const hasDisciplinePenalty = disciplineLevel && disciplineLevel !== "none";

  // Determine current predicted tier
  let predictedTier: ScholarshipTier | null = null;
  if (!hasDisciplinePenalty) {
    for (const tier of SCHOLARSHIP_TIERS) {
      if (gpa >= tier.minGpa && currentDrlScore >= tier.minDrl) {
        predictedTier = tier;
        break;
      }
    }
  }

  // Next higher tier for motivation
  const targetTier =
    predictedTier === SCHOLARSHIP_TIERS[0]
      ? null
      : predictedTier === SCHOLARSHIP_TIERS[1]
      ? SCHOLARSHIP_TIERS[0]
      : predictedTier === SCHOLARSHIP_TIERS[2]
      ? SCHOLARSHIP_TIERS[1]
      : SCHOLARSHIP_TIERS[2];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Dự Phóng Học Bổng Khuyến Khích HUIT
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Mô phỏng điều kiện kép: Điểm học tập (GPA) & Điểm rèn luyện (ĐRL)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">GPA Học tập:</span>
          <div className="flex items-center space-x-1">
            <input
              type="number"
              step="0.05"
              min="0"
              max="4.0"
              value={gpa}
              onChange={(e) => handleGpaChange(parseFloat(e.target.value) || 0)}
              className="w-16 text-center text-xs font-mono font-bold p-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-400 dark:text-slate-500">/ 4.0</span>
          </div>
        </div>
      </div>

      {/* Main Status Display */}
      {hasDisciplinePenalty ? (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 space-y-1">
          <div className="font-bold flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span>Không đủ điều kiện xét học bổng do có án kỷ luật</span>
          </div>
          <p className="text-[11px] text-red-700 dark:text-red-400">
            Theo quy chế HUIT, sinh viên bị kỷ luật từ mức Khiển trách trở lên trong học kỳ sẽ không được xét cấp học bổng khuyến khích học tập.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SCHOLARSHIP_TIERS.map((tier) => {
            const isCurrentMatch = predictedTier === tier;
            const isGpaMet = gpa >= tier.minGpa;
            const isDrlMet = currentDrlScore >= tier.minDrl;

            return (
              <div
                key={tier.name}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCurrentMatch
                    ? "bg-slate-900 dark:bg-slate-800 text-white border-slate-900 dark:border-amber-400 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold ${isCurrentMatch ? "text-amber-400" : "text-slate-900 dark:text-white"}`}>
                    Loại {tier.name}
                  </span>
                  {isCurrentMatch && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                      Đạt chuẩn
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={isCurrentMatch ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}>GPA &ge; {tier.minGpa}:</span>
                    <span className={`font-mono font-semibold ${isGpaMet ? (isCurrentMatch ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400") : (isCurrentMatch ? "text-red-400" : "text-red-600 dark:text-red-400")}`}>
                      {gpa.toFixed(2)} {isGpaMet ? "✓" : "✗"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={isCurrentMatch ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}>ĐRL &ge; {tier.minDrl}:</span>
                    <span className={`font-mono font-semibold ${isDrlMet ? (isCurrentMatch ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400") : (isCurrentMatch ? "text-red-400" : "text-red-600 dark:text-red-400")}`}>
                      {currentDrlScore}đ {isDrlMet ? "✓" : "✗"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottleneck Guidance */}
      {!hasDisciplinePenalty && targetTier && (
        <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>Mục tiêu nâng hạng: Học bổng loại {targetTier.name}</span>
            </span>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              {currentDrlScore < targetTier.minDrl && gpa < targetTier.minGpa
                ? `Cần nâng thêm ${(targetTier.minGpa - gpa).toFixed(2)} điểm GPA và ${targetTier.minDrl - currentDrlScore} điểm ĐRL.`
                : currentDrlScore < targetTier.minDrl
                ? `GPA của bạn đã đủ (${gpa.toFixed(2)}), chỉ cần tích lũy thêm ${targetTier.minDrl - currentDrlScore} điểm ĐRL nữa!`
                : `Điểm rèn luyện đã đủ (${currentDrlScore}đ), bạn cần phấn đấu thêm ${(targetTier.minGpa - gpa).toFixed(2)} điểm GPA môn học!`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

