import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sanitizeText } from "@/lib/security/sanitizer";
import { checkRateLimit } from "@/lib/security/rateLimit";

export async function GET(req: Request) {
  try {
    // 1. IP Rate Limiting: Prevent automated username enumeration & DB DoS
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "client_ip";
    const rateLimitKey = `check_username_${ip}`;

    // Max 45 checks per minute per IP
    const rateCheck = checkRateLimit(rateLimitKey, 45, 60 * 1000);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          available: false,
          valid: false,
          rateLimited: true,
          message: `Bạn đang kiểm tra tên quá thường xuyên. Vui lòng thử lại sau ${Math.ceil(
            rateCheck.resetMs / 1000
          )} giây.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateCheck.resetMs / 1000).toString(),
            "X-RateLimit-Limit": "45",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const rawUsername = searchParams.get("username");

    if (!rawUsername) {
      return NextResponse.json(
        { available: false, valid: false, message: "Vui lòng nhập tên đăng nhập." },
        { status: 400 }
      );
    }

    const cleanUsername = sanitizeText(rawUsername, 32).toLowerCase();

    if (cleanUsername.length < 3) {
      return NextResponse.json({
        available: false,
        valid: false,
        message: "Tên đăng nhập phải có ít nhất 3 ký tự.",
      });
    }

    if (cleanUsername.length > 32) {
      return NextResponse.json({
        available: false,
        valid: false,
        message: "Tên đăng nhập không được vượt quá 32 ký tự.",
      });
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return NextResponse.json({
        available: false,
        valid: false,
        message: "Tên đăng nhập chỉ chứa chữ cái, số, gạch dưới (_), gạch ngang (-) hoặc dấu chấm (.).",
      });
    }

    // Check existence in Neon DB
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, cleanUsername))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({
        available: false,
        valid: true,
        message: "Tên đăng nhập này đã được sử dụng.",
      });
    }

    return NextResponse.json({
      available: true,
      valid: true,
      message: "Tên đăng nhập hợp lệ và khả dụng.",
    });
  } catch (error: any) {
    console.error("Check username error:", error);
    return NextResponse.json(
      { available: false, valid: false, message: "Lỗi hệ thống khi kiểm tra tên đăng nhập." },
      { status: 500 }
    );
  }
}
