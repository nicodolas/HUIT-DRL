"use client";

import React from "react";
import { RatingResult } from "@/lib/drl/rules";
import { PlusCircle, ShieldCheck, Sparkles, AlertCircle, Target, AlertTriangle, ArrowRight } from "lucide-react";

interface CategoryScoreSummary {
  rawScore: number;
  cappedScore: number;
  maxPoints: number;
}

interface ScoreGaugeProps {
  score: number;
  rating: RatingResult;
  defaultPoints: number;
  earnedPoints: number;
  deductedPoints: number;
  categories?: Record<number, CategoryScoreSummary>;
  onOpenAddModal: () => void;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  rating,
  defaultPoints,
  earnedPoints,
  deductedPoints,
  categories,
  onOpenAddModal,
}) => {
  // Circular arc calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // 1. Calculate Gap to Next Tier (QĐ 3385)
  let nextTier: {
    name: string;
    targetScore: number;
    gap: number;
    tip: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
  } | null = null;

  if (score < 70) {
    nextTier = {
      name: "Loại Khá",
      targetScore: 70,
      gap: 70 - score,
      tip: "Gợi ý: Tham gia 1 hoạt động cấp Khoa (+4đ) hoặc tham gia CLB (+3đ)",
      bgClass: "bg-blue-50/70 dark:bg-blue-950/30",
      textClass: "text-blue-800 dark:text-blue-200",
      borderClass: "border-blue-200 dark:border-blue-800/60",
    };
  } else if (score < 80) {
    nextTier = {
      name: "Loại Tốt (Xét Học Bổng)",
      targetScore: 80,
      gap: 80 - score,
      tip: "Đủ điều kiện xét Học bổng khuyến khích học tập HUIT (≥80đ)",
      bgClass: "bg-emerald-50/70 dark:bg-emerald-950/30",
      textClass: "text-emerald-800 dark:text-emerald-200",
      borderClass: "border-emerald-200 dark:border-emerald-800/60",
    };
  } else if (score < 90) {
    nextTier = {
      name: "Loại Xuất Sắc",
      targetScore: 90,
      gap: 90 - score,
      tip: "Gợi ý: Bổ sung hoạt động hội thảo NCKH hoặc thi cấp Trường",
      bgClass: "bg-purple-50/70 dark:bg-purple-950/30",
      textClass: "text-purple-800 dark:text-purple-200",
      borderClass: "border-purple-200 dark:border-purple-800/60",
    };
  }

  // 2. Detect Over-capping Categories (QĐ 3385 Điều 6.1)
  const overCappedAlerts: Array<{ category: number; maxPoints: number; overflow: number }> = [];
  if (categories) {
    for (let c = 1; c <= 5; c++) {
      const catData = categories[c];
      if (catData && catData.rawScore > catData.maxPoints) {
        overCappedAlerts.push({
          category: c,
          maxPoints: catData.maxPoints,
          overflow: Math.round((catData.rawScore - catData.maxPoints) * 10) / 10,
        });
      }
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-8">
        {/* Left: Compact Circular Meter */}
        <div className="flex items-center space-x-5 shrink-0 w-full sm:w-auto justify-center sm:justify-start">
          <div className="relative flex items-center justify-center">
            <svg className="w-28 h-28 -rotate-90 transform">
              <circle
                cx="56"
                cy="56"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                className="text-slate-100 dark:text-slate-800"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r={radius}
                stroke={rating.color}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
                fill="transparent"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
                {score}
              </span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">/ 100đ</span>
            </div>
          </div>

          <div className="space-y-1 text-left">
            <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Xếp loại hiện tại
            </div>
            <div className="flex items-center space-x-2">
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center"
                style={{
                  backgroundColor: `${rating.color}15`,
                  color: rating.color,
                }}
              >
                {rating.label}
              </span>
            </div>
            {rating.note && (
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                {rating.note}
              </p>
            )}
          </div>
        </div>

        {/* Right: 3 Metric Badges & Progress */}
        <div className="flex-1 w-full space-y-3">
          {/* Segmented Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span>Tiến độ rèn luyện học kỳ</span>
              <span className="font-bold text-slate-900 dark:text-white">{clampedScore}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${Math.min(clampedScore, 60)}%` }}
                className="bg-slate-400 dark:bg-slate-600 h-full transition-all duration-500"
                title="Điểm mặc định (60đ)"
              />
              {clampedScore > 60 && (
                <div
                  style={{ width: `${clampedScore - 60}%` }}
                  className="bg-emerald-500 dark:bg-emerald-400 h-full transition-all duration-500"
                  title="Điểm cộng hoạt động"
                />
              )}
            </div>
          </div>

          {/* 3 Metric Pills */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center">
                <ShieldCheck className="w-3 h-3 text-slate-500 mr-1" /> Mặc định
              </span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                +{defaultPoints}
              </span>
              <span className="text-[9px] text-slate-400">TC 1, 2, 4</span>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 flex flex-col">
              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center">
                <Sparkles className="w-3 h-3 text-emerald-600 mr-1" /> Đã cộng
              </span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                +{earnedPoints}
              </span>
              <span className="text-[9px] text-emerald-600/70 dark:text-emerald-400/60">Hoạt động, CLB</span>
            </div>

            <div className="bg-rose-50/60 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40 flex flex-col">
              <span className="text-[10px] font-medium text-rose-700 dark:text-rose-400 flex items-center">
                <AlertCircle className="w-3 h-3 text-rose-600 mr-1" /> Bị trừ
              </span>
              <span className="text-base font-bold text-rose-700 dark:text-rose-300 mt-0.5">
                -{deductedPoints}
              </span>
              <span className="text-[9px] text-rose-600/70 dark:text-rose-400/60">Vi phạm, rớt môn</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gap to Next Tier Banner */}
      {nextTier && (
        <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${nextTier.bgClass} ${nextTier.borderClass}`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/80 dark:bg-slate-900/80 flex items-center justify-center shrink-0 shadow-2xs">
              <Target className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                <span>Mục tiêu tiếp theo:</span>
                <span className={`font-extrabold ${nextTier.textClass}`}>
                  Còn thiếu +{nextTier.gap} điểm để đạt {nextTier.name} (≥{nextTier.targetScore}đ)
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                {nextTier.tip}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenAddModal}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center space-x-1 shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs"
          >
            <span>Ghi thêm điểm</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Over-capping Alerts (Điều 6.1 QĐ 3385) */}
      {overCappedAlerts.length > 0 && (
        <div className="space-y-1.5">
          {overCappedAlerts.map((alert) => (
            <div
              key={alert.category}
              className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs flex items-start space-x-2 text-amber-900 dark:text-amber-200"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Quy chế Điều 6.1 (Trần điểm Tiêu chí {alert.category}):</span>{" "}
                <span>
                  Tiêu chí {alert.category} đã đạt tối đa {alert.maxPoints}/{alert.maxPoints}đ (dư +{alert.overflow}đ không cộng dồn). Điểm dư không chuyển qua tiêu chí khác — hãy chuyển sang tham gia hoạt động ở Tiêu chí khác để tối ưu điểm số!
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
