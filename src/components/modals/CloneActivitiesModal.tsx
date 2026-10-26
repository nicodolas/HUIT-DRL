"use client";

import React, { useState, useEffect } from "react";
import { Semester, DrlRecord } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/drl/rules";
import { X, Copy, Check, RefreshCw, AlertCircle } from "lucide-react";

interface CloneActivitiesModalProps {
  isOpen: boolean;
  currentSemesterId: string;
  semesters: Semester[];
  onClose: () => void;
  onSuccess: () => void;
}

export const CloneActivitiesModal: React.FC<CloneActivitiesModalProps> = ({
  isOpen,
  currentSemesterId,
  semesters,
  onClose,
  onSuccess,
}) => {
  const otherSemesters = semesters.filter((s) => s.id !== currentSemesterId);
  const [sourceSemesterId, setSourceSemesterId] = useState<string>(
    otherSemesters[0]?.id || ""
  );
  const [sourceRecords, setSourceRecords] = useState<DrlRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (otherSemesters.length > 0 && !sourceSemesterId) {
      setSourceSemesterId(otherSemesters[0].id);
    }
  }, [otherSemesters, sourceSemesterId]);

  useEffect(() => {
    if (!isOpen || !sourceSemesterId) return;

    setLoading(true);
    setError(null);
    fetch(`/api/records?semesterId=${sourceSemesterId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.records) {
          const recs: DrlRecord[] = data.records;
          setSourceRecords(recs);
          // By default, select all positive activities
          const addIds = new Set(recs.filter((r) => Number(r.points) > 0).map((r) => r.id));
          setSelectedIds(addIds);
        } else {
          setSourceRecords([]);
          setSelectedIds(new Set());
        }
      })
      .catch((err) => setError("Lỗi tải hoạt động: " + err.message))
      .finally(() => setLoading(false));
  }, [isOpen, sourceSemesterId]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(sourceRecords.map((r) => r.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleClone = async () => {
    if (selectedIds.size === 0) {
      setError("Vui lòng chọn ít nhất một hoạt động để sao chép");
      return;
    }

    setCloning(true);
    setError(null);

    try {
      const res = await fetch("/api/records/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceSemesterId,
          targetSemesterId: currentSemesterId,
          recordIds: Array.from(selectedIds),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi sao chép hoạt động");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Copy className="w-4 h-4 text-amber-500" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Sao chép hoạt động giữa các học kỳ
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nhân bản các hoạt động thường niên (BHYT, SHCD, CLB...) sang kỳ mới
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          {otherSemesters.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
              <p>Bạn chỉ có 1 học kỳ duy nhất, cần tạo thêm học kỳ khác để sao chép.</p>
            </div>
          ) : (
            <>
              {/* Source Semester Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Chọn học kỳ nguồn để sao chép:
                </label>
                <select
                  value={sourceSemesterId}
                  onChange={(e) => setSourceSemesterId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500 font-medium"
                >
                  {otherSemesters.map((s) => (
                    <option key={s.id} value={s.id} className="dark:bg-slate-800">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Records Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Danh sách hoạt động ({sourceRecords.length}):
                  </span>
                  <div className="space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-400">•</span>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-500 dark:text-slate-400" />
                    Đang tải danh sách hoạt động...
                  </div>
                ) : sourceRecords.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    Học kỳ nguồn chưa có hoạt động nào được ghi nhận
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-slate-50 dark:bg-slate-950/40">
                    {sourceRecords.map((r) => {
                      const isSelected = selectedIds.has(r.id);
                      const isAdd = Number(r.points) > 0;
                      const catMeta = CATEGORIES[r.category];

                      return (
                        <div
                          key={r.id}
                          onClick={() => toggleSelect(r.id)}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors flex items-center justify-between ${
                            isSelected
                              ? "bg-white dark:bg-slate-800 border-slate-900 dark:border-amber-400 shadow-2xs"
                              : "bg-white/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0 pr-2">
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "bg-slate-900 dark:bg-amber-400 border-slate-900 dark:border-amber-400 text-white dark:text-slate-900"
                                  : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono font-bold px-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 mr-1.5">
                                {catMeta?.code || `TC${r.category}`}
                              </span>
                              <span className="text-xs font-medium text-slate-900 dark:text-white truncate">
                                {r.title}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isAdd
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : "bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                            }`}
                          >
                            {isAdd ? `+${r.points}` : r.points}đ
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Đã chọn: <strong className="text-slate-800 dark:text-slate-200">{selectedIds.size}</strong> hoạt động
          </span>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleClone}
              disabled={cloning || selectedIds.size === 0}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 transition-colors cursor-pointer disabled:opacity-50"
            >
              {cloning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang sao chép...</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-400 dark:text-slate-950" />
                  <span>Sao chép ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

