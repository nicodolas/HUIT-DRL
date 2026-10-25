"use client";

import React from "react";
import { RatingResult } from "@/lib/drl/rules";
import { PlusCircle, MinusCircle, ShieldCheck, Plus } from "lucide-react";

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
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Left: Circular gauge */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-40 h-40 -rotate-90 transform">
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#f1f5f9"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={rating.color}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
              fill="transparent"
            />
          </svg>

          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900">
              {score}
            </span>
            <span className="text-[11px] font-medium text-slate-400">/ 100 điểm</span>
            <div
              className="mt-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold"
              style={{
                backgroundColor: `${rating.color}18`,
                color: rating.color,
              }}
            >
              {rating.label}
            </div>
          </div>
        </div>

        {/* Right: Breakdown & CTA */}
        <div className="flex-1 w-full flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cấu trúc điểm số
              </span>
              {rating.note && (
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {rating.note}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Default */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col">
                <span className="text-[11px] font-medium text-slate-500 flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-600 mr-1" /> Mặc định
                </span>
                <span className="text-lg font-bold text-slate-900 mt-1">
                  +{defaultPoints}
                </span>
                <span className="text-[10px] text-slate-400">TC 1, 2, 4</span>
              </div>

              {/* Earned */}
              <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200/80 flex flex-col">
                <span className="text-[11px] font-medium text-emerald-800 flex items-center">
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600 mr-1" /> Đã cộng
                </span>
                <span className="text-lg font-bold text-emerald-700 mt-1">
                  +{earnedPoints}
                </span>
                <span className="text-[10px] text-emerald-600/70">Hoạt động, CLB</span>
              </div>

              {/* Deducted */}
              <div className="bg-red-50/50 p-3 rounded-lg border border-red-200/80 flex flex-col">
                <span className="text-[11px] font-medium text-red-800 flex items-center">
                  <MinusCircle className="w-3.5 h-3.5 text-red-600 mr-1" /> Bị trừ
                </span>
                <span className="text-lg font-bold text-red-700 mt-1">
                  -{deductedPoints}
                </span>
                <span className="text-[10px] text-red-600/70">Vi phạm, rớt môn</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenAddModal}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Ghi nhận mục điểm mới</span>
          </button>
        </div>
      </div>
    </div>
  );
};
