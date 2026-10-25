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

export function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .replace(/[<>]/g, "") // remove angle brackets to prevent simple HTML injection
    .substring(0, 1000); // enforce maximum length
}
