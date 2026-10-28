"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { AddRecordModal } from "@/components/records/AddRecordModal";
import { QuickEvidenceModal } from "@/components/calendar/QuickEvidenceModal";
import { CalendarRecordCard } from "@/components/calendar/CalendarRecordCard";
import { DrlRecord, Semester, User } from "@/lib/db/schema";
import {
  parseEventDateTime,
  getCriteriaColor,
  getUpcomingRecords,
  getPastRecords,
  ParsedEventDateTime,
} from "@/lib/calendar/utils";
import {
  downloadSingleEventIcs,
  buildGoogleCalendarUrl,
  CalendarEventItem,
} from "@/lib/calendar/ics";
import { getUserSemestersCache, saveUserSemestersCache } from "@/lib/offline/cache";
import { triggerHaptic } from "@/lib/native/platform";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Grid,
  Plus,
  CalendarCheck,
  Sparkles,
  Search,
  CalendarPlus,
  Download,
  Bell,
  X,
} from "lucide-react";

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number>(0); // 0 = all
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "upcoming" | "missing_evidence" | "completed">("all");

  // Quick Evidence Modal states
  const [evidenceModalRecord, setEvidenceModalRecord] = useState<DrlRecord | null>(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);

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
            return cur?.id || "";
          });
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error loading semesters:", err);
        setLoading(false);
      });
  }, []);

  const activeSemesterReqRef = useRef<string>("");

  // Load records for active semester
  const loadRecords = async (semId: string) => {
    if (!semId) {
      setLoading(false);
      return;
    }
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
    } else {
      setLoading(false);
    }
  }, [currentSemesterId]);

  // Current year & month for calendar grid
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0 - 11

  const handlePrevMonth = () => {
    triggerHaptic("light");
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    triggerHaptic("light");
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    triggerHaptic("light");
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(formatLocalDate(today));
  };

  // Active semester & submission deadline
  const activeSemester = useMemo(() => {
    return semesters.find((s) => s.id === currentSemesterId) || null;
  }, [semesters, currentSemesterId]);

  const deadlineParsed = useMemo(() => {
    if (!activeSemester?.submissionDeadline) return null;
    return parseEventDateTime(activeSemester.submissionDeadline);
  }, [activeSemester]);

  // Filtered records based on search query, category, and status
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Category filter
      if (selectedCategoryFilter > 0 && r.category !== selectedCategoryFilter) {
        return false;
      }

      const parsed = parseEventDateTime(r.occurredAt);

      // 2. Status filter
      if (selectedStatusFilter === "upcoming") {
        if (!parsed || parsed.isPast) return false;
      } else if (selectedStatusFilter === "missing_evidence") {
        if (Boolean(r.evidenceUrl)) return false;
      } else if (selectedStatusFilter === "completed") {
        if (!parsed || !parsed.isPast || !r.evidenceUrl) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchNote = r.note ? r.note.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchNote) return false;
      }

      return true;
    });
  }, [records, selectedCategoryFilter, selectedStatusFilter, searchQuery]);

  const isFilterActive = searchQuery.trim() !== "" || selectedCategoryFilter !== 0 || selectedStatusFilter !== "all";

  const handleClearFilters = () => {
    triggerHaptic("light");
    setSearchQuery("");
    setSelectedCategoryFilter(0);
    setSelectedStatusFilter("all");
  };

  // Group filtered records by Date YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Array<{ record: DrlRecord; parsed: ParsedEventDateTime }>>();
    for (const r of filteredRecords) {
      const parsed = parseEventDateTime(r.occurredAt);
      if (parsed) {
        const list = map.get(parsed.dateStr) || [];
        list.push({ record: r, parsed });
        map.set(parsed.dateStr, list);
      }
    }
    return map;
  }, [filteredRecords]);

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
    return getUpcomingRecords(filteredRecords);
  }, [filteredRecords]);

  const pastEvents = useMemo(() => {
    return getPastRecords(filteredRecords);
  }, [filteredRecords]);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
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
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setViewMode("grid");
                }}
                className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Lịch tháng</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setViewMode("agenda");
                }}
                className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
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
              type="button"
              onClick={() => {
                triggerHaptic("light");
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

        {/* Milestone Card: Semester Submission Deadline */}
        {deadlineParsed && (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/20 border border-amber-300 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    Hạn Chót Nộp Hồ Sơ ĐRL: {activeSemester?.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      deadlineParsed.isToday
                        ? "bg-rose-500 text-white"
                        : deadlineParsed.isTomorrow
                        ? "bg-amber-500 text-slate-950 font-bold"
                        : deadlineParsed.daysDiff > 0
                        ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {deadlineParsed.isToday
                      ? "HÔM NAY HẾT HẠN!"
                      : deadlineParsed.isTomorrow
                      ? "NGÀY MAI HẾT HẠN"
                      : deadlineParsed.daysDiff > 0
                      ? `Còn ${deadlineParsed.daysDiff} ngày`
                      : "Đã qua hạn nộp"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Hạn cuối: <strong className="text-slate-900 dark:text-white font-mono">{activeSemester?.submissionDeadline}</strong> • Nộp Form 01 và minh chứng cho BCS lớp/Khoa.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  const ev: CalendarEventItem = {
                    id: `deadline-${activeSemester?.id}`,
                    title: `[HẠN CHÓT ĐRL] Nộp hồ sơ ${activeSemester?.name}`,
                    date: activeSemester!.submissionDeadline!,
                    description: `Hạn chót nộp phiếu điểm rèn luyện ${activeSemester?.name}`,
                    location: "Khoa đào tạo / Văn phòng Đoàn Trường HUIT",
                    isDeadline: true,
                  };
                  window.open(buildGoogleCalendarUrl(ev), "_blank", "noopener,noreferrer");
                }}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-slate-800 text-xs font-semibold transition shadow-2xs cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Google Calendar</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  const ev: CalendarEventItem = {
                    id: `deadline-${activeSemester?.id}`,
                    title: `[HẠN CHÓT ĐRL] Nộp hồ sơ ${activeSemester?.name}`,
                    date: activeSemester!.submissionDeadline!,
                    description: `Hạn chót nộp phiếu điểm rèn luyện ${activeSemester?.name}`,
                    location: "Khoa đào tạo / Văn phòng Đoàn Trường HUIT",
                    isDeadline: true,
                  };
                  void downloadSingleEventIcs(ev);
                }}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải .ICS</span>
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 mb-6 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Tìm hoạt động theo tên hoặc địa điểm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Xóa nội dung tìm kiếm"
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Chips */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setSelectedStatusFilter("all");
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedStatusFilter === "all"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Tất cả ({records.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setSelectedStatusFilter("upcoming");
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedStatusFilter === "upcoming"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Sắp tới
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setSelectedStatusFilter("missing_evidence");
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedStatusFilter === "missing_evidence"
                    ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Thiếu minh chứng
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setSelectedStatusFilter("completed");
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedStatusFilter === "completed"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Đã hoàn thành
              </button>
            </div>
          </div>

          {/* Criteria Filter Chips TC1 - TC5 */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
              Lọc theo tiêu chí:
            </span>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setSelectedCategoryFilter(0);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selectedCategoryFilter === 0
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 border-transparent font-bold"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              Tất cả TC
            </button>
            {[1, 2, 3, 4, 5].map((cat) => {
              const col = getCriteriaColor(cat);
              const isSelected = selectedCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setSelectedCategoryFilter(cat === selectedCategoryFilter ? 0 : cat);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? `${col.bg} text-white border-transparent shadow-2xs`
                      : `${col.lightBg} ${col.text} ${col.border}`
                  }`}
                >
                  TC{cat}
                </button>
              );
            })}

            {isFilterActive && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="ml-auto inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Empty Banner if records exist but filter matched zero */}
        {records.length > 0 && filteredRecords.length === 0 && !loading && (
          <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 shadow-xs">
            <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Không tìm thấy hoạt động nào phù hợp với bộ lọc hiện tại
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Hãy thử tìm kiếm với từ khóa khác hoặc nhấn &quot;Xóa bộ lọc&quot; để hiển thị toàn bộ hoạt động.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-4 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Xem lại tất cả hoạt động</span>
            </button>
          </div>
        )}

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
                    type="button"
                    onClick={handleToday}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Hôm nay
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Tháng trước"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Tháng sau"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setSelectedDateStr(cell.dateStr);
                      }}
                      className={`min-h-[64px] sm:min-h-[82px] p-1.5 sm:p-2 rounded-xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
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
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
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
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
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
                    {selectedDateEvents.map(({ record, parsed }) => (
                      <CalendarRecordCard
                        key={record.id}
                        record={record}
                        parsed={parsed}
                        variant="compact"
                        onOpenEvidenceModal={(rec) => {
                          setEvidenceModalRecord(rec);
                          setIsEvidenceModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                💡 <span className="font-medium">Mẹo:</span> Bạn có thể bấm nút Google Calendar hoặc .ICS để đồng bộ lịch trình nhắc nhở vào điện thoại cá nhân.
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
                  Không có lịch trình sắp tới. Hãy bấm &quot;+ Lên lịch hoạt động&quot; để thêm hoạt động mới.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(({ record, parsed }) => (
                    <CalendarRecordCard
                      key={record.id}
                      record={record}
                      parsed={parsed}
                      variant="agenda-upcoming"
                      onOpenEvidenceModal={(rec) => {
                        setEvidenceModalRecord(rec);
                        setIsEvidenceModalOpen(true);
                      }}
                    />
                  ))}
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
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">Đang tải lịch sử hoạt động...</p>
              ) : pastEvents.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                  Chưa có hoạt động quá khứ nào được ghi nhận.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {pastEvents.slice(0, 15).map(({ record, parsed }) => (
                    <CalendarRecordCard
                      key={record.id}
                      record={record}
                      parsed={parsed}
                      variant="agenda-past"
                      onOpenEvidenceModal={(rec) => {
                        setEvidenceModalRecord(rec);
                        setIsEvidenceModalOpen(true);
                      }}
                    />
                  ))}
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
        initialDate={modalInitialDate}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          if (currentSemesterId) {
            void loadRecords(currentSemesterId);
          }
        }}
      />

      {/* Quick Evidence Modal */}
      <QuickEvidenceModal
        isOpen={isEvidenceModalOpen}
        record={evidenceModalRecord}
        onClose={() => {
          setIsEvidenceModalOpen(false);
          setEvidenceModalRecord(null);
        }}
        onSuccess={(updated) => {
          setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        }}
      />

      <BottomNav />
    </div>
  );
}
