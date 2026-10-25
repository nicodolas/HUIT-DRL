import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drlRecords, semesters } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { calculateSemesterScore, analyzeGoalGap } from "@/lib/drl/calculator";
import { DisciplineLevel } from "@/lib/drl/rules";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const semesterId = searchParams.get("semesterId");

  if (!semesterId) {
    return NextResponse.json({ error: "Vui lòng chọn học kỳ" }, { status: 400 });
  }

  try {
    // 1. Verify semester belongs to user
    const [semester] = await db
      .select()
      .from(semesters)
      .where(and(eq(semesters.id, semesterId), eq(semesters.userId, session.id)))
      .limit(1);

    if (!semester) {
      return NextResponse.json({ error: "Không tìm thấy học kỳ" }, { status: 404 });
    }

    // 2. Fetch all records for this semester
    const records = await db
      .select()
      .from(drlRecords)
      .where(and(eq(drlRecords.semesterId, semesterId), eq(drlRecords.userId, session.id)))
      .orderBy(desc(drlRecords.createdAt));

    // 3. Compute score and goal progress
    const scoreSummary = calculateSemesterScore(
      records,
      (semester.disciplineLevel as DisciplineLevel) || "none"
    );

    const goalAnalysis = analyzeGoalGap(
      scoreSummary.totalScore,
      semester.targetScore || 90,
      scoreSummary.categories
    );

    return NextResponse.json({
      semester,
      records,
      scoreSummary,
      goalAnalysis,
    });
  } catch (error: any) {
    console.error("Records GET error:", error);
    return NextResponse.json({ error: "Lỗi tải bản ghi: " + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { semesterId, presetId, category, title, type, points, quantity, occurredAt, note } = body;

    if (!semesterId || !category || !title || points === undefined) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ thông tin hoạt động." },
        { status: 400 }
      );
    }

    // Verify semester belongs to user
    const [semester] = await db
      .select()
      .from(semesters)
      .where(and(eq(semesters.id, semesterId), eq(semesters.userId, session.id)))
      .limit(1);

    if (!semester) {
      return NextResponse.json({ error: "Học kỳ không hợp lệ" }, { status: 403 });
    }

    const recordId = randomUUID();
    await db.insert(drlRecords).values({
      id: recordId,
      userId: session.id,
      semesterId,
      presetId: presetId || null,
      category: Number(category),
      title: title.trim(),
      type: type || (Number(points) >= 0 ? "add" : "deduct"),
      points: String(points),
      quantity: quantity ? Number(quantity) : 1,
      occurredAt: occurredAt || null,
      note: note ? note.trim() : null,
    });

    return NextResponse.json({ message: "Đã thêm hoạt động!", recordId });
  } catch (error: any) {
    console.error("Records POST error:", error);
    return NextResponse.json({ error: "Lỗi thêm hoạt động: " + error.message }, { status: 500 });
  }
}
