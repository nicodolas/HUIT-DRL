import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit, resetRateLimit } from "@/lib/security/rateLimit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    const cleanUsername = (username || "").trim().toLowerCase();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "client";
    const rateLimitKey = `login_${cleanUsername || ip}`;

    // Rate limit check: 10 attempts per minute
    const rateCheck = checkRateLimit(rateLimitKey, 10, 60 * 1000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: `Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ ${Math.ceil(rateCheck.resetMs / 1000)} giây.` },
        { status: 429, headers: { "Retry-After": Math.ceil(rateCheck.resetMs / 1000).toString() } }
      );
    }

    if (!cleanUsername || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên đăng nhập và mật khẩu." },
        { status: 400 }
      );
    }

    // Query user by username
    const matchingUsers = await db
      .select()
      .from(users)
      .where(eq(users.username, cleanUsername))
      .limit(1);

    if (matchingUsers.length === 0) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không chính xác." },
        { status: 401 }
      );
    }

    const user = matchingUsers[0];
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không chính xác." },
        { status: 401 }
      );
    }

    const userRole = (user.role as "user" | "admin") || (user.username === "admin" ? "admin" : "user");

    const sessionUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      faculty: user.faculty,
      className: user.className,
      role: userRole,
    };

    await createSession(sessionUser);
    resetRateLimit(rateLimitKey);

    return NextResponse.json({
      message: "Đăng nhập thành công!",
      user: sessionUser,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi đăng nhập: " + (error?.message || "Lỗi máy chủ") },
      { status: 500 }
    );
  }
}

