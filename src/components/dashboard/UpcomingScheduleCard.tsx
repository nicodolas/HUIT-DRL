"use client";

import React from "react";
import Link from "next/link";
import { DrlRecord } from "@/lib/db/schema";
import { getUpcomingRecords, getCriteriaColor } from "@/lib/calendar/utils";
import { Calendar, Clock, ArrowRight, Plus, MapPin, AlertCircle } from "lucide-react";

interface UpcomingScheduleCardProps {
  records: DrlRecord[];
  onOpenAddModal?: () => void;
}

export const UpcomingScheduleCard: React.FC<UpcomingScheduleCardProps> = ({
  records,
  onOpenAddModal,
}) => {
  const allUpcoming = getUpcomingRecords(records);
  const upcomingList = allUpcoming.slice(0, 5); // top 5 upcoming

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-colors flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Lịch trình rèn luyện</span>
                {allUpcoming.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                    {allUpcoming.length}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Kế hoạch & hoạt động sắp diễn ra
              </p>
            </div>
          </div>

          <Link
            href="/calendar"
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center space-x-1 transition-colors"
          >
            <span>Chi tiết</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Content list */}
        {upcomingList.length === 0 ? (
          <div className="text-center py-6 px-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mx-auto flex items-center justify-center mb-2.5">
              <Calendar className="w-5 h-5 stroke-[1.5]" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Chưa có lịch trình sắp tới
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs mx-auto">
              Lên lịch trước các hoạt động Đoàn Hội, NCKH, hiến máu để nhận thông báo nhắc nhở.
            </p>
            {onOpenAddModal && (
              <button
                onClick={onOpenAddModal}
                className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Lên lịch hoạt động</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingList.map(({ record, parsed }) => {
              const color = getCriteriaColor(record.category);
              return (
                <div
                  key={record.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        parsed.isToday
                          ? "bg-rose-500 text-white font-extrabold"
                          : parsed.isTomorrow
                          ? "bg-amber-500 text-slate-950 font-bold"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                      }`}>
                        {parsed.isToday
                          ? "Hôm nay"
                          : parsed.isTomorrow
                          ? "Ngày mai"
                          : `Còn ${parsed.daysDiff} ngày`}
                      </span>

                      {parsed.timeStr && (
                        <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 flex items-center space-x-0.5">
                          <Clock className="w-2.5 h-2.5 inline" />
                          <span>{parsed.timeStr}</span>
                        </span>
                      )}

                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${color.lightBg} ${color.text} border ${color.border}`}>
                        TC{record.category}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {record.title}
                    </p>

                    {record.note && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{record.note}</span>
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {(() => {
                      const totalPoints = (Number(record.points) || 0) * (record.quantity || 1);
                      const isDeduction = totalPoints < 0;
                      const pointsPrefix = parsed.isFuture ? "Dự kiến " : "";
                      const sign = totalPoints > 0 ? "+" : "";
                      return (
                        <span
                          className={`text-xs font-mono font-bold ${
                            isDeduction
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {pointsPrefix}{sign}{totalPoints}đ
                        </span>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {allUpcoming.length > 0 && (
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Tổng {allUpcoming.length} lịch trình sắp tới
          </span>
          <Link
            href="/calendar"
            className="text-xs font-bold text-slate-900 dark:text-white hover:underline flex items-center space-x-1"
          >
            <span>Mở lịch toàn màn hình</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
};

