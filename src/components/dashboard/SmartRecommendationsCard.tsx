"use client";

import React, { useState, useEffect } from "react";
import { Compass, ArrowRight, Plus, CheckCircle2, ChevronRight } from "lucide-react";
import { GoalAnalysisResult } from "@/lib/drl/calculator";
import { DrlCriteriaPreset } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/drl/rules";
import { getPresetsCache, savePresetsCache } from "@/lib/offline/cache";
import { DEFAULT_HUIT_PRESETS } from "@/lib/presets/default-presets";

interface SmartRecommendationsCardProps {
  analysis: GoalAnalysisResult;
  onSelectPresetToAdd: (preset: DrlCriteriaPreset) => void;
}

export const SmartRecommendationsCard: React.FC<SmartRecommendationsCardProps> = ({
  analysis,
  onSelectPresetToAdd,
}) => {
  const [presets, setPresets] = useState<DrlCriteriaPreset[]>(() => {
    const cached = getPresetsCache();
    return cached && cached.length > 0 ? cached : DEFAULT_HUIT_PRESETS;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 1. Try cache first
    const cached = getPresetsCache();
    if (cached && cached.length > 0) {
      setPresets(cached);
      setLoading(false);
    }

    // 2. Fetch fresh presets
    fetch("/api/presets")
      .then((res) => res.json())
      .then((data) => {
        if (data.presets && data.presets.length > 0) {
          setPresets(data.presets);
          savePresetsCache(data.presets);
        }
      })
      .catch((e) => console.warn("Failed to fetch presets for recommendations:", e))
      .finally(() => setLoading(false));
  }, []);

  // Filter recommendations
  if (analysis.isAchieved) {
    return (
      <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 shadow-xs space-y-2">
        <div className="flex items-center space-x-2 text-emerald-900 dark:text-emerald-100 font-bold text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>Mục tiêu đã hoàn thành xuất sắc!</span>
        </div>
        <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
          Bạn đã đạt <strong>{analysis.currentScore} / {analysis.targetScore} điểm</strong>. Hãy rà soát lại liên kết minh chứng trên Form 01 để chuẩn bị nộp cho Lớp trưởng đúng hạn.
        </p>
      </div>
    );
  }

  // Find categories with remaining capacity
  const remainingCategories = analysis.suggestions
    .filter((s) => s.remainingCapacity > 0)
    .map((s) => s.category);

  // Filter add presets for those categories
  const recommendedPresets = presets
    .filter(
      (p) =>
        remainingCategories.includes(p.category) &&
        p.type === "add" &&
        Number(p.points) > 0
    )
    .sort((a, b) => Number(b.points) - Number(a.points))
    .slice(0, 4);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
            <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Gợi Ý Hoạt Động Để Đạt Mục Tiêu
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Bạn cần thêm <strong>{analysis.gap} điểm</strong> để đạt mốc {analysis.targetScore}đ
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 w-fit">
          Từ 65 tiêu chuẩn QĐ 3385
        </span>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Đang phân tích hoạt động phù hợp...
        </div>
      ) : recommendedPresets.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
          Không tìm thấy hoạt động gợi ý phù hợp cho dung lượng còn lại.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recommendedPresets.map((preset) => {
            const catMeta = CATEGORIES[preset.category];
            return (
              <div
                key={preset.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${catMeta.color}15`,
                        color: catMeta.color,
                      }}
                    >
                      {catMeta.code} • {catMeta.shortName}
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      +{preset.points}đ
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
                    {preset.title}
                  </h4>
                  {preset.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {preset.description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPresetToAdd(preset)}
                  className="w-full py-1.5 px-2.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-900 dark:hover:bg-amber-500 hover:text-white dark:hover:text-slate-950 rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-2xs group-hover:border-slate-400"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ghi nhận mục này</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
