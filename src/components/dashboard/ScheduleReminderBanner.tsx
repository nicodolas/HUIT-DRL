"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DrlRecord } from "@/lib/db/schema";
import { getUrgentReminders, getCriteriaColor } from "@/lib/calendar/utils";
import { Bell, Calendar, Clock, ArrowRight, X, AlertTriangle } from "lucide-react";

interface ScheduleReminderBannerProps {
  records: DrlRecord[];
}

export const ScheduleReminderBanner: React.FC<ScheduleReminderBannerProps> = ({ records }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const urgentItems = getUrgentReminders(records);

  if (isDismissed || urgentItems.length === 0) return null;

  // Most immediate upcoming item
  const nextItem = urgentItems[0];
  const { record, parsed } = nextItem;
  const color = getCriteriaColor(record.category);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 dark:from-amber-500/20 dark:via-orange-500/15 dark:to-transparent border border-amber-300 dark:border-amber-500/30 p-3.5 sm:p-4 shadow-sm mb-6 animate-in fade-in duration-300">
      <div className="flex items-start sm:items-center justify-between gap-3">
        {/* Left: Icon & Content */}
        <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs font-bold">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                parsed.isToday
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-amber-500 text-slate-950 font-extrabold"
              }`}>
                {parsed.isToday ? "🔥 Diễn ra hôm nay" : "⏰ Ngày mai"}
              </span>

              {parsed.timeStr && (
                <span className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 inline" />
                  <span>{parsed.timeStr}</span>
                </span>
              )}

              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${color.lightBg} ${color.text} border ${color.border}`}>
                TC{record.category}
              </span>

              {urgentItems.length > 1 && (
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  (+{urgentItems.length - 1} sự kiện khác)
                </span>
              )}
            </div>

            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {record.title}
            </p>

            {record.note && (
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                {record.note}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2 shrink-0 self-center">
          <Link
            href="/calendar"
            className="inline-flex items-center space-x-1.5 h-8 px-3 rounded-xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold hover:bg-slate-800 dark:hover:bg-amber-400 transition-colors shadow-2xs"
          >
            <span>Xem lịch</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setIsDismissed(true)}
            aria-label="Đóng thông báo nhắc nhở"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

