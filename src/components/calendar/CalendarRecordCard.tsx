"use client";

import React from "react";
import { DrlRecord } from "@/lib/db/schema";
import {
  ParsedEventDateTime,
  getCriteriaColor,
  formatPointsLabel,
  splitLocationNote,
} from "@/lib/calendar/utils";
import {
  recordToCalendarEvent,
  downloadSingleEventIcs,
  buildGoogleCalendarUrl,
} from "@/lib/calendar/ics";
import { triggerHaptic } from "@/lib/native/platform";
import {
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  UploadCloud,
  CalendarPlus,
  Download,
} from "lucide-react";

export interface CalendarRecordCardProps {
  record: DrlRecord;
  parsed: ParsedEventDateTime;
  variant: "compact" | "agenda-upcoming" | "agenda-past";
  onOpenEvidenceModal: (record: DrlRecord) => void;
}

export const CalendarRecordCard: React.FC<CalendarRecordCardProps> = ({
  record,
  parsed,
  variant,
  onOpenEvidenceModal,
}) => {
  const color = getCriteriaColor(record.category);
  const hasProof = Boolean(record.evidenceUrl);

  // Extract bracket convention [Location] note
  const { location: locationStr, cleanNote: noteStr } = splitLocationNote(record.note);

  const handleGoogleCalendar = () => {
    triggerHaptic("light");
    const ev = recordToCalendarEvent(record);
    window.open(buildGoogleCalendarUrl(ev), "_blank", "noopener,noreferrer");
  };

  const handleDownloadIcs = () => {
    triggerHaptic("light");
    const ev = recordToCalendarEvent(record);
    void downloadSingleEventIcs(ev);
  };

  const handleEvidenceClick = () => {
    triggerHaptic("light");
    onOpenEvidenceModal(record);
  };

  // Reusable action bar for sync & proof submission
  const renderActionButtons = (isPastVariant: boolean = false, showStatusText: boolean = true) => (
    <div className="flex items-center space-x-1.5 shrink-0">
      {showStatusText && (
        !hasProof ? (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center space-x-0.5">
            <AlertTriangle className="w-3 h-3" />
            <span>Chưa có minh chứng</span>
          </span>
        ) : (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-0.5">
            <CheckCircle2 className="w-3 h-3" />
            <span>Có minh chứng</span>
          </span>
        )
      )}

      {!hasProof && (
        <button
          type="button"
          onClick={handleEvidenceClick}
          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] transition cursor-pointer"
          title="Nộp ảnh/URL minh chứng nhanh"
          aria-label={`Nộp minh chứng cho ${record.title}`}
        >
          <UploadCloud className="w-3 h-3" />
          <span>Nộp minh chứng</span>
        </button>
      )}

      <button
        type="button"
        onClick={handleGoogleCalendar}
        title="Thêm vào Google Calendar"
        aria-label="Thêm vào Google Calendar"
        className="p-1 rounded-md text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
      >
        <CalendarPlus className="w-3.5 h-3.5" />
      </button>

      {!isPastVariant && (
        <button
          type="button"
          onClick={handleDownloadIcs}
          title="Tải file .ICS hoặc mở trong ứng dụng lịch"
          aria-label="Tải file .ICS vào máy"
          className="p-1 rounded-md text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  // Variant 1: Compact (Selected Date side-panel in Grid View)
  if (variant === "compact") {
    return (
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${color.lightBg} ${color.text} border ${color.border}`}
          >
            TC{record.category}
          </span>
          <span
            className={`text-xs font-mono font-bold shrink-0 ${
              parsed.isFuture
                ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full"
                : Number(record.points) < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {parsed.isFuture ? `Dự kiến ${formatPointsLabel(record.points)}` : formatPointsLabel(record.points)}
          </span>
        </div>

        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
          {record.title}
        </h4>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          {parsed.timeStr && (
            <span className="flex items-center space-x-1 font-mono">
              <Clock className="w-3 h-3 text-amber-500 shrink-0" />
              <span>{parsed.timeStr}</span>
            </span>
          )}
          {locationStr && (
            <span className="flex items-center space-x-1 truncate max-w-[160px]">
              <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
              <span className="truncate">{locationStr}</span>
            </span>
          )}
          {noteStr && (
            <span className="text-slate-400 dark:text-slate-500 truncate max-w-[160px] italic">
              {noteStr}
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div>
            {parsed.isFuture ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Sắp diễn ra</span>
              </span>
            ) : hasProof ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Có minh chứng</span>
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Chưa có minh chứng</span>
              </span>
            )}
          </div>
          {renderActionButtons(false, false)}
        </div>
      </div>
    );
  }

  // Variant 2: Agenda Upcoming Card
  if (variant === "agenda-upcoming") {
    return (
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-300 dark:hover:border-amber-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start space-x-3 min-w-0 flex-1">
          <div
            className={`px-2.5 py-1.5 rounded-xl text-center shrink-0 border ${
              parsed.isToday
                ? "bg-rose-500 text-white font-bold"
                : parsed.isTomorrow
                ? "bg-amber-500 text-slate-950 font-bold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            }`}
          >
            <span className="block text-xs font-black">
              {parsed.isToday
                ? "HÔM NAY"
                : parsed.isTomorrow
                ? "NGÀY MAI"
                : `+${parsed.daysDiff}d`}
            </span>
            <span className="block text-[10px] font-mono opacity-80">
              {parsed.dateStr}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${color.lightBg} ${color.text} border ${color.border}`}
              >
                TC{record.category}
              </span>
              {parsed.timeStr && (
                <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span>{parsed.timeStr}</span>
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {record.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {locationStr && (
                <span className="flex items-center space-x-1 truncate max-w-[200px]">
                  <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                  <span className="truncate">{locationStr}</span>
                </span>
              )}
              {noteStr && (
                <span className="text-slate-400 dark:text-slate-500 truncate max-w-[200px] italic">
                  {noteStr}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-2">
          <div className="flex items-center space-x-2">
            <span
              className={`text-sm font-mono font-bold ${
                Number(record.points) < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {formatPointsLabel(record.points)}
            </span>
            {parsed.isFuture && (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                Dự kiến
              </span>
            )}
          </div>

          {renderActionButtons(false, true)}
        </div>
      </div>
    );
  }

  // Variant 3: Agenda Past Card
  return (
    <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="min-w-0 flex-1 flex items-center space-x-3">
        <span className="font-mono text-slate-400 dark:text-slate-500 shrink-0 w-20 text-[11px]">
          {parsed.dateStr}
        </span>
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${color.lightBg} ${color.text} border ${color.border} shrink-0`}
        >
          TC{record.category}
        </span>
        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
          {record.title}
        </span>
        {locationStr && (
          <span className="hidden md:inline-flex items-center space-x-1 text-[11px] text-slate-400 truncate max-w-[140px]">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{locationStr}</span>
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {renderActionButtons(true, true)}
        <span
          className={`font-mono font-bold ${
            Number(record.points) < 0
              ? "text-rose-600 dark:text-rose-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {formatPointsLabel(record.points)}
        </span>
      </div>
    </div>
  );
};
