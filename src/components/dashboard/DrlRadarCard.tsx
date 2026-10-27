"use client";

import React, { useState, useMemo } from "react";
import {
  Compass,
  Sparkles,
  Info,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  calculateRadarAnalysis,
  CategoryScoreInput,
  RadarPoint,
} from "@/lib/drl/radar";
import { triggerHaptic } from "@/lib/native/platform";

interface DrlRadarCardProps {
  categories: Record<number, { cappedScore: number; maxPoints: number }>;
  onSelectCategoryToAdd?: (category: number) => void;
}

export const DrlRadarCard: React.FC<DrlRadarCardProps> = ({
  categories,
  onSelectCategoryToAdd,
}) => {
  const [showBaseline, setShowBaseline] = useState(true);
  const [showTarget, setShowTarget] = useState(true);
  const [activePoint, setActivePoint] = useState<RadarPoint | null>(null);

  // Map category scores input
  const inputData: Record<number, CategoryScoreInput> = useMemo(() => {
    const res: Record<number, CategoryScoreInput> = {};
    for (let c = 1; c <= 5; c++) {
      res[c] = {
        category: c,
        cappedScore: categories[c]?.cappedScore ?? 0,
        maxPoints: categories[c]?.maxPoints ?? 20,
      };
    }
    return res;
  }, [categories]);

  const radarData = useMemo(() => {
    return calculateRadarAnalysis(inputData, 320);
  }, [inputData]);

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
      data-testid="drl-radar-card"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Biểu Đồ & Mức Độ Cân Bằng (5 Tiêu Chí)
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                QĐ 3385
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Đánh giá mức độ đồng đều giữa 5 phương diện rèn luyện của Nhà trường
            </p>
          </div>
        </div>

        {/* Legend Controls */}
        <div className="flex items-center space-x-3 text-xs text-slate-600 dark:text-slate-400">
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showBaseline}
              onChange={(e) => {
                triggerHaptic("light");
                setShowBaseline(e.target.checked);
              }}
              className="rounded text-slate-600 w-3.5 h-3.5"
            />
            <span className="text-[11px] flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-slate-400 inline-block" />
              Sàn (60đ)
            </span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showTarget}
              onChange={(e) => {
                triggerHaptic("light");
                setShowTarget(e.target.checked);
              }}
              className="rounded text-amber-500 w-3.5 h-3.5"
            />
            <span className="text-[11px] flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-amber-500 inline-block" />
              Xuất sắc (90đ)
            </span>
          </label>
        </div>
      </div>

      {/* Main Content: SVG Chart & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Left Column: Interactive Radar Canvas */}
        <div className="md:col-span-7 flex flex-col items-center justify-center relative p-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
          <svg
            viewBox="0 0 320 320"
            className="w-full max-w-[310px] h-auto overflow-visible select-none"
            aria-label="Biểu đồ radar 5 tiêu chí rèn luyện HUIT"
          >
            {/* Background concentric pentagon rings */}
            {radarData.gridLevels.map((lvl) => (
              <polygon
                key={lvl.level}
                points={lvl.polygonPoints}
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700/80"
                strokeWidth={lvl.level === 100 ? "1.5" : "0.75"}
                strokeDasharray={lvl.level === 100 ? "none" : "2,2"}
              />
            ))}

            {/* Axis spokes from center to each 100% vertex */}
            {radarData.points.map((pt) => {
              const cx = 160;
              const cy = 160;
              const outerRadius = 160 * 0.72;
              const x2 = cx + outerRadius * Math.cos(pt.angle);
              const y2 = cy + outerRadius * Math.sin(pt.angle);

              return (
                <line
                  key={pt.category}
                  x1={cx}
                  y1={cy}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-700/60"
                  strokeWidth="0.8"
                />
              );
            })}

            {/* Baseline 60đ polygon */}
            {showBaseline && (
              <polygon
                points={radarData.baselinePolygonPoints}
                fill="rgba(148, 163, 184, 0.12)"
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="4,3"
              />
            )}

            {/* Target 90đ (Xuất sắc) polygon */}
            {showTarget && (
              <polygon
                points={radarData.targetPolygonPoints}
                fill="rgba(245, 158, 11, 0.08)"
                stroke="#f59e0b"
                strokeWidth="1.4"
                strokeDasharray="3,3"
              />
            )}

            {/* Student's Current Score Polygon */}
            <polygon
              points={radarData.currentPolygonPoints}
              fill="rgba(79, 70, 229, 0.28)"
              stroke="#4f46e5"
              strokeWidth="2.2"
              className="transition-all duration-300"
            />

            {/* Interactive Vertex Nodes */}
            {radarData.points.map((pt) => {
              const isHovered = activePoint?.category === pt.category;

              return (
                <g key={pt.category} className="cursor-pointer">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : 4.5}
                    className="fill-indigo-600 dark:fill-indigo-400 stroke-white dark:stroke-slate-900 transition-all"
                    strokeWidth="2"
                    onMouseEnter={() => {
                      triggerHaptic("light");
                      setActivePoint(pt);
                    }}
                    onClick={() => {
                      triggerHaptic("light");
                      setActivePoint(pt);
                    }}
                  />
                </g>
              );
            })}

            {/* Axis Category Labels outside perimeter */}
            {radarData.points.map((pt) => {
              const cx = 160;
              const cy = 160;
              const labelRadius = 160 * 0.91;
              const lx = cx + labelRadius * Math.cos(pt.angle);
              const ly = cy + labelRadius * Math.sin(pt.angle);

              return (
                <text
                  key={pt.category}
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={`text-[10px] font-bold cursor-pointer transition-colors ${
                    activePoint?.category === pt.category
                      ? "fill-indigo-600 dark:fill-indigo-400 font-extrabold"
                      : "fill-slate-600 dark:fill-slate-400 hover:fill-slate-900 dark:hover:fill-slate-200"
                  }`}
                  onClick={() => {
                    triggerHaptic("light");
                    setActivePoint(pt);
                  }}
                >
                  {pt.code} ({pt.actualScore}đ)
                </text>
              );
            })}
          </svg>

          {/* Active Node Detail Hover / Tap Box */}
          {activePoint ? (
            <div className="w-full mt-2 p-2.5 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 rounded-lg text-xs flex items-center justify-between animate-in fade-in duration-150">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-indigo-900 dark:text-indigo-200">
                  {activePoint.code}: {activePoint.shortName}
                </span>
                <span className="font-extrabold text-indigo-700 dark:text-indigo-300">
                  {activePoint.actualScore}/{activePoint.maxScore}đ ({activePoint.percent}%)
                </span>
              </div>
              {onSelectCategoryToAdd && (
                <button
                  onClick={() => {
                    triggerHaptic("medium");
                    onSelectCategoryToAdd(activePoint.category);
                  }}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Thêm điểm</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 mt-2 text-center">
              Nhấn hoặc di chuột vào các điểm đỉnh để xem chi tiết điểm từng tiêu chí
            </div>
          )}
        </div>

        {/* Right Column: Balance Index & Profile Assessment */}
        <div className="md:col-span-5 space-y-3.5">
          {/* Balance Index Gauge */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Chỉ số cân bằng rèn luyện:
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${radarData.balanceBadgeBg}`}
              >
                {radarData.balanceGrade}
              </span>
            </div>

            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {radarData.balanceIndex}%
              </span>
              <span className="text-xs text-slate-500">mức độ đồng đều 5 tiêu chí</span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${radarData.balanceIndex}%` }}
              />
            </div>
          </div>

          {/* Archetype Profile Card */}
          <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-1">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Hồ sơ: {radarData.archetypeLabel}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {radarData.archetypeDescription}
            </p>
          </div>

          {/* Strongest & Weakest Category */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold block">
                Thế mạnh nổi bật
              </span>
              <strong className="text-emerald-900 dark:text-emerald-100 text-xs">
                {radarData.strongestCategory.code} ({radarData.strongestCategory.percent}%)
              </strong>
            </div>

            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl">
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold block">
                Cần bù đắp thêm
              </span>
              <strong className="text-amber-900 dark:text-amber-100 text-xs">
                {radarData.weakestCategory.code} ({radarData.weakestCategory.percent}%)
              </strong>
            </div>
          </div>

          {/* Actionable Advice */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
              Gợi ý tối ưu điểm số:
            </span>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-4 leading-relaxed">
              {radarData.strategicAdvice.map((adv, idx) => (
                <li key={idx}>{adv}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

