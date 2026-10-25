"use client";

import React from "react";
import { CATEGORIES } from "@/lib/drl/rules";
import { CategoryScoreResult } from "@/lib/drl/calculator";
import { CriteriaRadarChart } from "./CriteriaRadarChart";
import { Plus, AlertCircle } from "lucide-react";

interface CriteriaBreakdownProps {
  categories: Record<number, CategoryScoreResult>;
  onSelectCategoryToAdd: (cat: number) => void;
}

export const CriteriaBreakdown: React.FC<CriteriaBreakdownProps> = ({
  categories,
  onSelectCategoryToAdd,
}) => {
  return (
    <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
      <div>
        <h2 className="text-sm font-bold text-slate-900">
          5 Tiêu chí rèn luyện HUIT
        </h2>
        <p className="text-xs text-slate-500">
          Khung điểm và giới hạn trần theo Quyết định số 3385/QĐ-DCT
        </p>
      </div>

      {/* Visual Pentagon Radar Chart */}
      <CriteriaRadarChart categories={categories} />

      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((catNum) => {
          const meta = CATEGORIES[catNum];
          const result = categories[catNum] || {
            rawScore: meta.defaultPoints,
            cappedScore: meta.defaultPoints,
            maxPoints: meta.maxPoints,
            remainingCapacity: meta.maxPoints - meta.defaultPoints,
            recordsCount: 0,
          };

          const percent = Math.min(
            100,
            Math.max(0, Math.round((result.cappedScore / result.maxPoints) * 100))
          );
          const isAtMax = result.cappedScore >= result.maxPoints;
          const isOverRaw = result.rawScore > result.maxPoints;

          return (
            <div
              key={catNum}
              className="p-3.5 sm:p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-800">
                      {meta.code}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {meta.shortName}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {meta.description}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-bold text-slate-900">
                      {result.cappedScore}
                    </span>
                    <span className="text-xs text-slate-400 font-normal">
                      /{result.maxPoints}đ
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectCategoryToAdd(catNum)}
                    className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                    title={`Ghi nhận thêm mục cho ${meta.code}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-slate-800"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                  <span>
                    {result.recordsCount > 0 ? `${result.recordsCount} hoạt động ghi nhận` : "Mặc định hệ thống"}
                  </span>
                  {isOverRaw && (
                    <span className="text-amber-700 flex items-center font-medium">
                      <AlertCircle className="w-3 h-3 mr-0.5" />
                      Điểm thực {result.rawScore}đ (khống chế trần {result.maxPoints}đ)
                    </span>
                  )}
                  {!isOverRaw && isAtMax && (
                    <span className="text-emerald-700 font-medium">Đã đạt tối đa trần điểm</span>
                  )}
                  {!isAtMax && (
                    <span>Còn dư {result.remainingCapacity}đ</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
