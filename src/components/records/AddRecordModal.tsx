"use client";

import React, { useState, useEffect } from "react";
import { DrlCriteriaPreset, DrlRecord } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/drl/rules";
import { X, Search, Check } from "lucide-react";

interface AddRecordModalProps {
  isOpen: boolean;
  semesterId: string;
  initialCategory?: number;
  recordToEdit?: DrlRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  isOpen,
  semesterId,
  initialCategory,
  recordToEdit,
  onClose,
  onSuccess,
}) => {
  const [tab, setTab] = useState<"preset" | "custom">("preset");
  const [presets, setPresets] = useState<DrlCriteriaPreset[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>(initialCategory || 0);
  const [search, setSearch] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<DrlCriteriaPreset | null>(null);

  // Form states
  const [quantity, setQuantity] = useState(1);
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom entry states
  const [customTitle, setCustomTitle] = useState("");
  const [customPoints, setCustomPoints] = useState<number | "">("");
  const [customCategory, setCustomCategory] = useState<number>(initialCategory || 3);

  useEffect(() => {
    if (recordToEdit) {
      setTab("custom");
      setCustomTitle(recordToEdit.title);
      setCustomPoints(Number(recordToEdit.points));
      setCustomCategory(recordToEdit.category);
      setQuantity(recordToEdit.quantity || 1);
      setOccurredAt(recordToEdit.occurredAt || new Date().toISOString().split("T")[0]);
      setNote(recordToEdit.note || "");
    } else {
      setSelectedPreset(null);
      setCustomTitle("");
      setCustomPoints("");
      setQuantity(1);
      setNote("");
      setOccurredAt(new Date().toISOString().split("T")[0]);
      if (initialCategory) {
        setSelectedCategory(initialCategory);
        setCustomCategory(initialCategory);
      }
    }
  }, [recordToEdit, initialCategory, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/presets")
        .then((res) => res.json())
        .then((data) => {
          if (data.presets) setPresets(data.presets);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredPresets = presets.filter((p) => {
    if (selectedCategory > 0 && p.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let payload: any = {
        semesterId,
        occurredAt,
        note: note.trim() || undefined,
        quantity,
      };

      if (tab === "preset") {
        if (!selectedPreset) {
          setError("Vui lòng chọn một mục tiêu chí trong danh sách");
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          presetId: selectedPreset.id,
          category: selectedPreset.category,
          title: selectedPreset.title,
          type: selectedPreset.type,
          points: selectedPreset.points,
        };
      } else {
        if (!customTitle.trim()) {
          setError("Vui lòng nhập tên hoạt động");
          setLoading(false);
          return;
        }
        if (customPoints === "" || isNaN(Number(customPoints))) {
          setError("Vui lòng nhập số điểm hợp lệ");
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          category: customCategory,
          title: customTitle.trim(),
          type: Number(customPoints) >= 0 ? "add" : "deduct",
          points: Number(customPoints),
        };
      }

      const url = recordToEdit ? `/api/records/${recordToEdit.id}` : "/api/records";
      const method = recordToEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi lưu hoạt động");
      }

      setSelectedPreset(null);
      setNote("");
      setQuantity(1);
      setCustomTitle("");
      setCustomPoints("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              {recordToEdit ? "Chỉnh sửa mục điểm" : "Ghi nhận điểm rèn luyện"}
            </h3>
            <p className="text-[11px] text-slate-500">
              {recordToEdit ? "Cập nhật thông tin hoạt động" : "Theo quy chuẩn Quyết định số 3385/QĐ-DCT"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex space-x-2">
          <button
            type="button"
            onClick={() => setTab("preset")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              tab === "preset"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Mục chuẩn QĐ 3385 ({presets.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("custom")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              tab === "custom"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tự nhập mục riêng
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          {tab === "preset" ? (
            <>
              {/* Category Filter */}
              <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(0)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedCategory === 0
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Tất cả
                </button>
                {[1, 2, 3, 4, 5].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCategory(c)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      selectedCategory === c
                        ? "bg-slate-800 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    TC {c}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm: SHCD, BHYT, rớt môn, văn nghệ, CLB, NCKH..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Presets List */}
              <div className="max-h-52 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                {filteredPresets.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Không tìm thấy tiêu chí phù hợp
                  </div>
                ) : (
                  filteredPresets.map((p) => {
                    const isSelected = selectedPreset?.id === p.id;
                    const isAdd = Number(p.points) > 0;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPreset(p)}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors flex items-center justify-between ${
                          isSelected
                            ? "bg-white border-slate-900 shadow-2xs"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex-1 pr-2 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-mono font-bold px-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              TC{p.category}
                            </span>
                            <span className="text-xs font-semibold text-slate-900 truncate">
                              {p.title}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                            {p.unit ? `Đơn vị: ${p.unit}` : ""} {p.description ? `• ${p.description}` : ""}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span
                            className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                              isAdd
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-red-50 text-red-800 border border-red-200"
                            }`}
                          >
                            {isAdd ? `+${p.points}` : p.points}đ
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-slate-900" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* Custom Tab */
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Thuộc tiêu chí:
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(Number(e.target.value))}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                >
                  {[1, 2, 3, 4, 5].map((c) => (
                    <option key={c} value={c}>
                      TC {c}: {CATEGORIES[c].name} (Trần {CATEGORIES[c].maxPoints}đ)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tên hoạt động / Lý do:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tham gia ngày hội việc làm HUIT..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Số điểm (Dương để cộng, âm để trừ):
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ví dụ: +4 hoặc -5"
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value ? Number(e.target.value) : "")}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono font-bold"
                />
              </div>
            </div>
          )}

          {/* Common Fields */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Số lần / Số lượng:
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ngày diễn ra:
                </label>
                <input
                  type="date"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Ghi chú thêm (tùy chọn):
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Có giấy xác nhận, Hội trường A..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? "Đang lưu..." : recordToEdit ? "Lưu thay đổi" : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
};
