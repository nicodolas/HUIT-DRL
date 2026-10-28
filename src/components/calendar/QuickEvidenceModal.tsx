"use client";

import React, { useState, useRef, useEffect } from "react";
import { DrlRecord } from "@/lib/db/schema";
import { X, Camera, Image as ImageIcon, Loader2, Check, AlertCircle, Link as LinkIcon, Trash2 } from "lucide-react";
import { compressImage, formatBytes } from "@/lib/media/compressor";
import { triggerHaptic } from "@/lib/native/platform";

interface QuickEvidenceModalProps {
  isOpen: boolean;
  record: DrlRecord | null;
  onClose: () => void;
  onSuccess: (updated: DrlRecord) => void;
}

export const QuickEvidenceModal: React.FC<QuickEvidenceModalProps> = ({
  isOpen,
  record,
  onClose,
  onSuccess,
}) => {
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compressedStats, setCompressedStats] = useState<{
    originalSize: number;
    compressedSize: number;
    reduction: number;
  } | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (record) {
      setEvidenceUrl(record.evidenceUrl || "");
      setError(null);
      setCompressedStats(null);
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    setError(null);
    try {
      const result = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.78 });
      setEvidenceUrl(result.dataUrl);
      setCompressedStats({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        reduction: result.reductionPercentage,
      });
      triggerHaptic("light");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tối ưu hóa tệp";
      setError(`Lỗi xử lý ảnh: ${msg}`);
    } finally {
      setCompressing(false);
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedUrl = evidenceUrl.trim();
    if (!trimmedUrl) {
      setError("Vui lòng nhập đường dẫn hoặc đính kèm ảnh minh chứng");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/records/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceUrl: trimmedUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể cập nhật minh chứng");
      }

      triggerHaptic("success");
      onSuccess(data.record || { ...record, evidenceUrl: trimmedUrl });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi lưu minh chứng";
      setError(msg);
      triggerHaptic("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                Nộp minh chứng hoạt động
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {record.title} (TC{record.category})
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Đóng popup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="quick-evidence-url"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Đường dẫn minh chứng (URL Drive / Ảnh online):
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <LinkIcon className="w-3.5 h-3.5" />
              </div>
              <input
                id="quick-evidence-url"
                type="text"
                placeholder="https://drive.google.com/... hoặc chọn ảnh bên dưới"
                value={evidenceUrl.startsWith("data:image") ? "(Đã đính kèm ảnh chụp minh chứng)" : evidenceUrl}
                onChange={(e) => {
                  if (!evidenceUrl.startsWith("data:image")) {
                    setEvidenceUrl(e.target.value);
                  }
                }}
                readOnly={evidenceUrl.startsWith("data:image")}
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Quick Capture / File Picker Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                cameraInputRef.current?.click();
              }}
              disabled={compressing}
              className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Chụp ảnh minh chứng trực tiếp bằng camera"
            >
              <Camera className="w-4 h-4" />
              <span>Chụp Camera</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                galleryInputRef.current?.click();
              }}
              disabled={compressing}
              className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              title="Chọn ảnh từ thư viện"
            >
              <ImageIcon className="w-4 h-4 text-slate-500" />
              <span>Chọn từ thư viện</span>
            </button>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />

          {compressing && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center space-x-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tối ưu hóa ảnh minh chứng (WebP)...</span>
            </div>
          )}

          {/* Preview Card */}
          {evidenceUrl && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                {evidenceUrl.startsWith("data:image") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={evidenceUrl}
                    alt="Xem trước minh chứng"
                    className="w-10 h-10 object-cover rounded-lg border border-slate-300 dark:border-slate-600 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {evidenceUrl.startsWith("data:image") ? "Ảnh chụp đã sẵn sàng" : "Đường dẫn hợp lệ"}
                  </p>
                  {compressedStats && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatBytes(compressedStats.compressedSize)} (-{compressedStats.reduction}%)
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEvidenceUrl("");
                  setCompressedStats(null);
                }}
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                title="Gỡ ảnh này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || compressing || !evidenceUrl.trim()}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Xác nhận nộp</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

