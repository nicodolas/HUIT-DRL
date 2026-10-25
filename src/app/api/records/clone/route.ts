import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drlRecords, semesters } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { sourceSemesterId, targetSemesterId, recordIds } = body;

    if (!sourceSemesterId || !targetSemesterId || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn học kỳ nguồn, học kỳ đích và ít nhất một hoạt động để sao chép." },
        { status: 400 }
      );
    }

    if (sourceSemesterId === targetSemesterId) {
      return NextResponse.json(
        { error: "Học kỳ nguồn và học kỳ đích không được trùng nhau." },
        { status: 400 }
      );
    }

    // Verify ownership of both semesters
    const userSemesters = await db
      .select()
      .from(semesters)
      .where(
        and(
          eq(semesters.userId, session.id),
          inArray(semesters.id, [sourceSemesterId, targetSemesterId])
        )
      );

    if (userSemesters.length < 2) {
      return NextResponse.json(
        { error: "Không tìm thấy học kỳ hợp lệ hoặc bạn không có quyền truy cập." },
        { status: 403 }
      );
    }

    // Fetch source records belonging to user
    const sourceRecords = await db
      .select()
      .from(drlRecords)
      .where(
        and(
          eq(drlRecords.userId, session.id),
          eq(drlRecords.semesterId, sourceSemesterId),
          inArray(drlRecords.id, recordIds)
        )
      );

    if (sourceRecords.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy hoạt động nào hợp lệ để sao chép." },
        { status: 404 }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const newRecords = sourceRecords.map((r) => ({
      id: randomUUID(),
      userId: session.id,
      semesterId: targetSemesterId,
      presetId: r.presetId,
      category: r.category,
      title: r.title,
      type: r.type,
      points: r.points,
      quantity: r.quantity,
      occurredAt: today,
      note: r.note ? `${r.note} (Sao chép từ HK trước)` : "Sao chép từ HK trước",
      evidenceUrl: r.evidenceUrl,
    }));

    await db.insert(drlRecords).values(newRecords);

    return NextResponse.json({
      message: `Đã sao chép thành công ${newRecords.length} hoạt động sang học kỳ mới!`,
      clonedCount: newRecords.length,
    });
  } catch (error: any) {
    console.error("Clone records error:", error);
    return NextResponse.json(
      { error: "Lỗi sao chép hoạt động: " + error.message },
      { status: 500 }
    );
  }
}
