import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drlRecords } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { isValidEvidenceUrl } from "@/lib/security/sanitizer";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Thiếu ID bản ghi" }, { status: 400 });
  }

  try {
    const deleted = await db
      .delete(drlRecords)
      .where(and(eq(drlRecords.id, id), eq(drlRecords.userId, session.id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy hoặc không có quyền xóa" }, { status: 404 });
    }

    return NextResponse.json({ message: "Đã xóa mục điểm thành công" });
  } catch (error: any) {
    console.error("Records DELETE error:", error);
    return NextResponse.json({ error: "Lỗi xóa bản ghi: " + error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Thiếu ID bản ghi" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { title, points, quantity, occurredAt, note, category, evidenceUrl } = body;

    if (evidenceUrl && !isValidEvidenceUrl(evidenceUrl)) {
      return NextResponse.json(
        { error: "Liên kết minh chứng không an toàn hoặc không đúng định dạng HTTP/HTTPS." },
        { status: 400 }
      );
    }

    const updateData: any = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title.trim();
    if (points !== undefined) updateData.points = String(points);
    if (quantity !== undefined) updateData.quantity = Math.max(1, Number(quantity));
    if (occurredAt !== undefined) updateData.occurredAt = occurredAt;
    if (note !== undefined) updateData.note = note ? note.trim() : null;
    if (evidenceUrl !== undefined) updateData.evidenceUrl = evidenceUrl ? evidenceUrl.trim() : null;
    if (category !== undefined) updateData.category = Number(category);

    const updated = await db
      .update(drlRecords)
      .set(updateData)
      .where(and(eq(drlRecords.id, id), eq(drlRecords.userId, session.id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy hoặc không có quyền sửa" }, { status: 404 });
    }

    return NextResponse.json({ message: "Đã cập nhật mục điểm thành công", record: updated[0] });
  } catch (error: any) {
    console.error("Records PUT error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật bản ghi: " + error.message }, { status: 500 });
  }
}

