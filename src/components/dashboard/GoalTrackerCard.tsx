"use client";

import React, { useState } from "react";
import { GoalAnalysisResult } from "@/lib/drl/calculator";
import { Target, CheckCircle2, ArrowRight, Sparkles, Compass } from "lucide-react";

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
  const [customTarget, setCustomTarget] = useState(analysis.targetScore);

  const presets = [
    { label: "Xuất sắc (90đ)", score: 90, desc: "Xét học bổng KKHT" },
    { label: "Tốt (80đ)", score: 80, desc: "Đạt chuẩn xét khen thưởng" },
    { label: "Khá (70đ)", score: 70, desc: "Mức an toàn" },
  ];

  const handleSave = (val: number) => {
    onUpdateTarget(val);
    setIsEditing(false);
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/80 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-huit-orange-600">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Lộ trình & Mục tiêu điểm rèn luyện
            </h2>
            <p className="text-xs text-slate-500">
              Phân tích mục tiêu và gợi ý cày điểm thông minh
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs font-bold text-huit-blue-600 hover:text-huit-blue-700 bg-blue-50 px-3 py-1 rounded-xl transition-colors"
        >
          {isEditing ? "Đóng" : "Đổi mục tiêu"}
        </button>
      </div>

      {/* Target Selector */}
      {isEditing && (
        <div className="mb-5 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <span className="text-xs font-semibold text-slate-600">
            Chọn mục tiêu mong muốn:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {presets.map((p) => (
              <button
                key={p.score}
                onClick={() => handleSave(p.score)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  analysis.targetScore === p.score
                    ? "border-huit-orange-500 bg-orange-50/60 font-bold text-slate-800"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className="text-xs font-bold">{p.label}</div>
                <div className="text-[10px] text-slate-400">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress & Status */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <Compass className="w-4 h-4 text-huit-blue-600" />
            <span className="text-xs font-bold text-slate-700">
              Mục tiêu: {analysis.targetScore} điểm
            </span>
          </div>
          <span className="text-xs font-extrabold text-huit-blue-700">
            {analysis.currentScore} / {analysis.targetScore} ({analysis.completionPercent}%)
          </span>
        </div>

        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              analysis.isAchieved
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-huit-blue-600 to-huit-orange-500"
            }`}
            style={{ width: `${Math.min(100, analysis.completionPercent)}%` }}
          />
        </div>

        {analysis.isAchieved ? (
          <div className="flex items-center space-x-2 text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200/60">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold">
              Chúc mừng! Bạn đã hoàn thành mục tiêu {analysis.targetScore} điểm rèn luyện trong học kỳ này!
            </span>
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-600 bg-orange-50/60 p-2.5 rounded-xl border border-orange-200/60">
            Bạn còn thiếu{" "}
            <span className="font-extrabold text-huit-orange-600 text-sm">
              {analysis.gap} điểm
            </span>{" "}
            để đạt mục tiêu đã đề ra. Xem các gợi ý bên dưới để hoàn thành sớm:
          </div>
        )}
      </div>

      {/* Actionable Suggestions */}
      {!analysis.isAchieved && analysis.suggestions.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center space-x-1 text-xs font-bold text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-huit-orange-500" />
            <span>Gợi ý tiêu chí còn dư khung điểm:</span>
          </div>

          <div className="space-y-2">
            {analysis.suggestions.map((s) => (
              <div
                key={s.category}
                className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs shadow-2xs hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-800">{s.title}</span>
                  <span className="text-[11px] font-semibold text-huit-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    Dư tối đa +{s.remainingCapacity}đ
                  </span>
                </div>
                <ul className="space-y-1 text-slate-600 text-[11px]">
                  {s.advice.map((adv, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5">
                      <span className="text-huit-orange-500 font-bold">•</span>
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
