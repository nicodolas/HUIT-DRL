import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drlRecords } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

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
