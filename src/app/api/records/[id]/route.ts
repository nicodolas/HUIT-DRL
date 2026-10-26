import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drlRecords } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import {
  isValidEvidenceUrl,
  isValidId,
  sanitizeTitle,
  sanitizeNote,
  validateCategory,
  validatePoints,
  validateQuantity,
} from "@/lib/security/sanitizer";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await params;
  if (!id || !isValidId(id)) {
    return NextResponse.json({ error: "Mã bản ghi không hợp lệ" }, { status: 400 });
  }

  try {
    // Strictly isolate deletion to authenticated user's records (Anti-IDOR)
    const deleted = await db
      .delete(drlRecords)
      .where(and(eq(drlRecords.id, id), eq(drlRecords.userId, session.id)))
      .returning({ id: drlRecords.id });

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy hoặc không có quyền xóa bản ghi này" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Đã xóa mục điểm thành công" });
  } catch (error: any) {
    console.error("Records DELETE error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xóa bản ghi. Vui lòng thử lại sau." },
      { status: 500 }
    );
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
  if (!id || !isValidId(id)) {
    return NextResponse.json({ error: "Mã bản ghi không hợp lệ" }, { status: 400 });
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

    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (title !== undefined) {
      const cleanTitle = sanitizeTitle(title);
      if (!cleanTitle) {
        return NextResponse.json({ error: "Tên hoạt động không được để trống" }, { status: 400 });
      }
      updateData.title = cleanTitle;
    }

    if (points !== undefined) {
      const { valid, value } = validatePoints(points);
      if (!valid) {
        return NextResponse.json({ error: "Điểm số không hợp lệ (-100 đến 100)" }, { status: 400 });
      }
      updateData.points = value;
    }

    if (quantity !== undefined) {
      updateData.quantity = validateQuantity(quantity);
    }

    if (occurredAt !== undefined) {
      updateData.occurredAt = occurredAt ? String(occurredAt).trim().slice(0, 32) : null;
    }

    if (note !== undefined) {
      updateData.note = sanitizeNote(note);
    }

    if (evidenceUrl !== undefined) {
      updateData.evidenceUrl = evidenceUrl ? String(evidenceUrl).trim() : null;
    }

    if (category !== undefined) {
      const validCat = validateCategory(category);
      if (!validCat) {
        return NextResponse.json({ error: "Tiêu chí không hợp lệ (1-5)" }, { status: 400 });
      }
      updateData.category = validCat;
    }

    // Strictly enforce row-level ownership on update (Anti-IDOR)
    const updated = await db
      .update(drlRecords)
      .set(updateData)
      .where(and(eq(drlRecords.id, id), eq(drlRecords.userId, session.id)))
      .returning({
        id: drlRecords.id,
        semesterId: drlRecords.semesterId,
        category: drlRecords.category,
        title: drlRecords.title,
        points: drlRecords.points,
        quantity: drlRecords.quantity,
        occurredAt: drlRecords.occurredAt,
        note: drlRecords.note,
        evidenceUrl: drlRecords.evidenceUrl,
      });

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy hoặc không có quyền sửa bản ghi này" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Đã cập nhật mục điểm thành công",
      record: updated[0],
    });
  } catch (error: any) {
    console.error("Records PUT error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật bản ghi. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
