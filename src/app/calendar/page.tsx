"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { AddRecordModal } from "@/components/records/AddRecordModal";
import { QuickEvidenceModal } from "@/components/calendar/QuickEvidenceModal";
import { CalendarRecordCard } from "@/components/calendar/CalendarRecordCard";
import { CalendarEventDetailModal } from "@/components/calendar/CalendarEventDetailModal";
import { ShareInviteModal } from "@/components/calendar/ShareInviteModal";
import { ClaimInviteModal } from "@/components/calendar/ClaimInviteModal";
import { DrlRecord, Semester, User } from "@/lib/db/schema";
import {
  parseEventDateTime,
  getCriteriaColor,
  getUpcomingRecords,
  getPastRecords,
  formatPointsLabel,
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
  Clock,
  CheckCircle2,
  AlertCircle,
  Ticket,
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

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<string>("");
  const [recordToEdit, setRecordToEdit] = useState<DrlRecord | null>(null);

  // Event Detail Modal states
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<DrlRecord | null>(null);

  // Quick Evidence Modal states
  const [evidenceModalRecord, setEvidenceModalRecord] = useState<DrlRecord | null>(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);

  // Share & Claim Modal states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalRecord, setShareModalRecord] = useState<DrlRecord | null>(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number>(0); // 0 = all
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "upcoming" | "missing_evidence" | "completed">("all");

  // Calendar View states (remember student's view preference in localStorage)
  const [viewMode, setViewMode] = useState<"grid" | "agenda">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("huit_cal_view_mode");
        if (saved === "agenda" || saved === "grid") return saved;
      } catch (e) {
        console.warn("Could not read calendar view mode:", e);
      }
    }
    return "grid";
  });

  const handleViewModeChange = (mode: "grid" | "agenda") => {
    triggerHaptic("light");
    setViewMode(mode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("huit_cal_view_mode", mode);
      } catch (e) {
        console.warn("Could not save calendar view mode:", e);
      }
    }
  };

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

    // Next month padding to fill complete rows of 7
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

  // Upcoming & Past events for Agenda View
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

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-7">
        {/* Top Control Bar with prominent View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Lịch Cá Nhân & Nhắc Việc
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Theo dõi kế hoạch hoạt động rèn luyện sinh viên theo QĐ 3385/QĐ-DCT
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Switcher: Big, obvious, intuitive */}
            <div className="inline-flex items-center p-1 rounded-2xl bg-slate-200/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => handleViewModeChange("grid")}
                className={`h-9 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs ring-1 ring-slate-900/5 dark:ring-white/10"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                }`}
              >
                <Grid className="w-4 h-4 text-amber-500" />
                <span>Lịch tháng (Theo ô)</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("agenda")}
                className={`h-9 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                  viewMode === "agenda"
                    ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs ring-1 ring-slate-900/5 dark:ring-white/10"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                }`}
              >
                <ListFilter className="w-4 h-4 text-sky-500" />
                <span>Dòng thời gian (Danh sách)</span>
              </button>
            </div>

            {/* Enter Invite Code button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setIsClaimModalOpen(true);
              }}
              className="h-9 px-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-bold flex items-center space-x-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors shadow-xs cursor-pointer shrink-0"
              title="Nhập mã mời từ bạn bè để thêm hoạt động"
            >
              <Ticket className="w-4 h-4" />
              <span>Nhập mã mời</span>
            </button>

            {/* Add Record button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setRecordToEdit(null);
                setModalInitialDate(selectedDateStr || "");
                setIsAddModalOpen(true);
              }}
              className="h-9 px-4 rounded-xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 text-xs sm:text-sm font-bold flex items-center space-x-1.5 hover:bg-slate-800 dark:hover:bg-amber-400 transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Lên lịch hoạt động</span>
            </button>
          </div>
        </div>

        {/* Milestone Card: Semester Submission Deadline (Compact & Refined) */}
        {deadlineParsed && (
          <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/20 border border-amber-300 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                <Bell className="w-4 h-4 animate-bounce" />
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
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Hạn cuối: <strong className="text-slate-900 dark:text-white font-mono">{activeSemester?.submissionDeadline}</strong> • Nộp Form 01 và minh chứng cho BCS lớp/Khoa.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
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
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Google Cal</span>
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
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải .ICS</span>
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 mb-5 shadow-xs space-y-2.5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
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
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
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

        {/* Filter Empty Banner */}
        {records.length > 0 && filteredRecords.length === 0 && !loading && (
          <div className="text-center py-10 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 mb-5 shadow-xs">
            <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Không tìm thấy hoạt động nào phù hợp với bộ lọc hiện tại
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Hãy thử tìm kiếm với từ khóa khác hoặc nhấn &quot;Xóa lọc&quot; để hiển thị toàn bộ hoạt động.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-3.5 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Xem lại tất cả hoạt động</span>
            </button>
          </div>
        )}

        {/* ===================== VIEW 1: LỊCH THEO Ô (FULL-WIDTH MONTH GRID) ===================== */}
        {viewMode === "grid" ? (
          <div className="space-y-5">
            {/* Full-width Calendar Container */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs">
              {/* Month Navigator Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Tháng {currentMonth + 1}, {currentYear}
                  </h2>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 transition-colors cursor-pointer"
                  >
                    Hôm nay
                  </button>
                  {loading && (
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin ml-2" />
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-3">
                  {/* Criteria Legend */}
                  <div className="hidden lg:flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Tiêu chí:</span>
                    {[1, 2, 3, 4, 5].map((cat) => {
                      const c = getCriteriaColor(cat);
                      return (
                        <div key={cat} className="flex items-center space-x-1">
                          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                          <span className="text-[10px] font-semibold">TC{cat}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Previous / Next Month Arrows */}
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      aria-label="Tháng trước"
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      aria-label="Tháng sau"
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2.5">
                {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"].map((dow, idx) => (
                  <div
                    key={dow}
                    className={`text-[11px] font-extrabold uppercase tracking-wider py-1.5 rounded-lg ${
                      idx >= 5
                        ? "text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-950/20"
                        : "text-slate-500 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/40"
                    }`}
                  >
                    {dow}
                  </div>
                ))}
              </div>

              {/* ===================== DESKTOP / TABLET FULL-WIDTH GRID ===================== */}
              <div className="hidden md:grid grid-cols-7 gap-2">
                {gridDays.map((cell) => {
                  const dayEvents = eventsByDate.get(cell.dateStr) || [];
                  const isSelected = selectedDateStr === cell.dateStr;

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => {
                        triggerHaptic("light");
                        setSelectedDateStr(cell.dateStr);
                      }}
                      className={`min-h-[110px] lg:min-h-[125px] p-2 rounded-2xl flex flex-col justify-between text-left transition-all border group relative cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-slate-900 dark:ring-amber-500 border-transparent bg-amber-50/40 dark:bg-amber-950/20 shadow-xs"
                          : cell.isCurrentMonth
                          ? "bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800/60"
                          : "bg-slate-50/20 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/40 opacity-40 hover:opacity-75"
                      }`}
                    >
                      {/* Cell Header: Day Number + Quick Add */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                            cell.isToday
                              ? "bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-400"
                              : isSelected
                              ? "text-amber-600 dark:text-amber-400 font-extrabold"
                              : cell.isCurrentMonth
                              ? "text-slate-700 dark:text-slate-300"
                              : "text-slate-400 dark:text-slate-600"
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        <div className="flex items-center space-x-1">
                          {dayEvents.length > 0 && (
                            <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {dayEvents.length}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic("light");
                              setRecordToEdit(null);
                              setModalInitialDate(cell.dateStr);
                              setIsAddModalOpen(true);
                            }}
                            title={`Lên lịch hoạt động ngày ${cell.dateStr}`}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Event Chips directly inside the cell */}
                      <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map(({ record, parsed }) => {
                          const col = getCriteriaColor(record.category);
                          const hasEvidence = Boolean(record.evidenceUrl);

                          return (
                            <button
                              key={record.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic("light");
                                setSelectedEventForDetail(record);
                              }}
                              title={`${record.title} • TC${record.category} • ${formatPointsLabel(record.points)}`}
                              className={`w-full text-left px-1.5 py-0.5 rounded-lg text-[10.5px] font-medium border flex items-center justify-between gap-1 transition-all hover:scale-[1.02] shadow-2xs cursor-pointer ${col.lightBg} ${col.text} ${col.border}`}
                            >
                              <div className="flex items-center space-x-1 truncate flex-1 min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasEvidence ? "bg-emerald-500" : "bg-amber-500"}`} />
                                {parsed.timeStr && (
                                  <span className="font-mono text-[9.5px] opacity-75 shrink-0">
                                    {parsed.timeStr}
                                  </span>
                                )}
                                <span className="truncate">{record.title}</span>
                              </div>
                              <span className="text-[9.5px] font-bold font-mono shrink-0">
                                {formatPointsLabel(record.points)}
                              </span>
                            </button>
                          );
                        })}

                        {dayEvents.length > 3 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic("light");
                              setSelectedDateStr(cell.dateStr);
                              if (dayEvents[0]) {
                                setSelectedEventForDetail(dayEvents[0].record);
                              }
                            }}
                            className="w-full text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 py-0.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition cursor-pointer"
                          >
                            +{dayEvents.length - 3} hoạt động nữa...
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ===================== MOBILE COMPACT GRID (< md) ===================== */}
              <div className="grid md:hidden grid-cols-7 gap-1 sm:gap-1.5">
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
                      className={`min-h-[58px] p-1 rounded-xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-slate-900 dark:ring-amber-500 border-transparent bg-amber-50/60 dark:bg-amber-950/30"
                          : cell.isCurrentMonth
                          ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800"
                          : "bg-slate-50/20 dark:bg-slate-900/40 border-transparent text-slate-300 dark:text-slate-700 opacity-30"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center ${
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
                          <span className="text-[9px] font-bold font-mono px-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Criteria dots on mobile */}
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map(({ record }) => {
                          const col = getCriteriaColor(record.category);
                          return (
                            <span
                              key={record.id}
                              className={`w-1.5 h-1.5 rounded-full ${col.dot}`}
                            />
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] font-mono text-slate-400 leading-none">
                            +
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile / Quick Day Schedule Drawer under Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <CalendarCheck className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Hoạt động ngày {selectedDateStr}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    ({selectedDateEvents.length} hoạt động)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setRecordToEdit(null);
                    setModalInitialDate(selectedDateStr);
                    setIsAddModalOpen(true);
                  }}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm hoạt động</span>
                </button>
              </div>

              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-6 px-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Không có hoạt động nào được ghi nhận vào ngày này.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setRecordToEdit(null);
                      setModalInitialDate(selectedDateStr);
                      setIsAddModalOpen(true);
                    }}
                    className="mt-2.5 inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold hover:bg-slate-800 dark:hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lên lịch hoạt động vào ngày này</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                      onOpenShareModal={(rec) => {
                        setShareModalRecord(rec);
                        setIsShareModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ===================== VIEW 2: DÒNG THỜI GIAN (AGENDA TIMELINE) ===================== */
          <div className="space-y-6">
            {/* Upcoming section */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
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
                      onOpenShareModal={(rec) => {
                        setShareModalRecord(rec);
                        setIsShareModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Past section */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <CalendarCheck className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
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
                      onOpenShareModal={(rec) => {
                        setShareModalRecord(rec);
                        setIsShareModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Record Modal */}
      <AddRecordModal
        isOpen={isAddModalOpen}
        semesterId={currentSemesterId}
        initialDate={modalInitialDate}
        recordToEdit={recordToEdit}
        onClose={() => {
          setIsAddModalOpen(false);
          setRecordToEdit(null);
        }}
        onSuccess={() => {
          setIsAddModalOpen(false);
          setRecordToEdit(null);
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

      {/* Calendar Event Detail Modal (Full action popup) */}
      <CalendarEventDetailModal
        isOpen={Boolean(selectedEventForDetail)}
        record={selectedEventForDetail}
        onClose={() => setSelectedEventForDetail(null)}
        onOpenEvidenceModal={(rec) => {
          setEvidenceModalRecord(rec);
          setIsEvidenceModalOpen(true);
        }}
        onEditRecord={(rec) => {
          setRecordToEdit(rec);
          setIsAddModalOpen(true);
        }}
        onOpenShareModal={(rec) => {
          setShareModalRecord(rec);
          setIsShareModalOpen(true);
        }}
        onDeleteSuccess={(deletedId) => {
          setRecords((prev) => prev.filter((r) => r.id !== deletedId));
        }}
      />

      {/* Share Invite Modal */}
      <ShareInviteModal
        isOpen={isShareModalOpen}
        record={shareModalRecord}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareModalRecord(null);
        }}
      />

      {/* Claim Invite Modal */}
      <ClaimInviteModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        onClaimSuccess={() => {
          if (currentSemesterId) {
            void loadRecords(currentSemesterId);
          }
        }}
      />

      <BottomNav />
    </div>
  );
}
