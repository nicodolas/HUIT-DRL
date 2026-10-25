"use client";

import React from "react";
import { RatingResult } from "@/lib/drl/rules";
import { PlusCircle, MinusCircle, ShieldCheck } from "lucide-react";

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
  // SVG circular arc calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 transition-all hover:shadow-md">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Left: Circular gauge */}
        <div className="relative flex items-center justify-center">
          <svg className="w-44 h-44 -rotate-90 transform">
            {/* Background Circle */}
            <circle
              cx="88"
              cy="88"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              className="text-slate-100"
              fill="transparent"
            />
            {/* Progress Arc */}
            <circle
              cx="88"
              cy="88"
              r={radius}
              stroke={rating.color}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
              fill="transparent"
            />
          </svg>

          {/* Centered Score & Rating */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-800">
              {score}
            </span>
            <span className="text-xs font-semibold text-slate-400 -mt-0.5">/ 100 điểm</span>
            <div
              className={`mt-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${rating.badgeBg}`}
            >
              {rating.label}
            </div>
          </div>
        </div>

        {/* Right: Quick Stats & Call To Action */}
        <div className="flex-1 w-full flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Chi tiết tích lũy
              </span>
              {rating.note && (
                <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {rating.note}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Điểm mặc định */}
              <div className="bg-slate-50 p-2.5 sm:p-3 rounded-2xl border border-slate-200/60 flex flex-col">
                <span className="text-[11px] font-medium text-slate-500 flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 mr-1" /> Mặc định
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-800 mt-1">
                  +{defaultPoints}
                </span>
                <span className="text-[10px] text-slate-400">TC 1, 2, 4</span>
              </div>

              {/* Điểm cộng */}
              <div className="bg-emerald-50/60 p-2.5 sm:p-3 rounded-2xl border border-emerald-100 flex flex-col">
                <span className="text-[11px] font-medium text-emerald-700 flex items-center">
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600 mr-1" /> Đã cộng
                </span>
                <span className="text-base sm:text-lg font-bold text-emerald-700 mt-1">
                  +{earnedPoints}
                </span>
                <span className="text-[10px] text-emerald-600/70">Hoạt động, CLB</span>
              </div>

              {/* Điểm trừ */}
              <div className="bg-rose-50/60 p-2.5 sm:p-3 rounded-2xl border border-rose-100 flex flex-col">
                <span className="text-[11px] font-medium text-rose-700 flex items-center">
                  <MinusCircle className="w-3.5 h-3.5 text-rose-600 mr-1" /> Bị trừ
                </span>
                <span className="text-base sm:text-lg font-bold text-rose-700 mt-1">
                  -{deductedPoints}
                </span>
                <span className="text-[10px] text-rose-600/70">Vi phạm, vắng</span>
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={onOpenAddModal}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-huit-blue-700 to-huit-blue-600 hover:from-huit-blue-800 hover:to-huit-blue-700 text-white font-bold text-sm shadow-md shadow-blue-900/15 transition-all transform active:scale-[0.98]"
          >
            <PlusCircle className="w-5 h-5 text-orange-400" />
            <span>Thêm hoạt động / Tự cộng - trừ điểm</span>
          </button>
        </div>
      </div>
    </div>
  );
};
