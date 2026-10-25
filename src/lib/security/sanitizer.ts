export function isValidEvidenceUrl(url?: string | null): boolean {
  if (!url || !url.trim()) return true; // empty is valid (optional)

  const trimmed = url.trim();

  // Explicitly block dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return false;
  }

  // Must start with http:// or https://
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .replace(/[<>]/g, "") // remove angle brackets to prevent simple HTML injection
    .substring(0, 1000); // enforce maximum length
}
