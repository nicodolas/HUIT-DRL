"use client";

import React from "react";
import { TrendingUp, Award, Layers, ChevronRight } from "lucide-react";

interface SemesterSummary {
  id: string;
  name: string;
  isCurrent: boolean;
  totalScore: number;
  rating: {
    label: string;
    color: string;
    badgeBg: string;
  };
  recordsCount: number;
}

interface CumulativeStatsCardProps {
  data: {
    hasData: boolean;
    totalSemesters: number;
    totalActivities: number;
    cumulativeAverage: number;
    cumulativeRating: {
      label: string;
      color: string;
      badgeBg: string;
    } | null;
    semesterBreakdown: SemesterSummary[];
  } | null;
  currentSemesterId: string;
  onSelectSemester: (id: string) => void;
}

export const CumulativeStatsCard: React.FC<CumulativeStatsCardProps> = ({
  data,
  currentSemesterId,
  onSelectSemester,
}) => {
  if (!data || !data.hasData || data.totalSemesters <= 1) {
    return null; // Only display when there are multiple semesters to compare!
  }

  return (
    <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Điểm rèn luyện tích lũy ({data.totalSemesters} học kỳ)
            </h2>
            <p className="text-xs text-slate-500">
              Điểm trung bình toàn khóa theo Điều 12 QĐ 3385
            </p>
          </div>
        </div>

        {data.cumulativeRating && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Trung bình:</span>
            <span className="text-base font-extrabold text-slate-900">
              {data.cumulativeAverage}đ
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${data.cumulativeRating.badgeBg}`}
            >
              {data.cumulativeRating.label}
            </span>
          </div>
        )}
      </div>

      {/* Semester Comparison Bars */}
      <div className="space-y-2.5 pt-1">
        {data.semesterBreakdown.map((s) => {
          const isSelected = s.id === currentSemesterId;
          const percent = Math.min(100, Math.max(0, s.totalScore));

          return (
            <div
              key={s.id}
              onClick={() => onSelectSemester(s.id)}
              className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                isSelected
                  ? "border-slate-900 bg-slate-50/80 shadow-2xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-800">{s.name}</span>
                  {isSelected && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-900 text-white font-mono">
                      Đang xem
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {s.totalScore}đ
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.rating.badgeBg}`}
                  >
                    {s.rating.label}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: s.rating.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
