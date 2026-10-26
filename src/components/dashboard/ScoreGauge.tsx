"use client";

import React from "react";
import { RatingResult } from "@/lib/drl/rules";
import { PlusCircle, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";

interface ScoreGaugeProps {
  score: number;
  rating: RatingResult;
  defaultPoints: number;
  earnedPoints: number;
  deductedPoints: number;
  onOpenAddModal: () => void;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  rating,
  defaultPoints,
  earnedPoints,
  deductedPoints,
  onOpenAddModal,
}) => {
  // Circular arc calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
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
    </div>
  );
};
