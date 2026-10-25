"use client";

import React, { useState } from "react";
import { X, Calendar as CalendarIcon, Download, ExternalLink, Bell, Check, Copy, AlertCircle } from "lucide-react";
import { Semester, DrlRecord } from "@/lib/db/schema";
import { buildSemesterCalendarEvents, generateIcsCalendar, buildGoogleCalendarUrl } from "@/lib/calendar/ics";
import { triggerHaptic } from "@/lib/native/platform";

interface CalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  semester: Semester | null;
  records: DrlRecord[];
}

export function CalendarExportModal({
  isOpen,
  onClose,
  semester,
  records,
}: CalendarExportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const events = buildSemesterCalendarEvents(semester, records);
  const deadlineEvent = events.find((e) => e.isDeadline);

  const handleDownloadIcs = () => {
    triggerHaptic("success");
    const icsContent = generateIcsCalendar(events, `HUIT ĐRL - ${semester?.name || "Học kỳ"}`);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `huit_drl_${semester?.name ? semester.name.replace(/\s+/g, "_") : "calendar"}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = () => {
    triggerHaptic("light");
    const lines = [
      `[LỊCH SỰ KIỆN & HẠN CHÓT ĐRL - ${semester?.name || "HỌC KỲ"}]`,
      semester?.submissionDeadline ? `• Hạn chót nộp điểm rèn luyện: ${semester.submissionDeadline}` : "• Chưa cài đặt hạn chót nộp",
      "",
      `Các hoạt động đã ghi nhận (${events.filter((e) => !e.isDeadline).length} mục):`,
      ...events.filter((e) => !e.isDeadline).map((e) => `- ${e.date}: ${e.title}`),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Đồng Bộ Lịch & Nhắc Nhở Hạn Chót
              </h3>
              <p className="text-xs text-slate-500">
                Xuất file .ICS hoặc thêm trực tiếp vào Google Calendar
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Deadline highlight card */}
          {deadlineEvent ? (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300">
                <span className="flex items-center space-x-1.5">
                  <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
                  <span>Hạn Chót Nộp Phiếu ĐRL Học Kỳ</span>
                </span>
                <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                  {deadlineEvent.date}
                </span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300/80 leading-relaxed">
                {deadlineEvent.description}
              </p>
              <div className="pt-1 flex">
                <a
                  href={buildGoogleCalendarUrl(deadlineEvent)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => triggerHaptic("medium")}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Thêm Hạn Chót vào Google Calendar</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Chưa cài đặt hạn chót cho học kỳ này. Bạn có thể cài đặt ở thanh cảnh báo hạn chót.</span>
            </div>
          )}

          {/* Event list */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Danh sách sự kiện đồng bộ ({events.length} mục)</span>
              <span className="text-[11px] text-slate-400">Định dạng RFC 5545</span>
            </h4>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 text-xs">
              {events.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  Chưa có hoạt động nào có ngày diễn ra cụ thể.
                </div>
              ) : (
                events.map((ev) => (
                  <div key={ev.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-white dark:hover:bg-slate-800 transition">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {ev.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {ev.date} • {ev.location}
                      </div>
                    </div>
                    <a
                      href={buildGoogleCalendarUrl(ev)}
                      target="_blank"
                      rel="noreferrer"
                      title="Thêm mục này vào Google Calendar"
                      className="p-1 rounded text-slate-400 hover:text-sky-600 transition shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-xs">
          <button
            onClick={handleCopySummary}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Đã chép lịch!" : "Sao chép"}</span>
          </button>

          <div className="flex space-x-2">
            <button
              onClick={handleDownloadIcs}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 font-semibold transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file .ICS</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

