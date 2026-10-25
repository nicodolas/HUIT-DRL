import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, semesters } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, fullName, mssv, faculty, className } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ Email, Mật khẩu và Họ tên." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const conditions = [eq(users.email, email.toLowerCase().trim())];
    if (mssv && mssv.trim()) {
      conditions.push(eq(users.mssv, mssv.trim()));
    }

    const existingUsers = await db
      .select()
      .from(users)
      .where(or(...conditions))
      .limit(1);

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "Email hoặc Mã số sinh viên (MSSV) đã được đăng ký." },
        { status: 409 }
      );
    }

    const userId = randomUUID();
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      id: userId,
      email: email.toLowerCase().trim(),
      passwordHash,
      fullName: fullName.trim(),
      mssv: mssv ? mssv.trim() : null,
      faculty: faculty ? faculty.trim() : null,
      className: className ? className.trim() : null,
    });

    // Automatically create initial semester for the student
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
      email: email.toLowerCase().trim(),
      fullName: fullName.trim(),
      mssv: mssv ? mssv.trim() : null,
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
