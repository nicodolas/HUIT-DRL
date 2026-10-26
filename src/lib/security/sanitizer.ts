export function isValidEvidenceUrl(url?: string | null): boolean {
  if (!url || !url.trim()) return true; // empty is valid (optional)

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  // Explicitly block dangerous script schemes
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return false;
  }

  // Allow safe inline image data URLs for compressed client-side proofs
  if (
    lower.startsWith("data:image/webp;base64,") ||
    lower.startsWith("data:image/jpeg;base64,") ||
    lower.startsWith("data:image/png;base64,")
  ) {
    return true;
  }

  // Block any non-image or potentially executable data schemes (e.g. data:text/html)
  if (lower.startsWith("data:")) {
    return false;
  }

  // Must be valid http or https URL
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeText(text?: string | null, maxLength = 1000): string {
  if (!text) return "";
  return text
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // remove non-printable control chars
    .substring(0, maxLength);
}

export function sanitizeTitle(title?: string | null): string {
  return sanitizeText(title, 255);
}

export function sanitizeNote(note?: string | null): string | null {
  if (!note || !note.trim()) return null;
  return sanitizeText(note, 1000);
}

export function validatePoints(points: unknown): { valid: boolean; value: string } {
  const num = Number(points);
  if (isNaN(num) || num < -100 || num > 100) {
    return { valid: false, value: "0" };
  }
  return { valid: true, value: String(Math.round(num * 10) / 10) };
}

export function validateQuantity(quantity: unknown): number {
  const num = Number(quantity);
  if (isNaN(num) || num < 1) return 1;
  return Math.min(Math.floor(num), 50);
}

export function validateCategory(category: unknown): number | null {
  const num = Number(category);
  if (isNaN(num) || num < 1 || num > 5) return null;
  return Math.floor(num);
}
