import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { semesters, drlRecords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const userSemesters = await db
      .select()
      .from(semesters)
      .where(eq(semesters.userId, session.id));

    const userRecords = await db
      .select()
      .from(drlRecords)
      .where(eq(drlRecords.userId, session.id));

    const backupData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      user: {
        username: session.username,
        fullName: session.fullName,
        faculty: session.faculty,
        className: session.className,
      },
      semesters: userSemesters,
      records: userRecords,
    };

    return NextResponse.json(backupData);
  } catch (error: any) {
    console.error("Backup GET error:", error);
    return NextResponse.json({ error: "Lỗi xuất dữ liệu: " + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { semesters: backupSemesters, records: backupRecords } = body;

    if (!Array.isArray(backupSemesters)) {
      return NextResponse.json({ error: "Dữ liệu học kỳ không hợp lệ" }, { status: 400 });
    }

    const semesterIdMap: Record<string, string> = {};

    // 1. Process semesters
    for (const sem of backupSemesters) {
      const existing = await db
        .select()
        .from(semesters)
        .where(eq(semesters.userId, session.id));

      const matched = existing.find((s) => s.name.trim() === (sem.name || "").trim());
      if (matched) {
        semesterIdMap[sem.id] = matched.id;
      } else {
        const newId = randomUUID();
        await db.insert(semesters).values({
          id: newId,
          userId: session.id,
          name: sem.name || "Học kỳ khôi phục",
          isCurrent: false,
          targetScore: sem.targetScore || 90,
          disciplineLevel: sem.disciplineLevel || "none",
        });
        semesterIdMap[sem.id] = newId;
      }
    }

    // 2. Process records
    let importedCount = 0;
    if (Array.isArray(backupRecords)) {
      for (const rec of backupRecords) {
        const targetSemesterId = semesterIdMap[rec.semesterId];
        if (!targetSemesterId) continue;

        const newRecordId = randomUUID();
        await db.insert(drlRecords).values({
          id: newRecordId,
          userId: session.id,
          semesterId: targetSemesterId,
          presetId: rec.presetId || null,
          category: Number(rec.category) || 1,
          title: rec.title || "Hoạt động",
          type: rec.type || "add",
          points: String(rec.points || 0),
          quantity: rec.quantity || 1,
          occurredAt: rec.occurredAt || null,
          note: rec.note || null,
        });
        importedCount++;
      }
    }

    return NextResponse.json({
      message: `Khôi phục thành công ${backupSemesters.length} học kỳ và ${importedCount} mục điểm!`,
    });
  } catch (error: any) {
    console.error("Backup POST error:", error);
    return NextResponse.json({ error: "Lỗi nhập dữ liệu: " + error.message }, { status: 500 });
  }
}
