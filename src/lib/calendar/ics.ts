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
  // Accepts YYYY-MM-DD and turns into YYYYMMDD
  const clean = dateStr.replace(/[^0-9]/g, "");
  if (clean.length >= 8) {
    return clean.slice(0, 8);
  }
  const now = new Date();
  return now.toISOString().slice(0, 10).replace(/-/g, "");
}

export function generateIcsCalendar(
  events: CalendarEventItem[],
  calendarName: string = "HUIT Điểm Rèn Luyện"
): string {
  const nowIcs = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HUIT DRL//Sinh Vien Ren Luyen//VI",
    `X-WR-CALNAME:${calendarName}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of events) {
    const formattedDate = formatIcsDate(ev.date);
    ics.push(
      "BEGIN:VEVENT",
      `UID:${ev.id}@huit.drl`,
      `DTSTAMP:${nowIcs}`,
      `DTSTART;VALUE=DATE:${formattedDate}`,
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
  const d = formatIcsDate(event.date);
  const nextDay = new Date(event.date || Date.now());
  nextDay.setDate(nextDay.getDate() + 1);
  const endD = nextDay.toISOString().slice(0, 10).replace(/-/g, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${d}/${endD}`,
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
    if (r.occurredAt && /^\d{4}-\d{2}-\d{2}$/.test(r.occurredAt)) {
      events.push({
        id: `rec-${r.id}`,
        title: `[ĐRL TC${r.category}] ${r.title}`,
        date: r.occurredAt,
        description: `Điểm: ${Number(r.points) > 0 ? "+" : ""}${r.points}đ | Ghi chú: ${r.note || "Đã nộp minh chứng"}`,
        location: "Trường Đại học Công Thương TP.HCM",
      });
    }
  }

  return events;
}
