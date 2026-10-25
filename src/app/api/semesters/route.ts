import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { semesters } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
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
      .where(eq(semesters.userId, session.id))
      .orderBy(desc(semesters.createdAt));

    return NextResponse.json({ semesters: userSemesters });
  } catch (error: any) {
    console.error("Semesters GET error:", error);
    return NextResponse.json({ error: "Lỗi tải học kỳ: " + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, targetScore, disciplineLevel } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Tên học kỳ không được để trống" }, { status: 400 });
    }

    // Set other semesters to isCurrent = false if this one is current
    await db
      .update(semesters)
      .set({ isCurrent: false })
      .where(eq(semesters.userId, session.id));

    const newId = randomUUID();
    await db.insert(semesters).values({
      id: newId,
      userId: session.id,
      name: name.trim(),
      isCurrent: true,
      targetScore: targetScore ? Number(targetScore) : 90,
      disciplineLevel: disciplineLevel || "none",
    });

    const [created] = await db
      .select()
      .from(semesters)
      .where(eq(semesters.id, newId))
      .limit(1);

    return NextResponse.json({ semester: created });
  } catch (error: any) {
    console.error("Semesters POST error:", error);
    return NextResponse.json({ error: "Lỗi tạo học kỳ: " + error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, targetScore, disciplineLevel, isCurrent } = body;

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID học kỳ" }, { status: 400 });
    }

    const updateData: any = { updatedAt: new Date() };
    if (targetScore !== undefined) updateData.targetScore = Number(targetScore);
    if (disciplineLevel !== undefined) updateData.disciplineLevel = disciplineLevel;
    if (isCurrent !== undefined) {
      if (isCurrent) {
        await db
          .update(semesters)
          .set({ isCurrent: false })
          .where(eq(semesters.userId, session.id));
      }
      updateData.isCurrent = Boolean(isCurrent);
    }

    await db
      .update(semesters)
      .set(updateData)
      .where(eq(semesters.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Semesters PUT error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật học kỳ: " + error.message }, { status: 500 });
  }
}
