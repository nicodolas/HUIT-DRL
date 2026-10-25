import { NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, hashPassword } from "@/lib/auth/password";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user: session });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { fullName, faculty, className, currentPassword, newPassword } = body;

    const newFullName = fullName !== undefined ? (fullName || "").trim() : session.fullName;
    const newFaculty = faculty !== undefined ? (faculty || "").trim() || null : session.faculty;
    const newClassName = className !== undefined ? (className || "").trim() || null : session.className;

    if (!newFullName) {
      return NextResponse.json({ error: "Tên hiển thị không được để trống" }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      fullName: newFullName,
      faculty: newFaculty,
      className: newClassName,
      updatedAt: new Date(),
    };

    // If changing password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Vui lòng nhập mật khẩu hiện tại để xác nhận đổi mật khẩu." },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Mật khẩu mới phải có ít nhất 6 ký tự." },
          { status: 400 }
        );
      }

      const [existingUser] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, session.id))
        .limit(1);

      if (!existingUser) {
        return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
      }

      const isCurrentValid = await verifyPassword(currentPassword, existingUser.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json(
          { error: "Mật khẩu hiện tại không chính xác." },
          { status: 400 }
        );
      }

      updatePayload.passwordHash = await hashPassword(newPassword);
    }

    await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, session.id));

    const updatedUser = {
      ...session,
      fullName: newFullName,
      faculty: newFaculty,
      className: newClassName,
    };

    await createSession(updatedUser);

    return NextResponse.json({
      success: true,
      message: newPassword
        ? "Cập nhật thông tin và đổi mật khẩu thành công!"
        : "Cập nhật thông tin thành công!",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Lỗi cập nhật thông tin: " + (error?.message || "Lỗi máy chủ") },
      { status: 500 }
    );
  }
}
