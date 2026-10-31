"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Ticket,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Sparkles,
  Loader2,
  CalendarPlus,
  User,
} from "lucide-react";
import { DrlRecord } from "@/lib/db/schema";
import { getCriteriaColor, splitLocationNote, formatPointsLabel } from "@/lib/calendar/utils";
import { normalizeInviteCode } from "@/lib/calendar/inviteCode";
import { triggerHaptic } from "@/lib/native/platform";
import { handleModalTabLoop } from "@/lib/calendar/focusTrap";

interface ClaimInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimSuccess?: (record: DrlRecord) => void;
}

interface PreviewData {
  valid: boolean;
  invite: {
    id: string;
    code: string;
    maxUses: number | null;
    usesCount: number;
    expiresAt: string | null;
    remainingUses: number | null;
  };
  record: {
    title: string;
    type?: string;
    category: number;
    points: string;
    quantity: number;
    occurredAt: string | null;
    note: string | null;
  };
  creator: {
    fullName: string;
    username: string;
    faculty: string | null;
  };
  isCreator: boolean;
  isAlreadyClaimed: boolean;
}

export function ClaimInviteModal({
  isOpen,
  onClose,
  onClaimSuccess,
}: ClaimInviteModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  // Focus input on open, restore previous focus on close
  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (isOpen) {
      const previouslyFocused = document.activeElement as HTMLElement | null;
      setCode("");
      setPreview(null);
      setError(null);
      setSuccessMessage(null);
      const timer = setTimeout(() => inputRef.current?.focus(), 80);
      return () => {
        clearTimeout(timer);
        previouslyFocused?.focus?.();
      };
    }
  }, [isOpen]);

  // Escape key handler and tab focus trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        onClose();
        return;
      }
      if (isOpen) {
        handleModalTabLoop(e, modalRef.current);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-search preview when typing code
  useEffect(() => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      setPreview(null);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const normalized = normalizeInviteCode(clean);
        const res = await fetch(`/api/calendar/invites/preview?code=${encodeURIComponent(normalized)}`);
        const data = await res.json();

        if (res.ok && data.valid) {
          setPreview(data);
          setError(null);
        } else {
          setPreview(null);
          setError(data.error || "Mã mời không hợp lệ");
        }
      } catch (err) {
        setPreview(null);
        setError("Lỗi kết nối khi tra cứu mã mời");
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [code]);

  const handleClaim = async () => {
    if (!preview || !code) return;
    setClaiming(true);
    setError(null);
    triggerHaptic("medium");

    try {
      const normalized = normalizeInviteCode(code);
      const res = await fetch("/api/calendar/invites/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        triggerHaptic("success");
        setSuccessMessage(data.message || "Đã thêm hoạt động vào lịch rèn luyện thành công!");
        onClaimSuccess?.(data.record);
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
        }
        closeTimerRef.current = setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        triggerHaptic("error");
        setError(data.error || "Không thể nhận hoạt động");
      }
    } catch {
      triggerHaptic("error");
      setError("Lỗi kết nối khi nhận hoạt động");
    } finally {
      setClaiming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-invite-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden focus:outline-none transition-all flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="claim-invite-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Nhập mã mời hoạt động
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thêm hoạt động từ bạn bè vào lịch trình & sổ tay rèn luyện
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Input field */}
          <div className="space-y-1.5">
            <label
              htmlFor="invite-code-input"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              Mã mời (e.g. HUIT-9K2F hoặc 9K2F)
            </label>
            <div className="relative">
              <input
                id="invite-code-input"
                ref={inputRef}
                type="text"
                autoCapitalize="characters"
                placeholder="HUIT-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-base font-bold tracking-wider placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Nhập mã chia sẻ được gửi từ bạn bè hoặc quét từ QR code.
            </p>
          </div>

          {/* Success Notification */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview Card */}
          {preview && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-in zoom-in-95 duration-150">
              {(() => {
                const color = getCriteriaColor(preview.record.category);
                const { location, cleanNote } = splitLocationNote(preview.record.note);
                return (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${color.lightBg} ${color.text} border ${color.border}`}
                      >
                        TC{preview.record.category}
                      </span>

                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPointsLabel(preview.record.points)}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {preview.record.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {preview.record.occurredAt && (
                        <span className="flex items-center space-x-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{preview.record.occurredAt.replace("T", " ")}</span>
                        </span>
                      )}
                      {location && (
                        <span className="flex items-center space-x-1 truncate max-w-[200px]">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{location}</span>
                        </span>
                      )}
                      {cleanNote && (
                        <span className="text-slate-400 italic truncate max-w-[200px]">
                          {cleanNote}
                        </span>
                      )}
                    </div>

                    {/* Creator Info */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-amber-500" />
                        <span>
                          Người chia sẻ:{" "}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {preview.creator.fullName}
                          </strong>{" "}
                          (@{preview.creator.username})
                        </span>
                      </div>

                      {preview.invite.remainingUses !== null && (
                        <span className="font-semibold text-amber-600 dark:text-amber-400 text-[11px]">
                          Còn {preview.invite.remainingUses} chỗ
                        </span>
                      )}
                    </div>

                    {/* Ownership / Already Claimed Badges */}
                    {preview.isCreator && (
                      <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl text-center">
                        Bạn là người tạo hoạt động này. Không cần nhận lại.
                      </p>
                    )}

                    {preview.isAlreadyClaimed && (
                      <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl text-center flex items-center justify-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Bạn đã thêm hoạt động này vào sổ rèn luyện trước đó rồi.</span>
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={() => void handleClaim()}
            disabled={
              !preview ||
              preview.isCreator ||
              preview.isAlreadyClaimed ||
              claiming ||
              !!successMessage
            }
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            {claiming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang thêm vào lịch...</span>
              </>
            ) : (
              <>
                <CalendarPlus className="w-4 h-4" />
                <span>Thêm vào lịch rèn luyện</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

