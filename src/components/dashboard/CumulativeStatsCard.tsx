"use client";

import React from "react";
import { TrendingUp, Award, Layers, ChevronRight, FileText, Compass } from "lucide-react";

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
  onOpenTranscript?: () => void;
  onOpenForecast?: () => void;
}

export const CumulativeStatsCard: React.FC<CumulativeStatsCardProps> = ({
  data,
  currentSemesterId,
  onSelectSemester,
  onOpenTranscript,
  onOpenForecast,
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

      {/* SVG Multi-Semester Progression Chart */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
          <span className="font-semibold text-slate-700">Biểu đồ tiến trình qua các học kỳ:</span>
          <div className="flex items-center space-x-3 text-[10px]">
            <span className="flex items-center">
              <span className="w-2 h-0.5 bg-amber-500 inline-block mr-1" />
              Mốc Xuất sắc (90đ)
            </span>
            <span className="flex items-center">
              <span className="w-2 h-0.5 bg-emerald-500 inline-block mr-1" />
              Mốc Tốt (80đ)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div
            className="h-32 flex items-end justify-around gap-2 pt-4 px-2"
            style={{ minWidth: `${Math.max(100, data.semesterBreakdown.length * 52)}px` }}
          >
            {data.semesterBreakdown.map((s) => {
              const isSelected = s.id === currentSemesterId;
              const barHeight = Math.min(100, Math.max(10, s.totalScore));

              return (
                <div
                  key={s.id}
                  onClick={() => onSelectSemester(s.id)}
                  className="flex-1 min-w-[42px] max-w-[68px] flex flex-col items-center h-full justify-end group cursor-pointer"
                >
                  <span className="text-[10px] font-mono font-bold text-slate-700 opacity-90 group-hover:scale-105 transition-transform mb-1">
                    {s.totalScore}đ
                  </span>

                  <div className="w-full max-w-[42px] h-full flex items-end relative">
                    {/* Guideline at 90% */}
                    <div className="absolute w-full top-[10%] border-t border-dashed border-amber-300 pointer-events-none" />
                    {/* Guideline at 80% */}
                    <div className="absolute w-full top-[20%] border-t border-dashed border-emerald-300 pointer-events-none" />

                    <div
                      style={{ height: `${barHeight}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isSelected
                          ? "bg-slate-900 ring-2 ring-amber-400"
                          : "bg-slate-300 group-hover:bg-slate-400"
                      }`}
                    />
                  </div>

                  <span className="text-[10px] text-slate-600 truncate max-w-[56px] mt-1.5 font-medium text-center" title={s.name}>
                    {s.name.replace("Học kỳ", "HK")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Semester Comparison Bars (Scrollable if > 4 semesters) */}
      <div className={`space-y-2.5 pt-1 ${data.semesterBreakdown.length > 4 ? "max-h-[340px] overflow-y-auto pr-1" : ""}`}>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {onOpenTranscript && (
          <button
            type="button"
            onClick={onOpenTranscript}
            className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span>In Bảng Điểm Toàn Khóa</span>
          </button>
        )}
        {onOpenForecast && (
          <button
            type="button"
            onClick={onOpenForecast}
            className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Dự Báo Tốt Nghiệp (Điều 12)</span>
          </button>
        )}
      </div>
    </div>
  );
};

