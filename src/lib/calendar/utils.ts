import { DrlRecord } from "@/lib/db/schema";

export interface ParsedEventDateTime {
  dateStr: string; // YYYY-MM-DD
  timeStr: string | null; // HH:mm or null
  fullDate: Date;
  isToday: boolean;
  isTomorrow: boolean;
  isPast: boolean;
  isFuture: boolean;
  daysDiff: number; // positive = future, negative = past, 0 = today
}

/**
 * Parses an occurredAt string (either 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm')
 * and calculates relative timing against the current date.
 */
export function parseEventDateTime(occurredAt?: string | null): ParsedEventDateTime | null {
  if (!occurredAt) return null;

  const parts = occurredAt.split("T");
  const dateStr = parts[0];
  const timeStr = parts.length > 1 && parts[1] ? parts[1].slice(0, 5) : null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;

  const [y, m, d] = dateStr.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  let hh = 0;
  let mm = 0;
  if (timeStr) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr)) return null;
    [hh, mm] = timeStr.split(":").map(Number);
  }

  const targetDate = new Date(y, m - 1, d, hh, mm, 0, 0);

  // Validate date round-trip to reject invalid calendar days (e.g., Feb 30)
  if (
    targetDate.getFullYear() !== y ||
    targetDate.getMonth() !== m - 1 ||
    targetDate.getDate() !== d
  ) {
    return null;
  }

  const now = new Date();

  // Today at midnight for day diff calculation
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMidnight = new Date(y, m - 1, d);
  const diffTime = targetMidnight.getTime() - todayMidnight.getTime();
  const daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const isToday = daysDiff === 0;
  const isTomorrow = daysDiff === 1;

  // If timed event, check against current wall-clock time; if date-only, check day diff
  const isPast = timeStr ? targetDate.getTime() < now.getTime() : daysDiff < 0;
  const isFuture = timeStr ? targetDate.getTime() > now.getTime() : daysDiff > 0;

  return {
    dateStr,
    timeStr,
    fullDate: targetDate,
    isToday,
    isTomorrow,
    isPast,
    isFuture,
    daysDiff,
  };
}

/**
 * Criteria 1-5 color palette (HUIT QĐ 3385)
 */
export function getCriteriaColor(category: number) {
  switch (category) {
    case 1:
      return {
        bg: "bg-emerald-500",
        lightBg: "bg-emerald-50 dark:bg-emerald-950/40",
        text: "text-emerald-700 dark:text-emerald-400",
        border: "border-emerald-200 dark:border-emerald-800",
        dot: "bg-emerald-500",
        name: "TC1: Ý thức chấp hành pháp luật & quy chế",
      };
    case 2:
      return {
        bg: "bg-blue-500",
        lightBg: "bg-blue-50 dark:bg-blue-950/40",
        text: "text-blue-700 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-800",
        dot: "bg-blue-500",
        name: "TC2: Ý thức và thái độ trong học tập",
      };
    case 3:
      return {
        bg: "bg-amber-500",
        lightBg: "bg-amber-50 dark:bg-amber-950/40",
        text: "text-amber-700 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-800",
        dot: "bg-amber-500",
        name: "TC3: Hoạt động chính trị - xã hội, văn thể mỹ",
      };
    case 4:
      return {
        bg: "bg-purple-500",
        lightBg: "bg-purple-50 dark:bg-purple-950/40",
        text: "text-purple-700 dark:text-purple-400",
        border: "border-purple-200 dark:border-purple-800",
        dot: "bg-purple-500",
        name: "TC4: Trách nhiệm công dân trong quan hệ cộng đồng",
      };
    case 5:
      return {
        bg: "bg-rose-500",
        lightBg: "bg-rose-50 dark:bg-rose-950/40",
        text: "text-rose-700 dark:text-rose-400",
        border: "border-rose-200 dark:border-rose-800",
        dot: "bg-rose-500",
        name: "TC5: Công tác cán bộ lớp, đoàn thể, thành tích",
      };
    default:
      return {
        bg: "bg-slate-500",
        lightBg: "bg-slate-50 dark:bg-slate-800",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-200 dark:border-slate-700",
        dot: "bg-slate-500",
        name: "Hoạt động rèn luyện",
      };
  }
}

/**
 * Filter upcoming records (today and future) sorted by date ascending
 */
export function getUpcomingRecords(records: DrlRecord[]): Array<{ record: DrlRecord; parsed: ParsedEventDateTime }> {
  const now = Date.now();
  return records
    .map((r) => ({ record: r, parsed: parseEventDateTime(r.occurredAt) }))
    .filter((item): item is { record: DrlRecord; parsed: ParsedEventDateTime } => {
      if (!item.parsed) return false;
      if (item.parsed.timeStr) {
        return item.parsed.fullDate.getTime() >= now;
      }
      return item.parsed.daysDiff >= 0; // Today and future
    })
    .sort((a, b) => a.parsed.fullDate.getTime() - b.parsed.fullDate.getTime());
}

/**
 * Filter today and tomorrow urgent records
 */
export function getUrgentReminders(records: DrlRecord[]): Array<{ record: DrlRecord; parsed: ParsedEventDateTime }> {
  const now = Date.now();
  return records
    .map((r) => ({ record: r, parsed: parseEventDateTime(r.occurredAt) }))
    .filter((item): item is { record: DrlRecord; parsed: ParsedEventDateTime } => {
      if (!item.parsed) return false;
      if (item.parsed.timeStr && item.parsed.isToday) {
        return item.parsed.fullDate.getTime() >= now;
      }
      return item.parsed.isToday || item.parsed.isTomorrow;
    })
    .sort((a, b) => a.parsed.fullDate.getTime() - b.parsed.fullDate.getTime());
}

/**
 * Filter past records sorted by date descending
 */
export function getPastRecords(records: DrlRecord[]): Array<{ record: DrlRecord; parsed: ParsedEventDateTime }> {
  const now = Date.now();
  return records
    .map((r) => ({ record: r, parsed: parseEventDateTime(r.occurredAt) }))
    .filter((item): item is { record: DrlRecord; parsed: ParsedEventDateTime } => {
      if (!item.parsed) return false;
      if (item.parsed.timeStr) {
        return item.parsed.fullDate.getTime() < now;
      }
      return item.parsed.daysDiff < 0;
    })
    .sort((a, b) => b.parsed.fullDate.getTime() - a.parsed.fullDate.getTime());
}

/**
 * Format score number with + prefix if positive
 */
export function formatPointsLabel(pts: string | number): string {
  const num = typeof pts === "string" ? Number.parseFloat(pts) : pts;
  if (Number.isNaN(num)) return "+0đ";
  return num > 0 ? `+${num}đ` : `${num}đ`;
}

/**
 * Splits raw note into optional location (from [Location] prefix) and remaining clean note text.
 */
export function splitLocationNote(rawNote?: string | null): {
  location: string | null;
  cleanNote: string | null;
} {
  if (!rawNote) return { location: null, cleanNote: null };
  const trimmed = rawNote.trim();
  if (trimmed.startsWith("[")) {
    const closeIdx = trimmed.indexOf("]");
    if (closeIdx > 1) {
      const loc = trimmed.slice(1, closeIdx).trim() || null;
      const note = trimmed.slice(closeIdx + 1).trim() || null;
      return { location: loc, cleanNote: note };
    }
  }
  return { location: null, cleanNote: trimmed || null };
}
