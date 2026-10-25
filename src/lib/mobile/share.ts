export interface ShareSummaryData {
  studentName: string;
  username: string;
  className?: string | null;
  faculty?: string | null;
  semesterName: string;
  totalScore: number;
  ratingLabel: string;
  categories: {
    category: number;
    shortName: string;
    score: number;
    maxPoints: number;
  }[];
  evidenceUrl?: string | null;
}

export function formatZaloSummary(data: ShareSummaryData): string {
  const lines: string[] = [
    `🎓 [HUIT] KẾT QUẢ TỰ ĐÁNH GIÁ ĐIỂM RÈN LUYỆN`,
    `Sinh viên: ${data.studentName} (@${data.username})`,
  ];

  if (data.className) lines.push(`Lớp: ${data.className}`);
  if (data.faculty) lines.push(`Khoa: ${data.faculty}`);
  lines.push(`Học kỳ: ${data.semesterName}`);
  lines.push(`------------------------------------`);

  for (const c of data.categories) {
    lines.push(`• TC${c.category} (${c.shortName}): ${c.score}/${c.maxPoints}đ`);
  }

  lines.push(`------------------------------------`);
  lines.push(`⭐ TỔNG ĐIỂM: ${data.totalScore}/100đ (Xếp loại: ${data.ratingLabel})`);
  lines.push(`(Theo Quy chế đánh giá rèn luyện QĐ 3385/QĐ-DCT)`);

  if (data.evidenceUrl && data.evidenceUrl.trim()) {
    lines.push(`📁 Link Minh Chứng: ${data.evidenceUrl.trim()}`);
  }

  return lines.join("\n");
}

export async function shareTrainingSummary(
  data: ShareSummaryData
): Promise<{ success: boolean; method: "native" | "clipboard" | "failed" }> {
  const text = formatZaloSummary(data);

  // Check Web Share API (native on mobile devices & PWA)
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: `Điểm Rèn Luyện HUIT - ${data.studentName}`,
        text: text,
      });
      return { success: true, method: "native" };
    } catch (err: any) {
      // User cancelled share dialog or not allowed, fallback to clipboard
      if (err.name === "AbortError") {
        return { success: false, method: "failed" };
      }
    }
  }

  // Fallback to clipboard
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, method: "clipboard" };
    } catch (clipErr) {
      console.error("Clipboard error:", clipErr);
      return { success: false, method: "failed" };
    }
  }

  return { success: false, method: "failed" };
}
