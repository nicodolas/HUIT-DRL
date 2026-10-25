import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password } = body; // identifier can be email or mssv

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập Email / MSSV và Mật khẩu." },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim();

    // Query user by email or mssv
    const matchingUsers = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, cleanIdentifier.toLowerCase()),
          eq(users.mssv, cleanIdentifier)
        )
      )
      .limit(1);

    if (matchingUsers.length === 0) {
      return NextResponse.json(
        { error: "Tài khoản (Email hoặc MSSV) không tồn tại." },
        { status: 401 }
      );
    }

    const user = matchingUsers[0];
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Mật khẩu không chính xác." },
        { status: 401 }
      );
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      mssv: user.mssv,
      faculty: user.faculty,
      className: user.className,
    };

    await createSession(sessionUser);

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
