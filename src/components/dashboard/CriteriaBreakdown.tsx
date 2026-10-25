"use client";

import React from "react";
import { CATEGORIES } from "@/lib/drl/rules";
import { CategoryScoreResult } from "@/lib/drl/calculator";
import { ChevronRight, Plus, AlertCircle } from "lucide-react";

interface CriteriaBreakdownProps {
  categories: Record<number, CategoryScoreResult>;
  onSelectCategoryToAdd: (cat: number) => void;
}

export const CriteriaBreakdown: React.FC<CriteriaBreakdownProps> = ({
  categories,
  onSelectCategoryToAdd,
}) => {
  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">
            5 Tiêu chí rèn luyện HUIT
          </h2>
          <p className="text-xs text-slate-500">
            Khung điểm & giới hạn trần theo Quyết định số 3385/QĐ-DCT
          </p>
        </div>
      </div>

      <div className="space-y-3.5">
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
              className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className="px-2 py-0.5 rounded-lg text-xs font-black text-white"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.code}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                      {meta.shortName}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {meta.description}
                  </p>
                </div>

                {/* Score badge & Add button */}
                <div className="flex items-center space-x-2 shrink-0">
                  <div className="text-right">
                    <div className="text-sm sm:text-base font-extrabold text-slate-800">
                      {result.cappedScore}
                      <span className="text-xs font-normal text-slate-400">
                        /{result.maxPoints}đ
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectCategoryToAdd(catNum)}
                    className="p-1.5 rounded-xl bg-white hover:bg-slate-200/70 text-slate-600 border border-slate-200 shadow-2xs transition-colors"
                    title={`Thêm mục cho ${meta.code}`}
                  >
                    <Plus className="w-4 h-4 text-huit-orange-600" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: meta.color,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 mt-1.5">
                  <span>
                    {result.recordsCount > 0 ? `${result.recordsCount} hoạt động ghi nhận` : "Chưa có thêm hoạt động"}
                  </span>
                  {isOverRaw && (
                    <span className="text-amber-600 flex items-center font-bold">
                      <AlertCircle className="w-3 h-3 mr-0.5" />
                      Điểm thực tế {result.rawScore}đ (khống chế trần {result.maxPoints}đ)
                    </span>
                  )}
                  {!isOverRaw && isAtMax && (
                    <span className="text-emerald-600 font-bold">Đã đạt tối đa trần điểm</span>
                  )}
                  {!isAtMax && (
                    <span>Còn dư {result.remainingCapacity}đ để tích lũy</span>
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
