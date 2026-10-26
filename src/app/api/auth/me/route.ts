import { NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { sanitizeText } from "@/lib/security/sanitizer";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.id,
      username: session.username,
      fullName: session.fullName,
      studentId: session.studentId || null,
      faculty: session.faculty,
      className: session.className,
      role: session.role,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // 1. Security Check: Detect and reject any privilege escalation attempt (Mass Assignment Defense)
    const FORBIDDEN_PRIVILEGE_FIELDS = ["role", "isAdmin", "is_admin", "admin", "roles", "permissions"];
    for (const field of FORBIDDEN_PRIVILEGE_FIELDS) {
      if (body[field] !== undefined) {
        // Even if an attacker passes role="admin" or role="user", non-admin users cannot alter role
        if (session.role !== "admin" || (field === "role" && body[field] !== session.role)) {
          return NextResponse.json(
            { error: "Cảnh báo bảo mật: Bạn không có quyền thay đổi vai trò (role) của tài khoản." },
            { status: 403 }
          );
        }
      }
    }

    // 2. Security Check: Username is strictly immutable
    if (body.username !== undefined && body.username !== session.username) {
      return NextResponse.json(
        { error: "Tên đăng nhập là định danh cố định, không được phép thay đổi." },
        { status: 400 }
      );
    }

    // 3. Security Check: ID is strictly immutable
    if (body.id !== undefined && body.id !== session.id) {
      return NextResponse.json(
        { error: "Mã định danh người dùng không được phép thay đổi." },
        { status: 400 }
      );
    }

    const { fullName, studentId, faculty, className, currentPassword, newPassword } = body;

    // 4. Validate and sanitize permitted fields
    let newFullName = session.fullName;
    if (fullName !== undefined) {
      const sanitized = sanitizeText(fullName, 100);
      if (!sanitized || sanitized.trim().length < 2) {
        return NextResponse.json(
          { error: "Họ và tên phải có tối thiểu 2 ký tự và không được để trống." },
          { status: 400 }
        );
      }
      newFullName = sanitized.trim();
    }

    const newStudentId =
      studentId !== undefined
        ? sanitizeText(studentId, 32)?.trim() || null
        : session.studentId;

    const newFaculty =
      faculty !== undefined
        ? sanitizeText(faculty, 100)?.trim() || null
        : session.faculty;

    const newClassName =
      className !== undefined
        ? sanitizeText(className, 50)?.trim().toUpperCase() || null
        : session.className;

    // Strict whitelist payload - NEVER include role or username
    const updatePayload: Record<string, any> = {
      fullName: newFullName,
      studentId: newStudentId,
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

      if (typeof newPassword !== "string" || newPassword.length < 6) {
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
      id: session.id,
      username: session.username,
      fullName: newFullName,
      studentId: newStudentId,
      faculty: newFaculty,
      className: newClassName,
      role: session.role,
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
      { error: "Đã xảy ra lỗi khi cập nhật thông tin. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

export const PUT = PATCH;
