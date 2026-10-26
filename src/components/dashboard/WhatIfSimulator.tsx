"use client";

import React, { useState } from "react";
import { DisciplineLevel } from "@/lib/drl/rules";
import { calculateSemesterScore } from "@/lib/drl/calculator";
import { DrlRecord } from "@/lib/db/schema";
import { Sliders, Check, ArrowRight, Plus, RefreshCw, CheckCircle2 } from "lucide-react";

interface SimulationItem {
  id: string;
  category: number;
  title: string;
  points: number;
  checked: boolean;
}

const DEFAULT_SIMULATION_OPTIONS: Array<Omit<SimulationItem, "id" | "checked">> = [
  { category: 3, title: "Cuộc thi VHVN - TDTT cấp Trường", points: 6 },
  { category: 3, title: "Cổ vũ hoạt động Trường / Khoa", points: 2 },
  { category: 3, title: "Hiến máu tình nguyện / CTXH", points: 5 },
  { category: 5, title: "Thành viên CLB / Đội nhóm thường xuyên", points: 3 },
  { category: 5, title: "Tham gia Hội thảo NCKH cấp Trường", points: 5 },
  { category: 5, title: "Bình chọn / Tương tác hoạt động HUIT", points: 2 },
];

interface WhatIfSimulatorProps {
  currentRecords: DrlRecord[];
  disciplineLevel?: string;
  semesterId: string;
  onCommittedSuccess?: () => void;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  currentRecords,
  disciplineLevel = "none",
  semesterId,
  onCommittedSuccess,
}) => {
  const [items, setItems] = useState<SimulationItem[]>(
    DEFAULT_SIMULATION_OPTIONS.map((opt, idx) => ({
      ...opt,
      id: `sim_${idx}`,
      checked: false,
    }))
  );

  const [saving, setSaving] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(false);

  // 1. Current actual score
  const actualScore = calculateSemesterScore(
    currentRecords,
    disciplineLevel as DisciplineLevel
  );

  // 2. Simulated records
  const simulatedRecords = [
    ...currentRecords,
    ...items
      .filter((i) => i.checked)
      .map((i) => ({
        id: i.id,
        userId: "",
        semesterId,
        presetId: null,
        category: i.category,
        title: i.title,
        type: i.points >= 0 ? "add" : "deduct",
        points: String(i.points),
        quantity: 1,
        occurredAt: null,
        note: null,
        evidenceUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
  ];

  const simulatedScore = calculateSemesterScore(
    simulatedRecords as DrlRecord[],
    disciplineLevel as DisciplineLevel
  );
  const diff = simulatedScore.totalScore - actualScore.totalScore;

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleCommitSelected = async () => {
    const selected = items.filter((i) => i.checked);
    if (selected.length === 0) return;

    setSaving(true);
    try {
      for (const item of selected) {
        await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            semesterId,
            category: item.category,
            title: item.title,
            type: "add",
            points: item.points,
            quantity: 1,
            occurredAt: new Date().toISOString().split("T")[0],
            note: "Thêm từ kế hoạch mô phỏng What-If",
          }),
        });
      }

      setCommitSuccess(true);
      // Uncheck all
      setItems((prev) => prev.map((i) => ({ ...i, checked: false })));
      if (onCommittedSuccess) onCommittedSuccess();
      setTimeout(() => setCommitSuccess(false), 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-1.5 text-slate-900 dark:text-white font-bold text-sm">
            <Sliders className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h2>Mô phỏng điểm rèn luyện dự kiến</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Chọn dự kiến các hoạt động sắp tham gia để xem điểm và xếp loại trước khi ghi nhận
          </p>
        </div>

        {/* Live Score Projection Badge */}
        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Hiện tại</span>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              {actualScore.totalScore}đ ({actualScore.rating.label})
            </span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <div className="text-left">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">Dự phóng</span>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
              {simulatedScore.totalScore}đ ({simulatedScore.rating.label})
            </span>
          </div>
        </div>
      </div>

      {/* Difference pill */}
      {diff > 0 && (
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center justify-between">
          <span>
            Nếu hoàn thành các mục đã chọn, bạn sẽ tăng thêm <strong>+{diff} điểm</strong> rèn luyện!
          </span>
          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-700">
            +{diff}đ
          </span>
        </div>
      )}

      {/* Options List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {items.map((item) => {
          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`p-3 rounded-lg border text-left cursor-pointer transition-colors flex items-center justify-between ${
                item.checked
                  ? "bg-slate-900 dark:bg-slate-800 text-white border-slate-900 dark:border-amber-400 shadow-2xs"
                  : "bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center space-x-2 min-w-0 pr-2">
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    item.checked
                      ? "bg-amber-400 border-amber-400 text-slate-900"
                      : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  }`}
                >
                  {item.checked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="min-w-0">
                  <span
                    className={`text-[10px] font-mono font-bold px-1 rounded mr-1.5 ${
                      item.checked
                        ? "bg-slate-800 text-slate-300"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    TC{item.category}
                  </span>
                  <span className="text-xs font-medium truncate">{item.title}</span>
                </div>
              </div>

              <span
                className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  item.checked
                    ? "bg-slate-800 dark:bg-slate-700 text-amber-300"
                    : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                }`}
              >
                +{item.points}đ
              </span>
            </div>
          );
        })}
      </div>

      {/* Commit button if items selected */}
      {items.some((i) => i.checked) && (
        <div className="pt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setItems((prev) => prev.map((i) => ({ ...i, checked: false })))}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline cursor-pointer"
          >
            Bỏ chọn tất cả
          </button>

          <button
            type="button"
            onClick={handleCommitSelected}
            disabled={saving}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang ghi nhận...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-amber-400 dark:text-slate-950" />
                <span>Lưu các mục đã chọn vào học kỳ</span>
              </>
            )}
          </button>
        </div>
      )}

      {commitSuccess && (
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Đã lưu thành công các hoạt động được chọn vào học kỳ!</span>
        </div>
      )}
    </div>
  );
};
