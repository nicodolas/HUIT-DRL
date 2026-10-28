"use client";

import React, { useEffect, useRef } from "react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  FileCheck,
  AlertTriangle,
  CalendarPlus,
  Download,
  Trash2,
  Edit,
  Sparkles,
} from "lucide-react";
import { DrlRecord } from "@/lib/db/schema";
import { parseEventDateTime, getCriteriaColor, splitLocationNote, formatPointsLabel } from "@/lib/calendar/utils";
import { buildGoogleCalendarUrl, downloadSingleEventIcs, CalendarEventItem } from "@/lib/calendar/ics";
import { triggerHaptic } from "@/lib/native/platform";

interface CalendarEventDetailModalProps {
  isOpen: boolean;
  record: DrlRecord | null;
  onClose: () => void;
  onOpenEvidenceModal: (record: DrlRecord) => void;
  onEditRecord: (record: DrlRecord) => void;
  onDeleteSuccess?: (recordId: string) => void;
}

export function CalendarEventDetailModal({
  isOpen,
  record,
  onClose,
  onOpenEvidenceModal,
  onEditRecord,
  onDeleteSuccess,
}: CalendarEventDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const parsed = parseEventDateTime(record.occurredAt);
  const { location, cleanNote } = splitLocationNote(record.note);
  const color = getCriteriaColor(record.category);
  const hasEvidence = Boolean(record.evidenceUrl);

  const eventItem: CalendarEventItem = {
    id: record.id,
    title: `[TC${record.category}] ${record.title}`,
    date: record.occurredAt || new Date().toISOString().split("T")[0],
    description: cleanNote || (record.note ? "Hoạt động rèn luyện" : "Đã nộp minh chứng"),
    location: location || "Trường ĐH Công Thương TP.HCM (HUIT)",
  };

  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa hoạt động này khỏi lịch trình rèn luyện?")) {
      return;
    }
    triggerHaptic("warning");
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/records/${record.id}`, { method: "DELETE" });
      if (res.ok) {
        triggerHaptic("success");
        onDeleteSuccess?.(record.id);
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || "Không thể xóa hoạt động. Vui lòng thử lại.");
      }
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Đã xảy ra lỗi khi xóa hoạt động.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden outline-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon with Criteria Color */}
        <div className={`px-6 py-4 border-b ${color.border} ${color.lightBg} flex items-center justify-between`}>
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${color.bg} text-white shadow-2xs`}>
              Tiêu chí {record.category}
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {formatPointsLabel(record.points)}
            </span>
            {parsed?.isFuture && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                Dự kiến
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ chi tiết"
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <h2 id="event-detail-title" className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
            {record.title}
          </h2>

          {/* Time, Location & Date Grid */}
          <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center space-x-2.5">
              <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Ngày: <strong className="font-mono text-slate-900 dark:text-white">{parsed?.dateStr || record.occurredAt}</strong>
                {parsed?.isToday && <span className="ml-2 font-bold text-amber-600 dark:text-amber-400">(Hôm nay)</span>}
                {parsed?.isTomorrow && <span className="ml-2 font-bold text-amber-600 dark:text-amber-400">(Ngày mai)</span>}
                {parsed && parsed.daysDiff > 1 && (
                  <span className="ml-2 font-medium text-slate-500">(Còn {parsed.daysDiff} ngày)</span>
                )}
              </span>
            </div>

            {parsed?.timeStr && (
              <div className="flex items-center space-x-2.5">
                <Clock className="w-4 h-4 text-sky-500 shrink-0" />
                <span>
                  Thời gian: <strong className="font-mono text-slate-900 dark:text-white">{parsed.timeStr}</strong>
                </span>
              </div>
            )}

            {location && (
              <div className="flex items-center space-x-2.5">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span>
                  Địa điểm: <strong className="text-slate-900 dark:text-white">{location}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Note */}
          {cleanNote && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                Ghi chú hoạt động:
              </label>
              <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed whitespace-pre-wrap">
                {cleanNote}
              </p>
            </div>
          )}

          {/* Evidence Status Callout */}
          <div
            className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
              hasEvidence
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              {hasEvidence ? (
                <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <span className="font-semibold">
                {hasEvidence ? "Đã đính kèm minh chứng" : "Chưa có minh chứng (chưa đảm bảo điểm)"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onOpenEvidenceModal(record);
              }}
              className={`px-3 py-1 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 shadow-2xs ${
                hasEvidence
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-amber-500 hover:bg-amber-400 text-slate-950"
              }`}
            >
              {hasEvidence ? "Xem / Sửa" : "Nộp ngay"}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                window.open(buildGoogleCalendarUrl(eventItem), "_blank", "noopener,noreferrer");
              }}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
              title="Đồng bộ vào Google Calendar"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Google Cal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                void downloadSingleEventIcs(eventItem);
              }}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
              title="Tải file .ICS hoặc mở ứng dụng lịch điện thoại"
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span>.ICS</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onEditRecord(record);
                onClose();
              }}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Sửa</span>
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? "Đang xóa..." : "Xóa"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
