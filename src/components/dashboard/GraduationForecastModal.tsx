"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  GraduationCap,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Target,
  Copy,
  Check,
  Printer,
  Compass,
} from "lucide-react";
import {
  calculateGraduationForecast,
  simulateRemainingSemestersScore,
  GraduationTier,
  CompletedSemesterScore,
} from "@/lib/graduation/forecast";
import { triggerHaptic } from "@/lib/native/platform";

interface SemesterAnalyticsItem {
  id: string;
  name: string;
  isCurrent: boolean;
  totalScore: number;
  disciplineLevel?: string;
}

interface GraduationForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterData: SemesterAnalyticsItem[];
  studentName?: string;
  studentClass?: string;
}

export const GraduationForecastModal: React.FC<GraduationForecastModalProps> = ({
  isOpen,
  onClose,
  semesterData,
  studentName,
  studentClass,
}) => {
  const [totalProgramSemesters, setTotalProgramSemesters] = useState<number>(8);
  const [targetTier, setTargetTier] = useState<GraduationTier>("xuat_sac");
  const [customScore, setCustomScore] = useState<number>(90);
  const [useCustomScore, setUseCustomScore] = useState<boolean>(false);
  const [hasDisciplineWarning, setHasDisciplineWarning] = useState<boolean>(false);
  const [simulatedScores, setSimulatedScores] = useState<Record<number, number>>({});
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"forecast" | "simulator">("forecast");

  // Format completed semesters
  const completedSemesters: CompletedSemesterScore[] = useMemo(() => {
    return semesterData.map((s) => ({
      id: s.id,
      name: s.name,
      score: s.totalScore,
    }));
  }, [semesterData]);

  // Check if any semester already has a warning
  useEffect(() => {
    const foundDiscipline = semesterData.some(
      (s) => s.disciplineLevel === "canh_cao" || s.disciplineLevel === "dinh_chi"
    );
    if (foundDiscipline) {
      setHasDisciplineWarning(true);
    }
  }, [semesterData]);

  // Calculate remaining count
  const completedCount = completedSemesters.length;
  const remainingCount = Math.max(1, totalProgramSemesters - completedCount);

  // Forecast engine computation
  const forecast = useMemo(() => {
    return calculateGraduationForecast({
      completedSemesters,
      totalProgramSemesters,
      targetTier,
      customTargetScore: useCustomScore ? customScore : undefined,
      hasDisciplineWarning,
    });
  }, [completedSemesters, totalProgramSemesters, targetTier, useCustomScore, customScore, hasDisciplineWarning]);

  // Initialize simulated scores for remaining semesters
  useEffect(() => {
    const initSim: Record<number, number> = {};
    const defaultVal = Math.min(100, Math.max(60, Math.round(forecast.requiredAveragePerRemaining)));
    for (let i = completedCount + 1; i <= totalProgramSemesters; i++) {
      initSim[i] = simulatedScores[i] ?? defaultVal;
    }
    setSimulatedScores(initSim);
  }, [completedCount, totalProgramSemesters, forecast.requiredAveragePerRemaining]);

  // Live simulation of remaining scores
  const simulationOutcome = useMemo(() => {
    const completedScores = completedSemesters.map((s) => s.score);
    const simValues: number[] = [];
    for (let i = completedCount + 1; i <= totalProgramSemesters; i++) {
      simValues.push(simulatedScores[i] ?? 80);
    }
    const res = simulateRemainingSemestersScore(completedScores, simValues);

    // Apply discipline restriction if flagged
    let effectiveLabel = res.overallRating.label;
    if (hasDisciplineWarning && (effectiveLabel === "Xuất sắc" || effectiveLabel === "Tốt")) {
      effectiveLabel = "Khá (Hạ theo Điều 12)";
    }

    return {
      ...res,
      effectiveLabel,
      isTargetMet: res.overallAverage >= forecast.targetScore,
    };
  }, [completedSemesters, simulatedScores, completedCount, totalProgramSemesters, forecast.targetScore, hasDisciplineWarning]);

  if (!isOpen) return null;

  const handleApplyEvenSplit = () => {
    triggerHaptic("medium");
    const targetVal = Math.min(100, Math.max(0, Math.round(forecast.requiredAveragePerRemaining * 10) / 10));
    const nextSim: Record<number, number> = {};
    for (let i = completedCount + 1; i <= totalProgramSemesters; i++) {
      nextSim[i] = targetVal;
    }
    setSimulatedScores(nextSim);
  };

  const handleSliderChange = (semIndex: number, val: number) => {
    setSimulatedScores((prev) => ({
      ...prev,
      [semIndex]: val,
    }));
  };

  const handleCopySummary = () => {
    triggerHaptic("light");
    const summaryText = `[DỰ BÁO ĐRL TỐT NGHIỆP - HUIT ĐIỀU 12 QĐ 3385]
Sinh viên: ${studentName || "Sinh viên"} - Lớp: ${studentClass || "HUIT"}
- Đã hoàn thành: ${completedCount}/${totalProgramSemesters} học kỳ
- Điểm trung bình hiện tại: ${forecast.currentAverage}đ
- Mục tiêu tốt nghiệp: Loại ${forecast.targetTierLabel} (≥ ${forecast.targetScore}đ)
- Điểm TB cần đạt mỗi HK còn lại: ${forecast.requiredAveragePerRemaining}đ/HK
- Mức độ khả thi: ${forecast.feasibilityLabel}
- Kỷ luật cảnh cáo: ${hasDisciplineWarning ? "Có (Hạ bậc theo Điều 12.3)" : "Không vi phạm"}
- Dự phóng mô phỏng: ${simulationOutcome.overallAverage}đ (${simulationOutcome.effectiveLabel})
---
Ứng dụng Theo dõi ĐRL HUIT`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      data-testid="graduation-forecast-modal"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Dự Báo ĐRL Tốt Nghiệp Toàn Khóa
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  Điều 12 QĐ 3385
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mô phỏng lộ trình điểm trung bình toàn khóa và khả năng đạt xếp loại mong muốn
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-2 bg-slate-50/40 dark:bg-slate-900/40 gap-3">
          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("forecast");
            }}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "forecast"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Mục tiêu & Khả thi
          </button>
          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("simulator");
            }}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "simulator"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Mô phỏng từng học kỳ (What-If)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Top Controls: Total Program Semesters & Target */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Thời lượng khóa học:
              </label>
              <select
                value={totalProgramSemesters}
                onChange={(e) => {
                  triggerHaptic("light");
                  setTotalProgramSemesters(Number(e.target.value));
                }}
                className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                aria-label="Chọn số học kỳ toàn khóa"
              >
                <option value={6}>6 học kỳ (Cao đẳng / 3 năm)</option>
                <option value={7}>7 học kỳ (3.5 năm)</option>
                <option value={8}>8 học kỳ (Chuẩn 4 năm HUIT)</option>
                <option value={9}>9 học kỳ (4.5 năm / Kỹ sư)</option>
                <option value={10}>10 học kỳ (5 năm)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Mục tiêu xếp loại tốt nghiệp:
              </label>
              <select
                value={useCustomScore ? "custom" : targetTier}
                onChange={(e) => {
                  triggerHaptic("light");
                  if (e.target.value === "custom") {
                    setUseCustomScore(true);
                  } else {
                    setUseCustomScore(false);
                    setTargetTier(e.target.value as GraduationTier);
                  }
                }}
                className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                aria-label="Chọn mục tiêu xếp loại"
              >
                <option value="xuat_sac">Xuất sắc (≥ 90 điểm)</option>
                <option value="tot">Tốt (≥ 80 điểm)</option>
                <option value="kha">Khá (≥ 70 điểm)</option>
                <option value="trung_binh">Trung bình (≥ 50 điểm)</option>
                <option value="custom">Tùy chỉnh điểm...</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Kỷ luật toàn khóa (Điều 12.3):
              </label>
              <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDisciplineWarning}
                  onChange={(e) => {
                    triggerHaptic("medium");
                    setHasDisciplineWarning(e.target.checked);
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-[11px]">Bị kỷ luật Cảnh cáo trở lên</span>
              </label>
            </div>

            {useCustomScore && (
              <div className="sm:col-span-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <span className="text-xs text-slate-600 dark:text-slate-400">Điểm mục tiêu cụ thể:</span>
                <input
                  type="number"
                  min={50}
                  max={100}
                  step={0.5}
                  value={customScore}
                  onChange={(e) => setCustomScore(Number(e.target.value))}
                  className="w-24 text-xs font-bold px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  aria-label="Nhập điểm mục tiêu cụ thể"
                />
                <span className="text-xs text-slate-500">điểm toàn khóa</span>
              </div>
            )}
          </div>

          {/* Discipline Warning Banner if Applicable */}
          {forecast.disciplineDowngraded && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl flex items-start space-x-2.5 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Quy chế kỷ luật tốt nghiệp (Điều 12 Khoản 3):</strong>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  {forecast.disciplineWarningMessage} Dự phóng xếp loại hiệu lực cao nhất đạt được là{" "}
                  <strong>{forecast.effectiveProjectedTierLabel}</strong>.
                </p>
              </div>
            </div>
          )}

          {activeTab === "forecast" ? (
            <>
              {/* Primary KPI Status Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Đã tích lũy</span>
                  <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                    {forecast.completedCount}/{forecast.totalProgramSemesters} HK
                  </div>
                  <span className="text-[10px] text-slate-500">
                    TB hiện tại: <strong className="text-slate-700 dark:text-slate-300">{forecast.currentAverage}đ</strong>
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Học kỳ còn lại</span>
                  <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                    {forecast.remainingSemestersCount} HK
                  </div>
                  <span className="text-[10px] text-slate-500">Cần thêm {forecast.pointsNeededTotal}đ tổng</span>
                </div>

                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60">
                  <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">TB cần đạt mỗi HK</span>
                  <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {forecast.requiredAveragePerRemaining}đ
                  </div>
                  <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80">
                    Mục tiêu: {forecast.targetScore}đ ({forecast.targetTierLabel})
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${forecast.feasibilityBadgeBg}`}>
                  <span className="text-[11px] font-medium">Khả thi toán học</span>
                  <div className="text-xs sm:text-sm font-bold mt-1 leading-snug">
                    {forecast.feasibilityLabel}
                  </div>
                  <span className="text-[10px] opacity-80">
                    {forecast.isFeasible ? "Có thể đạt được" : "Vượt trần 100đ"}
                  </span>
                </div>
              </div>

              {/* Progress Visualization */}
              <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Khoảng cách đến ngưỡng {forecast.targetTierLabel} ({forecast.targetScore}đ):
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Hiện tại: {forecast.currentAverage}đ &rarr; Cần: {forecast.requiredAveragePerRemaining}đ/HK
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden relative">
                  {/* Current Score Bar */}
                  <div
                    className="bg-indigo-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, forecast.currentAverage))}%` }}
                  />
                  {/* Target line indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-amber-500 z-10"
                    style={{ left: `${Math.min(100, forecast.targetScore)}%` }}
                    title={`Ngưỡng mục tiêu: ${forecast.targetScore}đ`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0đ</span>
                  <span>50đ (TB)</span>
                  <span>70đ (Khá)</span>
                  <span>80đ (Tốt)</span>
                  <span>90đ (Xuất sắc)</span>
                  <span>100đ</span>
                </div>
              </div>

              {/* Actionable Category Roadmap */}
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Kế hoạch phân bổ điểm 5 tiêu chí mỗi học kỳ còn lại</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Chiến lược đề xuất để chạm mốc trung bình {forecast.requiredAveragePerRemaining}đ/học kỳ:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {forecast.categoryRoadmap.map((item) => (
                    <div
                      key={item.category}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {item.code}: {item.name}
                        </span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400">
                          {item.recommendedPoints}/{item.maxPoints}đ
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {item.actionGuide}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Interactive What-If Simulator Tab */
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between gap-3">
                <div className="text-xs text-indigo-900 dark:text-indigo-200">
                  <strong>Thử nghiệm các kịch bản điểm số:</strong> Kéo thanh trượt từng học kỳ tương lai để quan sát
                  điểm tích lũy tốt nghiệp thời gian thực.
                </div>
                <button
                  onClick={handleApplyEvenSplit}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-xs"
                >
                  Gán đều điểm cần đạt
                </button>
              </div>

              {/* Sliders for Remaining Semesters */}
              <div className="space-y-3">
                {Array.from({ length: remainingCount }).map((_, idx) => {
                  const semNum = completedCount + 1 + idx;
                  const currentVal = simulatedScores[semNum] ?? 80;

                  return (
                    <div
                      key={semNum}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Học kỳ {semNum} (Tương lai)
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                            {currentVal} điểm
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {currentVal >= 90 ? "Xuất sắc" : currentVal >= 80 ? "Tốt" : currentVal >= 70 ? "Khá" : "TB"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-[10px] text-slate-400">50đ</span>
                        <input
                          type="range"
                          min={50}
                          max={100}
                          step={1}
                          value={currentVal}
                          onChange={(e) => handleSliderChange(semNum, Number(e.target.value))}
                          className="flex-1 accent-indigo-600 cursor-pointer"
                          aria-label={`Điểm mô phỏng học kỳ ${semNum}`}
                        />
                        <span className="text-[10px] text-slate-400">100đ</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Simulation Outcome Banner */}
              <div
                className={`p-4 rounded-xl border ${
                  simulationOutcome.isTargetMet
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                    : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
                } space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {simulationOutcome.isTargetMet ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    )}
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Kết quả mô phỏng toàn khóa:
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                      {simulationOutcome.overallAverage}đ
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${simulationOutcome.overallRating.badgeBg}`}
                    >
                      {simulationOutcome.effectiveLabel}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {simulationOutcome.isTargetMet
                    ? `Chúc mừng! Kịch bản điểm này giúp bạn đạt ngưỡng tốt nghiệp loại ${forecast.targetTierLabel} (≥ ${forecast.targetScore}đ).`
                    : `Kịch bản hiện tại chưa đạt mục tiêu ${forecast.targetScore}đ. Bạn cần tăng thêm ${Math.round((forecast.targetScore - simulationOutcome.overallAverage) * 10) / 10}đ trung bình toàn khóa.`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Đã sao chép!" : "Sao chép tóm tắt"}</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic("light");
                window.print();
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In kết quả</span>
            </button>
          </div>

          <button
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer transition-colors shadow-xs"
          >
            Đóng bảng dự báo
          </button>
        </div>
      </div>
    </div>
  );
};

