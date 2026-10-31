import { randomBytes } from "crypto";

// 31 unambiguous alphanumeric characters (excluding 0, O, 1, I, L)
const CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Generates an intuitive, readable invite code, e.g. "HUIT-9K2F"
 */
export function generateInviteCode(): string {
  const bytes = randomBytes(4);
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CHARS[bytes[i] % CHARS.length];
  }
  return `HUIT-${code}`;
}

/**
 * Normalizes user-entered invite code:
 * - Trims whitespace
 * - Converts to uppercase
 * - Prepends "HUIT-" if user only typed 4 chars (e.g. "9K2F" -> "HUIT-9K2F")
 */
export function normalizeInviteCode(input?: string | null): string {
  if (!input) return "";
  let clean = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!clean.startsWith("HUIT-") && clean.length === 4) {
    clean = `HUIT-${clean}`;
  }
  return clean;
}

