"use client";

import React from "react";
import { CATEGORIES } from "@/lib/drl/rules";
import { CategoryScoreResult } from "@/lib/drl/calculator";

interface CriteriaRadarChartProps {
  categories: Record<number, CategoryScoreResult>;
}

export const CriteriaRadarChart: React.FC<CriteriaRadarChartProps> = ({ categories }) => {
  const size = 200;
  const center = size / 2;
  const maxRadius = 65;

  // 5 axes: -90deg (top), -18deg, 54deg, 126deg, 198deg
  const axes = [1, 2, 3, 4, 5].map((catNum, idx) => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / 5;
    const meta = CATEGORIES[catNum];
    const res = categories[catNum] || {
      cappedScore: meta.defaultPoints,
      maxPoints: meta.maxPoints,
    };
    const ratio = Math.min(1, Math.max(0, res.cappedScore / res.maxPoints));

    return {
      catNum,
      code: meta.code,
      name: meta.shortName,
      ratio,
      score: res.cappedScore,
      max: res.maxPoints,
      angle,
      // Vertex for maximum (100%)
      outerX: center + maxRadius * Math.cos(angle),
      outerY: center + maxRadius * Math.sin(angle),
      // Label position slightly outside
      labelX: center + (maxRadius + 18) * Math.cos(angle),
      labelY: center + (maxRadius + 18) * Math.sin(angle),
      // Current point
      pointX: center + maxRadius * ratio * Math.cos(angle),
      pointY: center + maxRadius * ratio * Math.sin(angle),
    };
  });

  // Background grid pentagons (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = gridLevels.map((lvl) => {
    return axes
      .map((a) => {
        const x = center + maxRadius * lvl * Math.cos(a.angle);
        const y = center + maxRadius * lvl * Math.sin(a.angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  });

  // Current user score polygon
  const userPolygonPoints = axes
    .map((a) => `${a.pointX.toFixed(1)},${a.pointY.toFixed(1)}`)
    .join(" ");

  // Identify lowest and highest criteria
  const sorted = [...axes].sort((a, b) => a.ratio - b.ratio);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];

  return (
    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
      {/* SVG Radar */}
      <div className="shrink-0 w-48 h-48 flex items-center justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
          {/* Concentric Guide Pentagons */}
          {gridPolygons.map((points, idx) => (
            <polygon
              key={idx}
              points={points}
              fill={idx === gridPolygons.length - 1 ? "#f8fafc" : "transparent"}
              stroke="#cbd5e1"
              strokeWidth="0.75"
              strokeDasharray={idx < gridPolygons.length - 1 ? "2 2" : undefined}
            />
          ))}

          {/* Radial Axis Lines */}
          {axes.map((a, idx) => (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={a.outerX}
              y2={a.outerY}
              stroke="#cbd5e1"
              strokeWidth="0.75"
            />
          ))}

          {/* User Score Area Polygon */}
          <polygon
            points={userPolygonPoints}
            fill="#0f172a"
            fillOpacity="0.15"
            stroke="#0f172a"
            strokeWidth="2"
          />

          {/* Vertices Dots */}
          {axes.map((a, idx) => (
            <circle
              key={idx}
              cx={a.pointX}
              cy={a.pointY}
              r="3.5"
              fill="#fbbf24"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          ))}

          {/* Labels */}
          {axes.map((a, idx) => (
            <text
              key={idx}
              x={a.labelX}
              y={a.labelY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="9"
              fontWeight="bold"
              fill="#334155"
              fontFamily="monospace"
            >
              {a.code}
            </text>
          ))}
        </svg>
      </div>

      {/* Insight Analysis Box */}
      <div className="flex-1 text-xs space-y-2">
        <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
          <span>Biểu đồ cân bằng 5 Tiêu chí rèn luyện</span>
        </div>

        <p className="text-slate-600 leading-relaxed text-[11px]">
          Biểu đồ thể hiện mức độ phủ điểm của bạn trên 5 tiêu chí chuẩn. Hồ sơ rèn luyện lý tưởng đạt độ che phủ đồng đều &ge; 80% mỗi tiêu chí.
        </p>

        <div className="space-y-1 pt-1 text-[11px]">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-700">
              Thế mạnh cao nhất: <strong>{highest.code} ({highest.name})</strong> — {Math.round(highest.ratio * 100)}% trần
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-slate-700">
              Cần bổ sung thêm: <strong>{lowest.code} ({lowest.name})</strong> — còn thiếu {lowest.max - lowest.score}đ để chạm trần
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

