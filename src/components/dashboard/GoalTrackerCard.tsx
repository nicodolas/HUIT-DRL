"use client";

import React, { useState } from "react";
import { GoalAnalysisResult } from "@/lib/drl/calculator";
import { Target, CheckCircle2, ChevronRight, Compass } from "lucide-react";

interface GoalTrackerCardProps {
  analysis: GoalAnalysisResult;
  onUpdateTarget: (newTarget: number) => void;
  onOpenAddModalWithCategory?: (cat: number) => void;
}

export const GoalTrackerCard: React.FC<GoalTrackerCardProps> = ({
  analysis,
  onUpdateTarget,
  onOpenAddModalWithCategory,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const presets = [
    { label: "Xuất sắc (90đ)", score: 90, desc: "Xét học bổng KKHT & SV5T" },
    { label: "Tốt (80đ)", score: 80, desc: "Chuẩn xét khen thưởng đoàn thể" },
    { label: "Khá (70đ)", score: 70, desc: "Mức chuẩn xét học bổng cơ bản" },
  ];

  const handleSelectPreset = (score: number) => {
    onUpdateTarget(score);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
            <Target className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Mục tiêu & Kế hoạch rèn luyện
            </h2>
            <p className="text-xs text-slate-500">
              Theo dõi tiến độ đạt mục tiêu học kỳ
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          {isEditing ? "Đóng" : "Đổi mục tiêu"}
        </button>
      </div>

      {/* Target Selector */}
      {isEditing && (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
          <span className="text-xs font-semibold text-slate-700 block">
            Chọn mốc điểm mục tiêu:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {presets.map((p) => (
              <button
                key={p.score}
                onClick={() => handleSelectPreset(p.score)}
                className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  analysis.targetScore === p.score
                    ? "border-slate-900 bg-white font-semibold text-slate-900 shadow-2xs"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className="text-xs font-bold text-slate-900">{p.label}</div>
                <div className="text-[10px] text-slate-500">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar & Status */}
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
        <div className="flex items-center justify-between mb-2 text-xs">
          <div className="flex items-center space-x-1.5 font-semibold text-slate-700">
            <Compass className="w-3.5 h-3.5 text-slate-500" />
            <span>Mục tiêu: {analysis.targetScore} điểm</span>
          </div>
          <span className="font-bold text-slate-900">
            {analysis.currentScore} / {analysis.targetScore} ({analysis.completionPercent}%)
          </span>
        </div>

        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              analysis.isAchieved ? "bg-emerald-600" : "bg-slate-900"
            }`}
            style={{ width: `${Math.min(100, analysis.completionPercent)}%` }}
          />
        </div>

        {analysis.isAchieved ? (
          <div className="flex items-center space-x-2 text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-medium">
              Bạn đã đạt mốc {analysis.targetScore} điểm rèn luyện của học kỳ này!
            </span>
          </div>
        ) : (
          <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
            Còn thiếu <span className="font-bold text-amber-700">{analysis.gap} điểm</span> để đạt mục tiêu {analysis.targetScore}đ.
          </div>
        )}
      </div>

      {/* Suggestions */}
      {!analysis.isAchieved && analysis.suggestions.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-xs font-semibold text-slate-700">
            Gợi ý tiêu chí còn dư khung điểm:
          </div>

          <div className="space-y-2">
            {analysis.suggestions.map((s) => (
              <div
                key={s.category}
                className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{s.title}</span>
                  <span className="text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    Dư tối đa +{s.remainingCapacity}đ
                  </span>
                </div>
                <ul className="space-y-1 text-slate-600 text-[11px] pt-0.5">
                  {s.advice.map((adv, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5">
                      <span className="text-slate-400">•</span>
                      <span>{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
