import { DrlRecord, Semester } from "@/lib/db/schema";

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  description?: string;
  location?: string;
  isDeadline?: boolean;
}

export function formatIcsDate(dateStr: string): string {
  // Accepts YYYY-MM-DD (or YYYY-MM-DDTHH:mm) and turns into YYYYMMDD
  const dateOnly = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const clean = dateOnly.replace(/[^0-9]/g, "");
  if (clean.length >= 8) {
    return clean.slice(0, 8);
  }
  const now = new Date();
  return now.toISOString().slice(0, 10).replace(/-/g, "");
}

export function formatIcsDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const dStr = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}${m}${dStr}T${h}${min}${s}`;
}

export function generateIcsCalendar(
  events: CalendarEventItem[],
  calendarName: string = "HUIT Điểm Rèn Luyện"
): string {
  const nowIcs = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HUIT DRL//Sinh Vien Ren Luyen//VI",
    `X-WR-CALNAME:${calendarName}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of events) {
    const hasTime = ev.date.includes("T");
    let dtStartLine = "";
    let dtEndLine: string | null = null;

    if (hasTime) {
      const [dPart, tPart] = ev.date.split("T");
      const startDt = new Date(`${dPart}T${tPart.slice(0, 5)}:00`);
      if (!Number.isNaN(startDt.getTime())) {
        const endDt = new Date(startDt.getTime() + 60 * 60 * 1000); // 1 hour duration
        dtStartLine = `DTSTART:${formatIcsDateTime(startDt)}`;
        dtEndLine = `DTEND:${formatIcsDateTime(endDt)}`;
      } else {
        dtStartLine = `DTSTART;VALUE=DATE:${formatIcsDate(ev.date)}`;
      }
    } else {
      dtStartLine = `DTSTART;VALUE=DATE:${formatIcsDate(ev.date)}`;
    }

    ics.push(
      "BEGIN:VEVENT",
      `UID:${ev.id}@huit.drl`,
      `DTSTAMP:${nowIcs}`,
      dtStartLine
    );

    if (dtEndLine) {
      ics.push(dtEndLine);
    }

    ics.push(
      `SUMMARY:${ev.title.replace(/[\n\r]/g, " ")}`,
      `DESCRIPTION:${(ev.description || "Ghi nhận trong sổ điểm rèn luyện HUIT.").replace(/[\n\r]/g, "\\n")}`,
      `LOCATION:${(ev.location || "Trường Đại học Công Thương TP.HCM (HUIT)").replace(/[\n\r]/g, " ")}`
    );

    if (ev.isDeadline) {
      ics.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:Hạn chót nộp hồ sơ ĐRL: ${ev.title}`,
        "TRIGGER:-P2D", // Nhắc trước 2 ngày
        "END:VALARM"
      );
    }

    ics.push("END:VEVENT");
  }

  ics.push("END:VCALENDAR");
  return ics.join("\r\n");
}

export function buildGoogleCalendarUrl(event: CalendarEventItem): string {
  let datesParam: string;
  if (event.date.includes("T")) {
    const [dPart, tPart] = event.date.split("T");
    const startDt = new Date(`${dPart}T${tPart.slice(0, 5)}:00`);
    if (!Number.isNaN(startDt.getTime())) {
      const endDt = new Date(startDt.getTime() + 60 * 60 * 1000); // 1 hour duration
      datesParam = `${formatIcsDateTime(startDt)}/${formatIcsDateTime(endDt)}`;
    } else {
      const d = formatIcsDate(dPart);
      const baseDate = new Date(dPart);
      const nextDay = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
      nextDay.setDate(nextDay.getDate() + 1);
      const endD = nextDay.toISOString().slice(0, 10).replace(/-/g, "");
      datesParam = `${d}/${endD}`;
    }
  } else {
    const d = formatIcsDate(event.date);
    const baseDate = new Date(event.date);
    const nextDay = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
    nextDay.setDate(nextDay.getDate() + 1);
    const endD = nextDay.toISOString().slice(0, 10).replace(/-/g, "");
    datesParam = `${d}/${endD}`;
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: datesParam,
    details: event.description || "Ghi nhận trong sổ điểm rèn luyện HUIT QĐ 3385",
    location: event.location || "Trường ĐH Công Thương TP.HCM",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildSemesterCalendarEvents(
  semester: Semester | null,
  records: DrlRecord[]
): CalendarEventItem[] {
  const events: CalendarEventItem[] = [];

  if (semester?.submissionDeadline) {
    events.push({
      id: `deadline-${semester.id}`,
      title: `[HẠN CHÓT] Nộp hồ sơ ĐRL ${semester.name}`,
      date: semester.submissionDeadline,
      description: `Hạn chót nộp phiếu đánh giá điểm rèn luyện (Form 01) cho Cố vấn học tập và Ban cán sự lớp ${semester.name}.`,
      location: "Khoa đào tạo / Văn phòng Đoàn Trường HUIT",
      isDeadline: true,
    });
  }

  for (const r of records) {
    if (r.occurredAt && /^\d{4}-\d{2}-\d{2}/.test(r.occurredAt)) {
      let loc = "Trường Đại học Công Thương TP.HCM";
      let cleanNote = r.note || "Đã nộp minh chứng";
      const closeBracketIdx = cleanNote.indexOf("]");
      if (cleanNote.startsWith("[") && closeBracketIdx > 1) {
        loc = cleanNote.slice(1, closeBracketIdx).trim() || loc;
        cleanNote = cleanNote.slice(closeBracketIdx + 1).trim() || "Hoạt động rèn luyện";
      }

      events.push({
        id: `rec-${r.id}`,
        title: `[ĐRL TC${r.category}] ${r.title}`,
        date: r.occurredAt,
        description: `Điểm: ${Number(r.points) > 0 ? "+" : ""}${r.points}đ | Ghi chú: ${cleanNote}`,
        location: loc,
      });
    }
  }

  return events;
}

