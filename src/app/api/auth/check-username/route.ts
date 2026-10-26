import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sanitizeText } from "@/lib/security/sanitizer";

export async function GET(req: Request) {
  try {
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
