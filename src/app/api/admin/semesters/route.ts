import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { semesters, users, drlRecords } from "@/lib/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { sanitizeText, isValidId } from "@/lib/security/sanitizer";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Quyền truy cập bị từ chối" }, { status: 403 });
  }

  try {
    const list = await db
      .select({
        id: semesters.id,
        name: semesters.name,
        isCurrent: semesters.isCurrent,
        isSystem: semesters.isSystem,
        targetScore: semesters.targetScore,
        disciplineLevel: semesters.disciplineLevel,
        submissionDeadline: semesters.submissionDeadline,
        status: semesters.status,
        createdAt: semesters.createdAt,
        userId: semesters.userId,
        creatorUsername: users.username,
        creatorFullName: users.fullName,
        recordCount: sql<number>`(SELECT count(*)::int FROM drl_records WHERE semester_id = ${semesters.id})`,
      })
      .from(semesters)
      .leftJoin(users, eq(semesters.userId, users.id))
      .orderBy(desc(semesters.isSystem), desc(semesters.createdAt))
      .limit(100);

    return NextResponse.json({
      success: true,
      semesters: list,
    });
  } catch (error) {
    console.error("GET /api/admin/semesters error:", error);
    return NextResponse.json({ error: "Lỗi khi tải danh sách học kỳ" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Quyền truy cập bị từ chối" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const name = sanitizeText(body.name || "").trim();
    const targetScore = typeof body.targetScore === "number" ? body.targetScore : 90;
    const submissionDeadline = body.submissionDeadline ? sanitizeText(body.submissionDeadline).trim() : null;
    const isSystem = body.isSystem !== false; // Default to true for admin created

    if (!name || name.length < 3) {
      return NextResponse.json({ error: "Tên học kỳ phải có ít nhất 3 ký tự (Ví dụ: Học kỳ 1 (2026 - 2027))" }, { status: 400 });
    }

    const newSemesterId = randomUUID();

    const [created] = await db
      .insert(semesters)
      .values({
        id: newSemesterId,
        userId: session.id,
        name,
        isCurrent: false,
        targetScore: Math.min(Math.max(targetScore, 50), 100),
        disciplineLevel: "none",
        submissionDeadline,
        status: "active",
        isSystem,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: `Đã tạo thành công học kỳ chính thức "${name}"`,
      semester: created,
    });
  } catch (error) {
    console.error("POST /api/admin/semesters error:", error);
    return NextResponse.json({ error: "Lỗi khi tạo học kỳ mới" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Quyền truy cập bị từ chối" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const semesterId = sanitizeText(searchParams.get("id") || "").trim();

    if (!isValidId(semesterId)) {
      return NextResponse.json({ error: "Mã học kỳ không hợp lệ" }, { status: 400 });
    }

    // 1. Fetch target semester first to determine whether it is a system-wide official semester
    const [targetSem] = await db
      .select({ id: semesters.id, name: semesters.name, isSystem: semesters.isSystem })
      .from(semesters)
      .where(eq(semesters.id, semesterId))
      .limit(1);

    if (!targetSem) {
      return NextResponse.json({ error: "Không tìm thấy học kỳ để xóa" }, { status: 404 });
    }

    if (targetSem.isSystem) {
      // Cascade delete all matching semesters and their DRL records across the system
      const matching = await db
        .select({ id: semesters.id })
        .from(semesters)
        .where(eq(semesters.name, targetSem.name));

      for (const m of matching) {
        await db.delete(drlRecords).where(eq(drlRecords.semesterId, m.id));
      }

      await db.delete(semesters).where(eq(semesters.name, targetSem.name));
    } else {
      // Cascade delete DRL records in this specific semester
      await db.delete(drlRecords).where(eq(drlRecords.semesterId, semesterId));
      await db.delete(semesters).where(eq(semesters.id, semesterId));
    }

    return NextResponse.json({
      success: true,
      message: `Đã xóa học kỳ "${targetSem.name}" thành công`,
    });
  } catch (error) {
    console.error("DELETE /api/admin/semesters error:", error);
    return NextResponse.json({ error: "Lỗi khi xóa học kỳ" }, { status: 500 });
  }
}

