"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { DrlCriteriaPreset, DrlRecord } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/drl/rules";
import { addOfflineDraft } from "@/lib/offline/drafts";
import { DEFAULT_HUIT_PRESETS } from "@/lib/presets/default-presets";
import { getPresetsCache, savePresetsCache, getUserSemestersCache } from "@/lib/offline/cache";
import { X, Search, Check, Sparkles, Camera, Image as ImageIcon, Loader2, Compass, Share2 } from "lucide-react";
import { compressImage, formatBytes } from "@/lib/media/compressor";
import { classifyHuitActivity, ActivityClassificationResult } from "@/lib/classifier/activity-classifier";
import { triggerHaptic } from "@/lib/native/platform";
import { splitLocationNote } from "@/lib/calendar/utils";

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
  initialDate?: string;
  recordToEdit?: DrlRecord | null;
  onClose: () => void;
  onSuccess: () => void;
  onOpenShareModal?: (record: DrlRecord) => void;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  isOpen,
  semesterId,
  initialCategory,
  initialPreset,
  initialDate,
  recordToEdit,
  onClose,
  onSuccess,
  onOpenShareModal,
}) => {
  const [tab, setTab] = useState<"preset" | "custom">("preset");
  const [effectiveSemesterId, setEffectiveSemesterId] = useState(semesterId);

  useEffect(() => {
    if (semesterId) {
      setEffectiveSemesterId(semesterId);
    } else if (isOpen) {
      fetch("/api/semesters")
        .then((res) => res.json())
        .then((data) => {
          if (data.semesters && data.semesters.length > 0) {
            const cur = data.semesters.find((s: any) => s.isCurrent) || data.semesters[0];
            if (cur?.id) {
              setEffectiveSemesterId(cur.id);
            }
          }
        })
        .catch((err) => console.warn("Failed to auto-resolve semester in AddRecordModal:", err));
    }
  }, [semesterId, isOpen]);

  const [presets, setPresets] = useState<DrlCriteriaPreset[]>(() => {
    const cached = getPresetsCache();
    return cached && cached.length > 0 ? cached : DEFAULT_HUIT_PRESETS;
  });
  const [selectedCategory, setSelectedCategory] = useState<number>(initialCategory || 0);
  const [search, setSearch] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<DrlCriteriaPreset | null>(null);

  // Form states
  const [quantity, setQuantity] = useState(1);
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().split("T")[0]);
  const [occurredTime, setOccurredTime] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [createShareInvite, setCreateShareInvite] = useState(false);
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
      const result = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.78 });
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
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  // Custom entry states
  const [customTitle, setCustomTitle] = useState("");
  const [customPoints, setCustomPoints] = useState<number | "">("");
  const [customCategory, setCustomCategory] = useState<number>(initialCategory || 3);

  // Regulation 3385 Smart Classifier
  const smartSuggestion = useMemo(() => classifyHuitActivity(customTitle), [customTitle]);

  useEffect(() => {
    setCreateShareInvite(false);
    if (recordToEdit) {
      setTab("custom");
      setCustomTitle(recordToEdit.title);
      setCustomPoints(Number(recordToEdit.points));
      setCustomCategory(recordToEdit.category);
      setQuantity(recordToEdit.quantity || 1);
      if (recordToEdit.occurredAt?.includes("T")) {
        const [d, t] = recordToEdit.occurredAt.split("T");
        setOccurredAt(d);
        setOccurredTime(t.slice(0, 5));
      } else {
        setOccurredAt(recordToEdit.occurredAt || new Date().toISOString().split("T")[0]);
        setOccurredTime("");
      }
      const { location: initialLocation, cleanNote: initialNote } = splitLocationNote(recordToEdit.note);
      setLocation(initialLocation || "");
      setNote(initialNote || "");
      setEvidenceUrl(recordToEdit.evidenceUrl || "");
    } else if (initialPreset) {
      setTab("preset");
      const defaultDate = initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
        ? initialDate
        : (() => {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          })();

      setSelectedPreset(initialPreset);
      setSelectedCategory(initialPreset.category);
      setCustomCategory(initialPreset.category);
      setQuantity(1);
      setLocation("");
      setNote("");
      setEvidenceUrl("");
      setOccurredAt(defaultDate);
      setOccurredTime("");
    } else {
      const defaultDate = initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
        ? initialDate
        : (() => {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          })();

      setSelectedPreset(null);
      setCustomTitle("");
      setCustomPoints("");
      setQuantity(1);
      setLocation("");
      setNote("");
      setEvidenceUrl("");
      setOccurredAt(defaultDate);
      setOccurredTime("");
      if (initialCategory) {
        setSelectedCategory(initialCategory);
        setCustomCategory(initialCategory);
      }
    }
  }, [recordToEdit, initialCategory, initialPreset, initialDate, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/presets")
        .then((res) => res.json())
        .then((data) => {
          if (data.presets && data.presets.length > 0) {
            setPresets(data.presets);
            savePresetsCache(data.presets);
          }
        })
        .catch((err) => {
          console.warn("Background presets fetch error, fallback to offline cache:", err);
        });
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

    let activeSemesterId = effectiveSemesterId || semesterId;
    if (!activeSemesterId || !activeSemesterId.trim()) {
      const cached = getUserSemestersCache();
      if (cached && cached.length > 0) {
        const cur = cached.find((s) => s.isCurrent) || cached[0];
        if (cur?.id) activeSemesterId = cur.id;
      }
    }

    const trimmedDate = occurredAt.trim();
    const finalOccurredAt = trimmedDate && occurredTime.trim()
      ? `${trimmedDate}T${occurredTime.trim()}`
      : trimmedDate;
    let finalNote = note.trim();
    if (location.trim() && !finalNote.includes(location.trim())) {
      finalNote = finalNote ? `[${location.trim()}] ${finalNote}` : `[${location.trim()}]`;
    }

    try {
      if (!activeSemesterId || !activeSemesterId.trim()) {
        try {
          const sRes = await fetch("/api/semesters");
          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData.semesters && sData.semesters.length > 0) {
              const cur = sData.semesters.find((s: any) => s.isCurrent) || sData.semesters[0];
              if (cur?.id) {
                activeSemesterId = cur.id;
                setEffectiveSemesterId(cur.id);
              }
            }
          }
        } catch {
          // ignore network failure
        }
      }

      if (!activeSemesterId || !activeSemesterId.trim()) {
        setError("Chưa chọn học kỳ hợp lệ. Vui lòng thử lại sau giây lát.");
        setLoading(false);
        return;
      }

      let payload: any = {
        semesterId: activeSemesterId,
        occurredAt: finalOccurredAt,
        note: finalNote || undefined,
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

      const shouldShare = createShareInvite && !recordToEdit;
      let createdRecord: DrlRecord | null = null;
      if (shouldShare && data.recordId) {
        createdRecord = {
          id: data.recordId,
          userId: "",
          semesterId: payload.semesterId,
          presetId: payload.presetId || null,
          category: payload.category,
          title: payload.title,
          type: payload.type,
          points: String(payload.points),
          quantity: payload.quantity,
          occurredAt: payload.occurredAt || null,
          note: payload.note || null,
          evidenceUrl: payload.evidenceUrl || null,
          auditStatus: payload.evidenceUrl ? "pending_review" : "missing",
          auditComment: null,
          originInviteCode: null,
          originCreatorUsername: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      setSelectedPreset(null);
      setNote("");
      setEvidenceUrl("");
      setQuantity(1);
      setCustomTitle("");
      setCustomPoints("");
      setCreateShareInvite(false);
      onSuccess();
      onClose();

      if (shouldShare && createdRecord && onOpenShareModal) {
        onOpenShareModal(createdRecord);
      }
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
          semesterId: activeSemesterId,
          occurredAt: finalOccurredAt,
          note: finalNote || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {recordToEdit ? "Chỉnh sửa mục điểm" : "Ghi nhận điểm rèn luyện"}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {recordToEdit ? "Cập nhật thông tin hoạt động" : "Theo quy chuẩn Quyết định số 3385/QĐ-DCT"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex space-x-2">
          <button
            type="button"
            onClick={() => setTab("preset")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              tab === "preset"
                ? "bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Mục chuẩn QĐ 3385 ({presets.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("custom")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              tab === "custom"
                ? "bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Tự nhập mục riêng
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-lg font-medium">
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
                      ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-bold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
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
                        ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-bold"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    TC {c}
                  </button>
                ))}
              </div>

              {/* Popular Shortcuts */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
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
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:border-slate-300"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-1 rounded ${
                            isSelected
                              ? "bg-slate-700 dark:bg-slate-200 text-amber-300 dark:text-slate-900"
                              : item.badge.startsWith("+")
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300"
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
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm: SHCD, BHYT, rớt môn, văn nghệ, CLB, NCKH..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500"
                />
              </div>

              {/* Presets List */}
              <div className="max-h-52 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-slate-50/50 dark:bg-slate-950/40">
                {filteredPresets.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
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
                            ? "bg-white dark:bg-slate-800 border-slate-900 dark:border-amber-400 shadow-2xs"
                            : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <div className="flex-1 pr-2 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-mono font-bold px-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                              TC{p.category}
                            </span>
                            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {p.title}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {p.unit ? `Đơn vị: ${p.unit}` : ""} {p.description ? `• ${p.description}` : ""}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span
                            className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                              isAdd
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : "bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                            }`}
                          >
                            {isAdd ? `+${p.points}` : p.points}đ
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-slate-900 dark:text-amber-400" />
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
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Thuộc tiêu chí:
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(Number(e.target.value))}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500 font-medium cursor-pointer"
                >
                  {[1, 2, 3, 4, 5].map((c) => (
                    <option key={c} value={c} className="dark:bg-slate-800">
                      TC {c}: {CATEGORIES[c].name} (Trần {CATEGORIES[c].maxPoints}đ)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tên hoạt động / Lý do:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tham gia ngày hội việc làm HUIT..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500"
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
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Số điểm (Dương để cộng, âm để trừ):
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ví dụ: +4 hoặc -5"
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value ? Number(e.target.value) : "")}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500 font-mono font-bold"
                />
              </div>
            </div>
          )}

          {/* Common Fields */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="modal-quantity" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Số lần / Số lượng:
                </label>
                <input
                  id="modal-quantity"
                  type="number"
                  min="1"
                  max="20"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500 font-mono font-bold"
                />
              </div>

              <div>
                <label htmlFor="modal-occurred-date" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Ngày diễn ra:
                </label>
                <input
                  id="modal-occurred-date"
                  type="date"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="modal-occurred-time" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Giờ diễn ra (tùy chọn):
                </label>
                <input
                  id="modal-occurred-time"
                  type="time"
                  value={occurredTime}
                  onChange={(e) => setOccurredTime(e.target.value)}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="modal-activity-location" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Địa điểm tổ chức (tùy chọn):
                </label>
                <input
                  id="modal-activity-location"
                  type="text"
                  placeholder="Ví dụ: Hội trường A, Sân D..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Ghi chú thêm (tùy chọn):
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Có giấy xác nhận tham gia..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Minh chứng hoạt động (URL Drive hoặc chụp/chọn ảnh trực tiếp):
                </label>
                {compressingImage && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center space-x-1 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Đang nén WebP...</span>
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="https://drive.google.com/... hoặc chụp/chọn ảnh bên dưới"
                  value={evidenceUrl.startsWith("data:image") ? "(Đã đính kèm ảnh chụp minh chứng)" : evidenceUrl}
                  onChange={(e) => {
                    if (!evidenceUrl.startsWith("data:image")) {
                      setEvidenceUrl(e.target.value);
                    }
                  }}
                  readOnly={evidenceUrl.startsWith("data:image")}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500 font-mono text-[11px]"
                />

                {/* Dedicated Action Buttons: Native Camera & Gallery */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={compressingImage}
                    className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                    title="Mở camera điện thoại chụp trực tiếp giấy khen, phiếu điểm danh"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400 dark:text-slate-950" />
                    <span>Chụp Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={compressingImage}
                    className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                    title="Chọn ảnh có sẵn từ máy tính hoặc thư viện ảnh"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    <span>Chọn từ thư viện</span>
                  </button>
                </div>

                {/* Hidden HTML5 File Inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleProofFileChange}
                  className="hidden"
                  data-testid="camera-input"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProofFileChange}
                  className="hidden"
                  data-testid="gallery-input"
                />

                {/* Visual Thumbnail Preview Card with Remove/Replace Actions */}
                {evidenceUrl && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start gap-3 mt-1.5">
                    {evidenceUrl.startsWith("data:image") ? (
                      <div className="relative shrink-0">
                        <img
                          src={evidenceUrl}
                          alt="Xem trước ảnh minh chứng"
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-slate-300 dark:border-slate-600 shadow-2xs"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{evidenceUrl.startsWith("data:image") ? "Ảnh minh chứng sẵn sàng" : "Đường dẫn minh chứng hợp lệ"}</span>
                      </div>

                      {compressedStats ? (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                          Đã tối ưu: <span className="font-mono font-medium text-slate-800 dark:text-slate-100">{formatBytes(compressedStats.compressedSize)}</span>{" "}
                          (giảm {compressedStats.reduction}%)
                        </p>
                      ) : evidenceUrl.startsWith("data:image") ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Đã tối ưu định dạng WebP
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-mono">
                          {evidenceUrl}
                        </p>
                      )}

                      <div className="flex items-center space-x-3 mt-1.5 text-xs">
                        {evidenceUrl.startsWith("data:image") ? (
                          <>
                            <button
                              type="button"
                              onClick={() => galleryInputRef.current?.click()}
                              className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium cursor-pointer transition-colors"
                              title="Chọn ảnh khác từ thư viện"
                            >
                              Thay ảnh
                            </button>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEvidenceUrl("");
                                setCompressedStats(null);
                                if (cameraInputRef.current) cameraInputRef.current.value = "";
                                if (galleryInputRef.current) galleryInputRef.current.value = "";
                              }}
                              className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 font-medium cursor-pointer transition-colors"
                            >
                              Gỡ ảnh
                            </button>
                          </>
                        ) : (
                          <>
                            <a
                              href={evidenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium cursor-pointer transition-colors inline-flex items-center space-x-1"
                            >
                              <span>Mở liên kết ↗</span>
                            </a>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEvidenceUrl("");
                                setCompressedStats(null);
                              }}
                              className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 font-medium cursor-pointer transition-colors"
                            >
                              Gỡ liên kết
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {/* Auto-share toggle card */}
                {!recordToEdit && onOpenShareModal && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-800/50 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          Chia sẻ mã mời cho bạn bè
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Tự động tạo mã HUIT-XXXX & mã QR ngay sau khi lưu
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={createShareInvite}
                        onChange={(e) => {
                          triggerHaptic("light");
                          setCreateShareInvite(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
          >
            {loading ? (
              <span>Đang lưu...</span>
            ) : recordToEdit ? (
              <span>Lưu thay đổi</span>
            ) : createShareInvite ? (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Xác nhận & Chia sẻ</span>
              </>
            ) : (
              <span>Xác nhận</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
