import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, semesters } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "client";
    const rateCheck = checkRateLimit(`register_${ip}`, 5, 60 * 1000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: `Quá nhiều yêu cầu tạo tài khoản. Vui lòng chờ ${Math.ceil(rateCheck.resetMs / 1000)} giây.` },
        { status: 429, headers: { "Retry-After": Math.ceil(rateCheck.resetMs / 1000).toString() } }
      );
    }

    const body = await req.json();
    const { username, password, fullName, faculty, className } = body;

    const cleanUsername = (username || "").trim().toLowerCase();
    const displayName = (fullName || "").trim() || cleanUsername;

    if (!cleanUsername) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên đăng nhập." },
        { status: 400 }
      );
    }

    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { error: "Tên đăng nhập phải có ít nhất 3 ký tự." },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: "Tên đăng nhập chỉ bao gồm chữ cái, số, dấu gạch dưới (_), gạch nối (-) hoặc dấu chấm (.)." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, cleanUsername))
      .limit(1);

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "Tên đăng nhập đã tồn tại. Vui lòng chọn tên đăng nhập khác." },
        { status: 409 }
      );
    }

    const userId = randomUUID();
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      id: userId,
      username: cleanUsername,
      passwordHash,
      fullName: displayName,
      faculty: faculty ? faculty.trim() : null,
      className: className ? className.trim() : null,
    });

    // Automatically create initial semester for the user
    const semesterId = randomUUID();
    await db.insert(semesters).values({
      id: semesterId,
      userId,
      name: "Học kỳ 1 (2025 - 2026)",
      isCurrent: true,
      targetScore: 90,
      disciplineLevel: "none",
    });

    const sessionUser = {
      id: userId,
      username: cleanUsername,
      fullName: displayName,
      faculty: faculty ? faculty.trim() : null,
      className: className ? className.trim() : null,
    };

    await createSession(sessionUser);

    return NextResponse.json({
      message: "Đăng ký thành công!",
      user: sessionUser,
      semesterId,
    });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tạo tài khoản: " + (error?.message || "Lỗi máy chủ") },
      { status: 500 }
    );
  }
}

