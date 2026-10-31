import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { semesters, drlRecords } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { randomUUID } from "crypto";
import { sanitizeText, isValidId } from "@/lib/security/sanitizer";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    // 1. Fetch official system semesters created by admin
    const sysSemesters = await db
      .select({
        id: semesters.id,
        name: semesters.name,
        isCurrent: semesters.isCurrent,
        submissionDeadline: semesters.submissionDeadline,
        status: semesters.status,
      })
      .from(semesters)
      .where(eq(semesters.isSystem, true));

    // 2. Fetch user's existing semester records
    let userSemesters = await db
      .select({
        id: semesters.id,
        name: semesters.name,
        isCurrent: semesters.isCurrent,
        targetScore: semesters.targetScore,
        disciplineLevel: semesters.disciplineLevel,
        submissionDeadline: semesters.submissionDeadline,
        status: semesters.status,
        isSystem: semesters.isSystem,
        createdAt: semesters.createdAt,
      })
      .from(semesters)
      .where(and(eq(semesters.userId, session.id), eq(semesters.isSystem, false)))
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
          .select({
            id: semesters.id,
            name: semesters.name,
            isCurrent: semesters.isCurrent,
            targetScore: semesters.targetScore,
            disciplineLevel: semesters.disciplineLevel,
            submissionDeadline: semesters.submissionDeadline,
            status: semesters.status,
            isSystem: semesters.isSystem,
            createdAt: semesters.createdAt,
          })
          .from(semesters)
          .where(and(eq(semesters.userId, session.id), eq(semesters.isSystem, false)))
          .orderBy(desc(semesters.createdAt));
      }
    }

    return NextResponse.json({
      semesters: userSemesters,
      isAdmin: session.role === "admin",
    });
  } catch (error: any) {
    console.error("Semesters GET error:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải danh sách học kỳ. Vui lòng thử lại sau." },
      { status: 500 }
    );
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

    const cleanName = sanitizeText(name, 100);
    if (!cleanName) {
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
      name: cleanName,
      isCurrent: isCurrent !== undefined ? Boolean(isCurrent) : true,
      targetScore: targetScore ? Math.min(100, Math.max(0, Number(targetScore))) : 90,
      disciplineLevel: disciplineLevel || "none",
      submissionDeadline: submissionDeadline ? sanitizeText(String(submissionDeadline), 32) : null,
      status: "active",
      isSystem: true,
    });

    const [created] = await db
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
      .where(eq(semesters.id, newId))
      .limit(1);

    return NextResponse.json({
      semester: created,
      message: `Đã tạo học kỳ chính thức "${created.name}" thành công!`,
    });
  } catch (error: any) {
    console.error("Semesters POST error:", error);
    return NextResponse.json(
      { error: "Lỗi khi tạo học kỳ. Vui lòng thử lại sau." },
      { status: 500 }
    );
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

    if (!id || !isValidId(id)) {
      return NextResponse.json({ error: "Mã học kỳ không hợp lệ" }, { status: 400 });
    }

    // Verify ownership and existence (Row-level authorization)
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

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (targetScore !== undefined) {
      updateData.targetScore = Math.min(100, Math.max(0, Number(targetScore)));
    }
    if (disciplineLevel !== undefined) {
      updateData.disciplineLevel = sanitizeText(String(disciplineLevel), 32);
    }
    if (submissionDeadline !== undefined) {
      updateData.submissionDeadline = submissionDeadline ? sanitizeText(String(submissionDeadline), 32) : null;
    }
    if (status !== undefined) {
      updateData.status = sanitizeText(String(status), 32);
    }
    if (isCurrent !== undefined) {
      if (isCurrent) {
        await db
          .update(semesters)
          .set({ isCurrent: false })
          .where(and(eq(semesters.userId, session.id), eq(semesters.isSystem, false)));
      }
      updateData.isCurrent = Boolean(isCurrent);
    }

    // SECURITY: Disallow regular students from escalating isSystem status
    if (session.role !== "admin") {
      updateData.isSystem = false;
    }

    await db
      .update(semesters)
      .set(updateData)
      .where(and(eq(semesters.id, id), eq(semesters.userId, session.id)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Semesters PUT error:", error);
    return NextResponse.json(
      { error: "Lỗi khi cập nhật học kỳ. Vui lòng thử lại sau." },
      { status: 500 }
    );
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
      { error: "Chức năng xóa học kỳ chỉ dành cho Quản trị viên." },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !isValidId(id)) {
      return NextResponse.json({ error: "Mã học kỳ cần xóa không hợp lệ" }, { status: 400 });
    }

    // 1. Cascade delete all DRL records in this semester
    await db.delete(drlRecords).where(eq(drlRecords.semesterId, id));

    // 2. Delete the semester itself (admin can delete any semester)
    const deleted = await db
      .delete(semesters)
      .where(eq(semesters.id, id))
      .returning({ id: semesters.id, name: semesters.name, isCurrent: semesters.isCurrent, userId: semesters.userId });

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy học kỳ để xóa" },
        { status: 404 }
      );
    }

    // 3. If the deleted one was current for a user, activate another one
    const wasCurrent = deleted[0].isCurrent;
    const targetUserId = deleted[0].userId;
    if (wasCurrent && targetUserId) {
      const remaining = await db
        .select({ id: semesters.id })
        .from(semesters)
        .where(eq(semesters.userId, targetUserId))
        .orderBy(desc(semesters.createdAt))
        .limit(1);

      if (remaining.length > 0) {
        await db
          .update(semesters)
          .set({ isCurrent: true })
          .where(eq(semesters.id, remaining[0].id));
      }
    }

    return NextResponse.json({ success: true, message: `Đã xóa học kỳ "${deleted[0].name}" thành công!` });
  } catch (error: any) {
    console.error("Semesters DELETE error:", error);
    return NextResponse.json(
      { error: "Lỗi khi xóa học kỳ. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
