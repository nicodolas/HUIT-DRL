import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users, drlRecords, semesters } from "@/lib/db/schema";
import { sql, eq, ilike, or, and, desc } from "drizzle-orm";
import { sanitizeText } from "@/lib/security/sanitizer";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Quyền truy cập bị từ chối" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = sanitizeText(searchParams.get("q") || "").trim();
  const faculty = sanitizeText(searchParams.get("faculty") || "").trim();
  const role = sanitizeText(searchParams.get("role") || "").trim();

  try {
    const conditions = [];

    if (q) {
      const searchPattern = `%${q}%`;
      const searchCond = or(
        ilike(users.fullName, searchPattern),
        ilike(users.username, searchPattern),
        ilike(users.studentId, searchPattern),
        ilike(users.className, searchPattern)
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    if (faculty && faculty !== "ALL") {
      conditions.push(eq(users.faculty, faculty));
    }

    if (role && role !== "ALL") {
      conditions.push(eq(users.role, role));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const userList = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        studentId: users.studentId,
        faculty: users.faculty,
        className: users.className,
        role: users.role,
        createdAt: users.createdAt,
        totalRecords: sql<number>`(SELECT count(*)::int FROM drl_records WHERE user_id = ${users.id})`,
        totalSemesters: sql<number>`(SELECT count(*)::int FROM semesters WHERE user_id = ${users.id})`,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(100);

    return NextResponse.json({
      success: true,
      users: userList,
      currentAdminId: session.id,
    });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json({ error: "Lỗi khi tải danh sách người dùng" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Quyền truy cập bị từ chối" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Thiếu mã định danh người dùng (userId)" }, { status: 400 });
    }

    if (role !== "user" && role !== "admin") {
      return NextResponse.json({ error: "Vai trò không hợp lệ (chỉ chấp nhận 'user' hoặc 'admin')" }, { status: 400 });
    }

    // Safety: Admin cannot demote their own account
    if (userId === session.id && role !== "admin") {
      return NextResponse.json({ error: "Không thể tự hạ quyền Quản trị viên của chính tài khoản bạn đang đăng nhập" }, { status: 400 });
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
      });

    if (!updatedUser) {
      return NextResponse.json({ error: "Không tìm thấy người dùng cần cập nhật" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật quyền của ${updatedUser.fullName} (@${updatedUser.username}) thành ${
        role === "admin" ? "Quản trị viên" : "Sinh viên"
      }`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("PATCH /api/admin/users error:", error);
    return NextResponse.json({ error: "Lỗi khi cập nhật vai trò người dùng" }, { status: 500 });
  }
}
