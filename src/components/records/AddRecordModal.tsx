"use client";

import React, { useState, useEffect } from "react";
import { DrlCriteriaPreset } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/drl/rules";
import { X, Search, Plus, Check, Calendar, FileText } from "lucide-react";

interface AddRecordModalProps {
  isOpen: boolean;
  semesterId: string;
  initialCategory?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  isOpen,
  semesterId,
  initialCategory,
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
    if (initialCategory) {
      setSelectedCategory(initialCategory);
      setCustomCategory(initialCategory);
    }
  }, [initialCategory]);

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

      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi lưu hoạt động");
      }

      // Reset & close
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-extrabold text-base text-slate-800">
              Ghi nhận điểm rèn luyện
            </h3>
            <p className="text-xs text-slate-500">
              Cộng hoặc trừ điểm theo tiêu chí HUIT
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex space-x-2">
          <button
            type="button"
            onClick={() => setTab("preset")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === "preset"
                ? "bg-huit-blue-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Danh mục chuẩn QĐ 3385 (65 mục)
          </button>
          <button
            type="button"
            onClick={() => setTab("custom")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === "custom"
                ? "bg-huit-blue-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tự nhập mục riêng
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {tab === "preset" ? (
            <>
              {/* Category Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(0)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
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
                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                      selectedCategory === c
                        ? "bg-huit-blue-700 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    TC {c}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm: SHCD, BHYT, rớt môn, văn nghệ, CLB, NCKH..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-huit-blue-600"
                />
              </div>

              {/* Preset List */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200/80 rounded-2xl p-2 bg-slate-50/50">
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
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-blue-50/80 border-huit-blue-600 shadow-2xs"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex-1 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                              TC{p.category}
                            </span>
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">
                              {p.title}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {p.unit ? `Đơn vị tính: ${p.unit}` : ""} {p.description ? `• ${p.description}` : ""}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span
                            className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                              isAdd
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {isAdd ? `+${p.points}` : p.points}đ
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-huit-blue-700 font-bold" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* Custom entry tab */
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Thuộc tiêu chí:
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(Number(e.target.value))}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-huit-blue-600 font-semibold"
                >
                  {[1, 2, 3, 4, 5].map((c) => (
                    <option key={c} value={c}>
                      TC {c}: {CATEGORIES[c].name} (Trần {CATEGORIES[c].maxPoints}đ)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tên hoạt động / Lý do:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tham gia tình nguyện hiến máu nhân đạo..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-huit-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Số điểm (Nhập số dương để cộng, số âm để trừ):
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ví dụ: +4 hoặc -5"
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value ? Number(e.target.value) : "")}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-huit-blue-600 font-bold"
                />
              </div>
            </div>
          )}

          {/* Common fields: Quantity, Date, Note */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Số lần / Số lượng:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-huit-blue-600 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ngày tham gia / vi phạm:
                </label>
                <input
                  type="date"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-huit-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Ghi chú thêm (tùy chọn):
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Có giấy chứng nhận Ban tổ chức, Hội trường B..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-huit-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-huit-blue-700 hover:bg-huit-blue-800 text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Đang lưu..." : "Xác nhận ghi nhận"}
          </button>
        </div>
      </div>
    </div>
  );
};
