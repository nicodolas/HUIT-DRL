"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { DrlCriteriaPreset, DrlRecord } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/drl/rules";
import { addOfflineDraft } from "@/lib/offline/drafts";
import { X, Search, Check, Sparkles, Camera, Image as ImageIcon, Loader2, Compass } from "lucide-react";
import { compressImage, formatBytes } from "@/lib/media/compressor";
import { classifyHuitActivity, ActivityClassificationResult } from "@/lib/classifier/activity-classifier";
import { triggerHaptic } from "@/lib/native/platform";

const POPULAR_SHORTCUTS = [
  { label: "Cổ vũ văn nghệ/TT", code: "TC3_CO_VU", badge: "+2đ" },
  { label: "Thi VHVN/TT cấp Khoa", code: "TC3_CUOC_THI_KHOA", badge: "+4đ" },
  { label: "Thi VHVN/TT cấp Trường", code: "TC3_CUOC_THI_TRUONG", badge: "+6đ" },
  { label: "Thành viên CLB / Đội", code: "TC5_THANH_VIEN_CLB", badge: "+3đ" },
  { label: "Bình chọn / Like HĐ", code: "TC5_BINH_CHON_TRUONG", badge: "+2đ" },
  { label: "Hội thảo NCKH Trường", code: "TC5_HOI_THAO_TRUONG", badge: "+5đ" },
  { label: "Rớt 1 môn học", code: "TC2_ROT_1_MON", badge: "-2đ" },
  { label: "Vi phạm thẻ SV / Áo", code: "TC1_DONG_PHUC", badge: "-5đ" },
];

interface AddRecordModalProps {
  isOpen: boolean;
  semesterId: string;
  initialCategory?: number;
  initialPreset?: DrlCriteriaPreset | null;
  recordToEdit?: DrlRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  isOpen,
  semesterId,
  initialCategory,
  initialPreset,
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
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [compressingImage, setCompressingImage] = useState(false);
  const [compressedStats, setCompressedStats] = useState<{
    originalSize: number;
    compressedSize: number;
    reduction: number;
  } | null>(null);

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressingImage(true);
    setError(null);
    try {
      const result = await compressImage(file, { maxWidth: 1600, quality: 0.82 });
      setEvidenceUrl(result.dataUrl);
      setCompressedStats({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        reduction: result.reductionPercentage,
      });
    } catch (err: any) {
      setError("Lỗi xử lý ảnh: " + (err.message || "Không thể tối ưu hóa tệp"));
    } finally {
      setCompressingImage(false);
    }
  };

  // Custom entry states
  const [customTitle, setCustomTitle] = useState("");
  const [customPoints, setCustomPoints] = useState<number | "">("");
  const [customCategory, setCustomCategory] = useState<number>(initialCategory || 3);

  // Regulation 3385 Smart Classifier
  const smartSuggestion = useMemo(() => classifyHuitActivity(customTitle), [customTitle]);

  useEffect(() => {
    if (recordToEdit) {
      setTab("custom");
      setCustomTitle(recordToEdit.title);
      setCustomPoints(Number(recordToEdit.points));
      setCustomCategory(recordToEdit.category);
      setQuantity(recordToEdit.quantity || 1);
      setOccurredAt(recordToEdit.occurredAt || new Date().toISOString().split("T")[0]);
      setNote(recordToEdit.note || "");
      setEvidenceUrl(recordToEdit.evidenceUrl || "");
    } else if (initialPreset) {
      setTab("preset");
      setSelectedPreset(initialPreset);
      setSelectedCategory(initialPreset.category);
      setCustomCategory(initialPreset.category);
      setQuantity(1);
      setNote("");
      setEvidenceUrl("");
      setOccurredAt(new Date().toISOString().split("T")[0]);
    } else {
      setSelectedPreset(null);
      setCustomTitle("");
      setCustomPoints("");
      setQuantity(1);
      setNote("");
      setEvidenceUrl("");
      setOccurredAt(new Date().toISOString().split("T")[0]);
      if (initialCategory) {
        setSelectedCategory(initialCategory);
        setCustomCategory(initialCategory);
      }
    }
  }, [recordToEdit, initialCategory, initialPreset, isOpen]);

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
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setLoading(true);

    try {
      let payload: any = {
        semesterId,
        occurredAt,
        note: note.trim() || undefined,
        evidenceUrl: evidenceUrl.trim() || undefined,
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

      if (typeof navigator !== "undefined" && !navigator.onLine && !recordToEdit) {
        addOfflineDraft(payload);
        setSelectedPreset(null);
        setNote("");
        setEvidenceUrl("");
        setQuantity(1);
        setCustomTitle("");
        setCustomPoints("");
        onSuccess();
        onClose();
        return;
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
      setEvidenceUrl("");
      setQuantity(1);
      setCustomTitle("");
      setCustomPoints("");
      onSuccess();
      onClose();
    } catch (err: any) {
      const isNetworkError =
        err.name === "TypeError" ||
        err.message?.toLowerCase().includes("fetch") ||
        err.message?.toLowerCase().includes("network") ||
        err.message?.toLowerCase().includes("failed to") ||
        (typeof navigator !== "undefined" && !navigator.onLine);

      if (!recordToEdit && isNetworkError) {
        // Fallback to offline draft on mobile network drop / timeout
        addOfflineDraft({
          semesterId,
          occurredAt,
          note: note.trim() || undefined,
          evidenceUrl: evidenceUrl.trim() || undefined,
          quantity,
          category: tab === "preset" ? selectedPreset!.category : customCategory,
          title: tab === "preset" ? selectedPreset!.title : customTitle.trim(),
          type: tab === "preset" ? selectedPreset!.type : (Number(customPoints) >= 0 ? "add" : "deduct"),
          points: tab === "preset" ? selectedPreset!.points : Number(customPoints),
        });
        setSelectedPreset(null);
        setNote("");
        setEvidenceUrl("");
        setQuantity(1);
        setCustomTitle("");
        setCustomPoints("");
        onSuccess();
        onClose();
        return;
      }
      setError(err.message);
    } finally {
      submittingRef.current = false;
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

              {/* Popular Shortcuts */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Hoạt động thường gặp
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SHORTCUTS.map((item) => {
                    const isSelected = selectedPreset?.code === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          const matched = presets.find((p) => p.code === item.code);
                          if (matched) {
                            setSelectedPreset(matched);
                            setSelectedCategory(matched.category);
                          }
                        }}
                        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-1 rounded ${
                            isSelected
                              ? "bg-slate-700 text-amber-300"
                              : item.badge.startsWith("+")
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {item.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
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

                {/* Regulation 3385 Live Classifier Pill */}
                {smartSuggestion && (
                  <div
                    className="mt-2 p-2.5 bg-linear-to-r from-indigo-50 to-sky-50 dark:from-indigo-950/40 dark:to-sky-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-1.5 animate-in fade-in duration-200"
                    data-testid="smart-classifier-suggestion"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                              Gợi ý QĐ 3385:
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                              TC{smartSuggestion.matchedCategory}
                            </span>
                            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                              {smartSuggestion.suggestedPoints > 0 ? `+${smartSuggestion.suggestedPoints}` : smartSuggestion.suggestedPoints}đ
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({smartSuggestion.matchedRule})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                            {smartSuggestion.explanation}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("medium");
                          setCustomCategory(smartSuggestion.matchedCategory);
                          setCustomPoints(smartSuggestion.suggestedPoints);
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-2xs shrink-0"
                      >
                        Áp dụng gợi ý
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/60 p-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                      <strong className="text-slate-700 dark:text-slate-300">Minh chứng đề xuất:</strong> {smartSuggestion.requiredProofGuide}
                    </div>
                  </div>
                )}
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Minh chứng hoạt động (URL Drive hoặc tải ảnh trực tiếp):
                </label>
                {compressingImage && (
                  <span className="text-[11px] text-amber-600 flex items-center space-x-1 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Đang nén WebP...</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="https://drive.google.com/... hoặc chọn ảnh"
                  value={evidenceUrl.startsWith("data:image") ? "(Đã đính kèm ảnh WebP tối ưu hóa)" : evidenceUrl}
                  onChange={(e) => {
                    if (!evidenceUrl.startsWith("data:image")) {
                      setEvidenceUrl(e.target.value);
                    }
                  }}
                  readOnly={evidenceUrl.startsWith("data:image")}
                  className="flex-1 text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono text-[11px]"
                />

                <label className="flex items-center space-x-1 px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs cursor-pointer border border-slate-200 transition-colors shrink-0">
                  <Camera className="w-3.5 h-3.5 text-slate-600" />
                  <span>Chọn ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Compressed statistics preview */}
              {compressedStats && evidenceUrl.startsWith("data:image") && (
                <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-[11px] text-emerald-800">
                  <span className="flex items-center space-x-1 font-medium">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Đã tối ưu: {formatBytes(compressedStats.originalSize)} → {formatBytes(compressedStats.compressedSize)} (-{compressedStats.reduction}%)
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceUrl("");
                      setCompressedStats(null);
                    }}
                    className="text-red-600 hover:text-red-700 font-semibold cursor-pointer underline text-[10px]"
                  >
                    Gỡ ảnh
                  </button>
                </div>
              )}
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
