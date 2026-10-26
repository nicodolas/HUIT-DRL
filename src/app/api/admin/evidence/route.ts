import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { drlRecords, users, semesters } from "@/lib/db/schema";
import { eq, and, desc, isNotNull, ne, or, ilike } from "drizzle-orm";
import { sanitizeText, isValidId } from "@/lib/security/sanitizer";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Quyền truy cập bị từ chối" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = sanitizeText(searchParams.get("status") || "all").trim();
  const category = parseInt(searchParams.get("category") || "0", 10);
  const q = sanitizeText(searchParams.get("q") || "").trim();

  try {
    const conditions = [
      isNotNull(drlRecords.evidenceUrl),
      ne(drlRecords.evidenceUrl, ""),
    ];

    if (status !== "all") {
      conditions.push(eq(drlRecords.auditStatus, status));
    }

    if (category >= 1 && category <= 5) {
      conditions.push(eq(drlRecords.category, category));
    }

    if (q) {
      const searchPattern = `%${q}%`;
      const searchCond = or(
        ilike(drlRecords.title, searchPattern),
        ilike(users.fullName, searchPattern),
        ilike(users.studentId, searchPattern),
        ilike(users.className, searchPattern)
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const records = await db
      .select({
        id: drlRecords.id,
        category: drlRecords.category,
        title: drlRecords.title,
        type: drlRecords.type,
        points: drlRecords.points,
        quantity: drlRecords.quantity,
        occurredAt: drlRecords.occurredAt,
        note: drlRecords.note,
        evidenceUrl: drlRecords.evidenceUrl,
        auditStatus: drlRecords.auditStatus,
        auditComment: drlRecords.auditComment,
        createdAt: drlRecords.createdAt,
        userId: drlRecords.userId,
        studentName: users.fullName,
        studentId: users.studentId,
        studentClass: users.className,
        studentFaculty: users.faculty,
        semesterId: drlRecords.semesterId,
        semesterName: semesters.name,
      })
      .from(drlRecords)
      .innerJoin(users, eq(drlRecords.userId, users.id))
      .innerJoin(semesters, eq(drlRecords.semesterId, semesters.id))
      .where(and(...conditions))
      .orderBy(desc(drlRecords.createdAt))
      .limit(100);

    return NextResponse.json({
      success: true,
      records,
    });
  } catch (error) {
    console.error("GET /api/admin/evidence error:", error);
    return NextResponse.json({ error: "Lỗi khi tải danh sách minh chứng" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Quyền truy cập bị từ chối" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { recordId, auditStatus, auditComment } = body;

    if (!isValidId(recordId)) {
      return NextResponse.json({ error: "Mã bản ghi không hợp lệ" }, { status: 400 });
    }

    const validStatuses = ["pending_review", "valid", "rejected", "missing"];
    if (!validStatuses.includes(auditStatus)) {
      return NextResponse.json({ error: "Trạng thái kiểm duyệt không hợp lệ" }, { status: 400 });
    }

    const cleanComment = auditComment ? sanitizeText(auditComment).trim() : null;

    const [updated] = await db
      .update(drlRecords)
      .set({
        auditStatus,
        auditComment: cleanComment,
        updatedAt: new Date(),
      })
      .where(eq(drlRecords.id, recordId))
      .returning({
        id: drlRecords.id,
        auditStatus: drlRecords.auditStatus,
        auditComment: drlRecords.auditComment,
      });

    if (!updated) {
      return NextResponse.json({ error: "Không tìm thấy bản ghi minh chứng" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật trạng thái kiểm duyệt thành công`,
      record: updated,
    });
  } catch (error) {
    console.error("PATCH /api/admin/evidence error:", error);
    return NextResponse.json({ error: "Lỗi khi kiểm duyệt minh chứng" }, { status: 500 });
  }
}
