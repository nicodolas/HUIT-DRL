"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Plus, CheckCircle2, ChevronRight } from "lucide-react";
import { GoalAnalysisResult } from "@/lib/drl/calculator";
import { DrlCriteriaPreset } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/drl/rules";
import { getPresetsCache, savePresetsCache } from "@/lib/offline/cache";

interface SmartRecommendationsCardProps {
  analysis: GoalAnalysisResult;
  onSelectPresetToAdd: (preset: DrlCriteriaPreset) => void;
}

export const SmartRecommendationsCard: React.FC<SmartRecommendationsCardProps> = ({
  analysis,
  onSelectPresetToAdd,
}) => {
  const [presets, setPresets] = useState<DrlCriteriaPreset[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 shadow-xs space-y-2">
        <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Mục tiêu đã hoàn thành xuất sắc!</span>
        </div>
        <p className="text-xs text-emerald-800 leading-relaxed">
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
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Gợi Ý Hoạt Động Để Đạt Mục Tiêu
            </h3>
            <p className="text-[11px] text-slate-500">
              Bạn cần thêm <strong>{analysis.gap} điểm</strong> để đạt mốc {analysis.targetScore}đ
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 w-fit">
          Từ 65 tiêu chuẩn QĐ 3385
        </span>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">
          Đang phân tích hoạt động phù hợp...
        </div>
      ) : recommendedPresets.length === 0 ? (
        <p className="text-xs text-slate-500 italic">
          Không tìm thấy hoạt động gợi ý phù hợp cho dung lượng còn lại.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recommendedPresets.map((preset) => {
            const catMeta = CATEGORIES[preset.category];
            return (
              <div
                key={preset.id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-3 group"
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
                    <span className="font-mono text-xs font-bold text-emerald-700">
                      +{preset.points}đ
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">
                    {preset.title}
                  </h4>
                  {preset.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {preset.description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPresetToAdd(preset)}
                  className="w-full py-1.5 px-2.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-900 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-2xs group-hover:border-slate-400"
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
