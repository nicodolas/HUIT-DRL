"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { AddRecordModal } from "@/components/records/AddRecordModal";
import { DrlRecord, Semester, User } from "@/lib/db/schema";
import {
  parseEventDateTime,
  getCriteriaColor,
  getUpcomingRecords,
  getPastRecords,
  ParsedEventDateTime,
} from "@/lib/calendar/utils";
import { getUserSemestersCache, saveUserSemestersCache } from "@/lib/offline/cache";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Grid,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  CalendarCheck,
  Sparkles,
  Info,
} from "lucide-react";

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatPointsLabel(pts: string | number): string {
  const num = typeof pts === "string" ? Number.parseFloat(pts) : pts;
  if (Number.isNaN(num)) return "+0đ";
  return num > 0 ? `+${num}đ` : `${num}đ`;
}

export default function CalendarPage() {
  const [user, setUser] = useState<User | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>(() => {
    return getUserSemestersCache() || [];
  });
  const [currentSemesterId, setCurrentSemesterId] = useState<string>(() => {
    const cached = getUserSemestersCache();
    if (cached && cached.length > 0) {
      const cur = cached.find((s) => s.isCurrent) || cached[0];
      return cur?.id || "";
    }
    return "";
  });
  const [records, setRecords] = useState<DrlRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<string>("");

  // Calendar View states
  const [viewMode, setViewMode] = useState<"grid" | "agenda">("grid");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return formatLocalDate(new Date());
  });

  // Load user & semesters
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch((err) => console.error("Error loading user:", err));

    fetch("/api/semesters")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.semesters && data.semesters.length > 0) {
          setSemesters(data.semesters);
          saveUserSemestersCache(data.semesters);
          setCurrentSemesterId((prev) => {
            if (prev && data.semesters.some((s: any) => s.id === prev)) return prev;
            const cur = data.semesters.find((s: any) => s.isCurrent) || data.semesters[0];
            return cur.id;
          });
        }
      })
      .catch((err) => console.error("Error loading semesters:", err));
  }, []);

  const activeSemesterReqRef = useRef<string>("");

  // Load records for active semester
  const loadRecords = async (semId: string) => {
    if (!semId) return;
    activeSemesterReqRef.current = semId;
    setLoading(true);
    try {
      const res = await fetch(`/api/records?semesterId=${semId}`);
      if (res.ok) {
        const data = await res.json();
        if (activeSemesterReqRef.current === semId) {
          setRecords(data.records || []);
        }
      } else if (activeSemesterReqRef.current === semId) {
        setRecords([]);
      }
    } catch (e) {
      console.error("Error loading records:", e);
      if (activeSemesterReqRef.current === semId) {
        setRecords([]);
      }
    } finally {
      if (activeSemesterReqRef.current === semId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (currentSemesterId) {
      void loadRecords(currentSemesterId);
    }
  }, [currentSemesterId]);

  // Current year & month for calendar grid
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0 - 11

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(formatLocalDate(today));
  };

  // Group records by Date YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Array<{ record: DrlRecord; parsed: ParsedEventDateTime }>>();
    for (const r of records) {
      const parsed = parseEventDateTime(r.occurredAt);
      if (parsed) {
        const list = map.get(parsed.dateStr) || [];
        list.push({ record: r, parsed });
        map.set(parsed.dateStr, list);
      }
    }
    return map;
  }, [records]);

  // Grid Days Calculation: Monday to Sunday layout
  const gridDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // 0 = Sunday, 1 = Monday ... 6 = Saturday
    // Convert to Monday = 0, Sunday = 6
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const totalDays = lastDayOfMonth.getDate();
    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Prev month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const mStr = String(prevDate.getMonth() + 1).padStart(2, "0");
      const dStr = String(dayNum).padStart(2, "0");
      days.push({
        dayNumber: dayNum,
        dateStr: `${prevDate.getFullYear()}-${mStr}-${dStr}`,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Current month days
    const todayStr = formatLocalDate(new Date());
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(currentMonth + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateStr = `${currentYear}-${mStr}-${dStr}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding to fill complete rows of 7 (up to 35 or 42)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const mStr = String(nextDate.getMonth() + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      days.push({
        dayNumber: d,
        dateStr: `${nextDate.getFullYear()}-${mStr}-${dStr}`,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Selected Date Events
  const selectedDateEvents = useMemo(() => {
    return eventsByDate.get(selectedDateStr) || [];
  }, [eventsByDate, selectedDateStr]);

  // Upcoming & Past events for Agenda View using centralized calendar utils
  const upcomingEvents = useMemo(() => {
    return getUpcomingRecords(records);
  }, [records]);

  const pastEvents = useMemo(() => {
    return getPastRecords(records);
  }, [records]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-24 sm:pb-12">
      <Header
        user={user as any}
        semesters={semesters}
        currentSemesterId={currentSemesterId}
        onSelectSemester={setCurrentSemesterId}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Lịch Cá Nhân & Nhắc Việc
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kế hoạch hoạt động rèn luyện sinh viên theo QĐ 3385/QĐ-DCT
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
              <button
                onClick={() => setViewMode("grid")}
                className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Lịch tháng</span>
              </button>
              <button
                onClick={() => setViewMode("agenda")}
                className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  viewMode === "agenda"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Dòng thời gian</span>
              </button>
            </div>

            {/* Add Record button */}
            <button
              onClick={() => {
                setModalInitialDate("");
                setIsAddModalOpen(true);
              }}
              className="h-9 px-4 rounded-xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold flex items-center space-x-1.5 hover:bg-slate-800 dark:hover:bg-amber-400 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Lên lịch hoạt động</span>
            </button>
          </div>
        </div>

        {/* Calendar Grid View */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Monthly Calendar Grid */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs">
              {/* Month Navigator Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center space-x-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Tháng {currentMonth + 1}, {currentYear}
                  </h2>
                  <button
                    onClick={handleToday}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    Hôm nay
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={handlePrevMonth}
                    aria-label="Tháng trước"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    aria-label="Tháng sau"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"].map((dow, idx) => (
                  <div
                    key={dow}
                    className={`text-[11px] font-bold uppercase tracking-wider py-1.5 ${
                      idx >= 5 ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {dow}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {gridDays.map((cell) => {
                  const dayEvents = eventsByDate.get(cell.dateStr) || [];
                  const isSelected = selectedDateStr === cell.dateStr;

                  return (
                    <button
                      key={cell.dateStr}
                      onClick={() => setSelectedDateStr(cell.dateStr)}
                      className={`min-h-[64px] sm:min-h-[82px] p-1.5 sm:p-2 rounded-xl flex flex-col justify-between text-left transition-all border ${
                        isSelected
                          ? "ring-2 ring-slate-900 dark:ring-amber-500 border-transparent bg-amber-50/50 dark:bg-amber-950/20"
                          : cell.isCurrentMonth
                          ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          : "bg-slate-50/20 dark:bg-slate-900/40 border-transparent text-slate-300 dark:text-slate-700 opacity-40"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            cell.isToday
                              ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                              : isSelected
                              ? "text-amber-600 dark:text-amber-400 font-extrabold"
                              : cell.isCurrentMonth
                              ? "text-slate-700 dark:text-slate-300"
                              : "text-slate-400 dark:text-slate-600"
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {dayEvents.length > 0 && (
                          <span className="text-[10px] font-bold font-mono px-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Criteria Dots */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dayEvents.slice(0, 4).map(({ record }) => {
                          const col = getCriteriaColor(record.category);
                          return (
                            <span
                              key={record.id}
                              title={`${record.title} (TC${record.category})`}
                              className={`w-2 h-2 rounded-full ${col.dot} ring-1 ring-white dark:ring-slate-900`}
                            />
                          );
                        })}
                        {dayEvents.length > 4 && (
                          <span className="text-[9px] font-mono text-slate-400">
                            +{dayEvents.length - 4}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Criteria Legend */}
              <div className="pt-4 mt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Tiêu chí:</span>
                {[1, 2, 3, 4, 5].map((cat) => {
                  const c = getCriteriaColor(cat);
                  return (
                    <div key={cat} className="flex items-center space-x-1.5">
                      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                      <span>TC{cat}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 1 Col: Selected Date Details */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Chi tiết ngày {selectedDateStr}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {selectedDateEvents.length} hoạt động được ghi nhận
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setModalInitialDate(selectedDateStr);
                      setIsAddModalOpen(true);
                    }}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm</span>
                  </button>
                </div>

                {loading ? (
                  <div className="py-10 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Đang tải hoạt động...</p>
                  </div>
                ) : selectedDateEvents.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <CalendarCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Không có hoạt động nào vào ngày này
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                      Hãy lên lịch hoạt động để theo dõi điểm rèn luyện chủ động hơn.
                    </p>
                    <button
                      onClick={() => {
                        setModalInitialDate(selectedDateStr);
                        setIsAddModalOpen(true);
                      }}
                      className="mt-4 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold hover:bg-slate-800 dark:hover:bg-amber-400 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Lên lịch hoạt động này</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map(({ record, parsed }) => {
                      const color = getCriteriaColor(record.category);
                      const hasProof = Boolean(record.evidenceUrl);

                      return (
                        <div
                          key={record.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${color.lightBg} ${color.text} border ${color.border}`}>
                              TC{record.category}
                            </span>
                            <span className={`text-xs font-mono font-bold shrink-0 ${
                              Number(record.points) < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}>
                              {formatPointsLabel(record.points)}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {record.title}
                          </h4>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            {parsed.timeStr && (
                              <span className="flex items-center space-x-1 font-mono">
                                <Clock className="w-3 h-3 text-amber-500" />
                                <span>{parsed.timeStr}</span>
                              </span>
                            )}
                            {record.note && (
                              <span className="flex items-center space-x-1 truncate max-w-[180px]">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{record.note}</span>
                              </span>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                            {parsed.isFuture ? (
                              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>Sắp diễn ra</span>
                              </span>
                            ) : hasProof ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Đã nộp minh chứng</span>
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Chưa có minh chứng</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                💡 <span className="font-medium">Mẹo:</span> Khi hoạt động qua thời gian diễn ra, điểm rèn luyện sẽ tự động được cộng vào tổng kết quả của học kỳ.
              </div>
            </div>
          </div>
        ) : (
          /* Agenda / Timeline View */
          <div className="space-y-6">
            {/* Upcoming section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Kế hoạch rèn luyện sắp tới ({upcomingEvents.length})
                </h2>
              </div>

              {loading ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Đang tải kế hoạch rèn luyện...</p>
                </div>
              ) : upcomingEvents.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                  Không có lịch trình sắp tới. Hãy bấm "+ Lên lịch hoạt động" để thêm hoạt động mới.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(({ record, parsed }) => {
                    const color = getCriteriaColor(record.category);
                    return (
                      <div
                        key={record.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start space-x-3 min-w-0 flex-1">
                          <div className={`px-2.5 py-1.5 rounded-xl text-center shrink-0 border ${
                            parsed.isToday
                              ? "bg-rose-500 text-white font-bold"
                              : parsed.isTomorrow
                              ? "bg-amber-500 text-slate-950 font-bold"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          }`}>
                            <span className="block text-xs font-black">
                              {parsed.isToday ? "HÔM NAY" : parsed.isTomorrow ? "NGÀY MAI" : `+${parsed.daysDiff}d`}
                            </span>
                            <span className="block text-[10px] font-mono opacity-80">
                              {parsed.dateStr}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${color.lightBg} ${color.text} border ${color.border}`}>
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
                            {record.note && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center space-x-1">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span>{record.note}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-1.5">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-mono font-bold ${
                              Number(record.points) < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}>
                              {formatPointsLabel(record.points)}
                            </span>
                            {parsed.isFuture && (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                                Dự kiến
                              </span>
                            )}
                          </div>
                          {!record.evidenceUrl ? (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center space-x-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Chưa có minh chứng</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Có minh chứng</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <CalendarCheck className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Hoạt động đã diễn ra ({pastEvents.length})
                </h2>
              </div>

              {loading ? (
                <p className="text-xs text-slate-400 py-4 text-center">Đang tải lịch sử hoạt động...</p>
              ) : pastEvents.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                  Chưa có hoạt động quá khứ nào được ghi nhận.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {pastEvents.slice(0, 10).map(({ record, parsed }) => {
                    const color = getCriteriaColor(record.category);
                    const hasProof = Boolean(record.evidenceUrl);

                    return (
                      <div
                        key={record.id}
                        className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1 flex items-center space-x-3">
                          <span className="font-mono text-slate-400 dark:text-slate-500 shrink-0 w-20 text-[11px]">
                            {parsed.dateStr}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${color.lightBg} ${color.text} border ${color.border} shrink-0`}>
                            TC{record.category}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {record.title}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0">
                          {hasProof ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Có minh chứng</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center space-x-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Chưa có minh chứng</span>
                            </span>
                          )}
                          <span className={`font-mono font-bold ${
                            Number(record.points) < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}>
                            {formatPointsLabel(record.points)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add Record Modal */}
      <AddRecordModal
        isOpen={isAddModalOpen}
        semesterId={currentSemesterId}
        initialDate={modalInitialDate || selectedDateStr}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          if (currentSemesterId) {
            void loadRecords(currentSemesterId);
          }
        }}
      />

      <BottomNav />
    </div>
  );
}
