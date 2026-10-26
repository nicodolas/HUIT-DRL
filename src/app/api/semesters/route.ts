import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { semesters } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    // 1. Fetch official system semesters created by admin
    const sysSemesters = await db
      .select()
      .from(semesters)
      .where(eq(semesters.isSystem, true));

    // 2. Fetch user's existing semester records
    let userSemesters = await db
      .select()
      .from(semesters)
      .where(eq(semesters.userId, session.id))
      .orderBy(desc(semesters.createdAt));

    // 3. Automatically sync any missing official system semester for this user
    if (sysSemesters.length > 0) {
      const existingNames = new Set(userSemesters.map((s) => s.name));
      let newlyAdded = false;

      for (const sysSem of sysSemesters) {
        if (!existingNames.has(sysSem.name)) {
          const userSemId = randomUUID();
          await db.insert(semesters).values({
            id: userSemId,
            userId: session.id,
            name: sysSem.name,
            isCurrent: sysSem.isCurrent && userSemesters.length === 0,
            targetScore: 90,
            disciplineLevel: "none",
            submissionDeadline: sysSem.submissionDeadline,
            status: sysSem.status || "active",
            isSystem: false,
          });
          newlyAdded = true;
        }
      }

      if (newlyAdded) {
        userSemesters = await db
          .select()
          .from(semesters)
          .where(eq(semesters.userId, session.id))
          .orderBy(desc(semesters.createdAt));
      }
    }

    return NextResponse.json({
      semesters: userSemesters,
      isAdmin: session.role === "admin",
    });
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

  // RBAC: Only Admin can create official semesters
  if (session.role !== "admin") {
    return NextResponse.json(
      { error: "Chức năng tạo học kỳ mới chỉ dành cho Quản trị viên (Admin / Ban Giám hiệu / CVHT)." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name, targetScore, disciplineLevel, submissionDeadline, isCurrent } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Tên học kỳ không được để trống" }, { status: 400 });
    }

    // Set other system semesters to isCurrent = false if this one is current
    if (isCurrent) {
      await db
        .update(semesters)
        .set({ isCurrent: false })
        .where(eq(semesters.isSystem, true));
    }

    const newId = randomUUID();
    await db.insert(semesters).values({
      id: newId,
      userId: session.id,
      name: name.trim(),
      isCurrent: isCurrent !== undefined ? Boolean(isCurrent) : true,
      targetScore: targetScore ? Number(targetScore) : 90,
      disciplineLevel: disciplineLevel || "none",
      submissionDeadline: submissionDeadline ? String(submissionDeadline).trim() : null,
      status: "active",
      isSystem: true,
    });

    const [created] = await db
      .select()
      .from(semesters)
      .where(eq(semesters.id, newId))
      .limit(1);

    return NextResponse.json({
      semester: created,
      message: `Đã tạo học kỳ chính thức "${created.name}" thành công!`,
    });
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
    const { id, targetScore, disciplineLevel, isCurrent, submissionDeadline, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID học kỳ" }, { status: 400 });
    }

    // Verify ownership and existence
    const [existing] = await db
      .select({ id: semesters.id })
      .from(semesters)
      .where(and(eq(semesters.id, id), eq(semesters.userId, session.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy học kỳ hoặc bạn không có quyền sửa học kỳ này" },
        { status: 404 }
      );
    }

    const updateData: any = { updatedAt: new Date() };
    if (targetScore !== undefined) updateData.targetScore = Number(targetScore);
    if (disciplineLevel !== undefined) updateData.disciplineLevel = disciplineLevel;
    if (submissionDeadline !== undefined) {
      updateData.submissionDeadline = submissionDeadline ? String(submissionDeadline).trim() : null;
    }
    if (status !== undefined) {
      updateData.status = String(status).trim();
    }
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
      .where(and(eq(semesters.id, id), eq(semesters.userId, session.id)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Semesters PUT error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật học kỳ: " + error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  // RBAC: Only Admin can delete semesters
  if (session.role !== "admin") {
    return NextResponse.json(
      { error: "Chức năng xóa học kỳ chỉ dành cho Quản trị viên (Admin / CVHT)." },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID học kỳ cần xóa" }, { status: 400 });
    }

    // Ensure user has more than 1 semester so they don't lock themselves out
    const userSemesters = await db
      .select({ id: semesters.id, isCurrent: semesters.isCurrent })
      .from(semesters)
      .where(eq(semesters.userId, session.id));

    if (userSemesters.length <= 1) {
      return NextResponse.json(
        { error: "Bạn không thể xóa học kỳ duy nhất còn lại." },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(semesters)
      .where(and(eq(semesters.id, id), eq(semesters.userId, session.id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy học kỳ hoặc không có quyền xóa" },
        { status: 404 }
      );
    }

    // If the deleted one was current, make another one current
    const wasCurrent = deleted[0].isCurrent;
    if (wasCurrent) {
      const remaining = await db
        .select({ id: semesters.id })
        .from(semesters)
        .where(eq(semesters.userId, session.id))
        .orderBy(desc(semesters.createdAt))
        .limit(1);

      if (remaining.length > 0) {
        await db
          .update(semesters)
          .set({ isCurrent: true })
          .where(eq(semesters.id, remaining[0].id));
      }
    }

    return NextResponse.json({ success: true, message: "Đã xóa học kỳ thành công!" });
  } catch (error: any) {
    console.error("Semesters DELETE error:", error);
    return NextResponse.json({ error: "Lỗi xóa học kỳ: " + error.message }, { status: 500 });
  }
}
