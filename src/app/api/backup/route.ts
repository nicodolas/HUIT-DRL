import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { semesters, drlRecords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { randomUUID } from "crypto";
import {
  sanitizeText,
  sanitizeTitle,
  sanitizeNote,
  validateCategory,
  validatePoints,
  validateQuantity,
} from "@/lib/security/sanitizer";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const userSemesters = await db
      .select({
        id: semesters.id,
        name: semesters.name,
        isCurrent: semesters.isCurrent,
        targetScore: semesters.targetScore,
        disciplineLevel: semesters.disciplineLevel,
        submissionDeadline: semesters.submissionDeadline,
        status: semesters.status,
      })
      .from(semesters)
      .where(eq(semesters.userId, session.id));

    const userRecords = await db
      .select({
        id: drlRecords.id,
        semesterId: drlRecords.semesterId,
        presetId: drlRecords.presetId,
        category: drlRecords.category,
        title: drlRecords.title,
        type: drlRecords.type,
        points: drlRecords.points,
        quantity: drlRecords.quantity,
        occurredAt: drlRecords.occurredAt,
        note: drlRecords.note,
        evidenceUrl: drlRecords.evidenceUrl,
      })
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
    return NextResponse.json(
      { error: "Lỗi xuất dữ liệu sao lưu. Vui lòng thử lại sau." },
      { status: 500 }
    );
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

    // 1. Process semesters with ownership and type safety
    for (const sem of backupSemesters) {
      const cleanSemName = sanitizeText(sem.name, 100) || "Học kỳ khôi phục";
      const existing = await db
        .select({ id: semesters.id, name: semesters.name })
        .from(semesters)
        .where(eq(semesters.userId, session.id));

      const matched = existing.find((s) => s.name.trim() === cleanSemName);
      if (matched) {
        semesterIdMap[sem.id] = matched.id;
      } else {
        const newId = randomUUID();
        await db.insert(semesters).values({
          id: newId,
          userId: session.id,
          name: cleanSemName,
          isCurrent: false,
          targetScore: sem.targetScore ? Math.min(100, Math.max(0, Number(sem.targetScore))) : 90,
          disciplineLevel: sanitizeText(sem.disciplineLevel, 32) || "none",
          isSystem: false, // Security: Never allow restored semesters to become system semesters
        });
        semesterIdMap[sem.id] = newId;
      }
    }

    // 2. Process records with input validation
    let importedCount = 0;
    if (Array.isArray(backupRecords)) {
      for (const rec of backupRecords) {
        const targetSemesterId = semesterIdMap[rec.semesterId];
        if (!targetSemesterId) continue;

        const cleanTitle = sanitizeTitle(rec.title) || "Hoạt động khôi phục";
        const cat = validateCategory(rec.category) || 1;
        const { value: points } = validatePoints(rec.points || 0);
        const quantity = validateQuantity(rec.quantity || 1);
        const note = sanitizeNote(rec.note);

        const newRecordId = randomUUID();
        await db.insert(drlRecords).values({
          id: newRecordId,
          userId: session.id,
          semesterId: targetSemesterId,
          presetId: rec.presetId ? sanitizeText(String(rec.presetId), 64) : null,
          category: cat,
          title: cleanTitle,
          type: rec.type === "deduct" ? "deduct" : "add",
          points,
          quantity,
          occurredAt: rec.occurredAt ? sanitizeText(String(rec.occurredAt), 32) : null,
          note,
        });
        importedCount++;
      }
    }

    return NextResponse.json({
      message: `Khôi phục thành công ${backupSemesters.length} học kỳ và ${importedCount} mục điểm!`,
    });
  } catch (error: any) {
    console.error("Backup POST error:", error);
    return NextResponse.json(
      { error: "Lỗi nhập dữ liệu sao lưu. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
