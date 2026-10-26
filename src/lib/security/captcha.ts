import crypto from "crypto";
import { env } from "@/lib/env";

const MIN_ELAPSED_MS = 1500; // 1.5 seconds
const MAX_ELAPSED_MS = 15 * 60 * 1000; // 15 minutes

export interface CaptchaChallenge {
  token: string;
  timestamp: number;
}

export interface VerifyCaptchaResult {
  success: boolean;
  error?: string;
}

/**
 * Sinh challenge mã hóa HMAC chứa timestamp phục vụ Invisible CAPTCHA
 */
export function generateCaptchaChallenge(customTimestamp?: number): CaptchaChallenge {
  const timestamp = customTimestamp ?? Date.now();
  const secret = env.AUTH_SECRET;
  const nonce = crypto.randomBytes(8).toString("hex");
  const data = `captcha:${timestamp}:${nonce}`;
  const signature = crypto.createHmac("sha256", secret).update(data).digest("hex");
  const token = `${timestamp}.${nonce}.${signature}`;

  return {
    token,
    timestamp,
  };
}

/**
 * Xác thực Invisible CAPTCHA:
 * 1. Kiểm tra Honeypot field
 * 2. Xác thực chữ ký HMAC chống giả mạo timestamp
 * 3. Kiểm tra ngưỡng thời gian tương tác (1.5s <= elapsed <= 15m)
 */
export function verifyCaptchaSubmission({
  honeypot,
  token,
}: {
  honeypot?: string;
  token?: string;
}): VerifyCaptchaResult {
  // 1. Kiểm tra Honeypot: Nếu có bất kỳ giá trị nào => Bẫy Bot!
  if (honeypot && typeof honeypot === "string" && honeypot.trim().length > 0) {
    return {
      success: false,
      error: "Phát hiện hành vi tự động.",
    };
  }

  // 2. Kiểm tra token có tồn tại và đúng định dạng
  if (!token || typeof token !== "string") {
    return {
      success: false,
      error: "Mã bảo vệ không hợp lệ hoặc thiếu.",
    };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return {
      success: false,
      error: "Mã bảo vệ không hợp lệ.",
    };
  }

  const [timestampStr, nonce, signature] = parts;
  const timestamp = Number(timestampStr);

  if (!timestamp || isNaN(timestamp)) {
    return {
      success: false,
      error: "Mã bảo vệ không hợp lệ.",
    };
  }

  // Kiểm tra chữ ký HMAC
  const secret = env.AUTH_SECRET;
  const data = `captcha:${timestampStr}:${nonce}`;
  const expectedSignature = crypto.createHmac("sha256", secret).update(data).digest("hex");

  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return {
      success: false,
      error: "Chữ ký xác thực không hợp lệ.",
    };
  }

  // 3. Kiểm tra elapsed time
  const now = Date.now();
  const elapsed = now - timestamp;

  if (elapsed < MIN_ELAPSED_MS) {
    return {
      success: false,
      error: "Thao tác quá nhanh, vui lòng thao tác bình thường.",
    };
  }

  if (elapsed > MAX_ELAPSED_MS) {
    return {
      success: false,
      error: "Phiên đăng ký đã hết hạn. Vui lòng thử lại.",
    };
  }

  return { success: true };
}
