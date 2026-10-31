import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activityInvites } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { isValidId } from "@/lib/security/sanitizer";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await props.params;
  if (!id || !isValidId(id)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { isActive, maxUses, expiresInHours } = body;

    // Verify ownership
    const [invite] = await db
      .select()
      .from(activityInvites)
      .where(and(eq(activityInvites.id, id), eq(activityInvites.creatorId, session.id)))
      .limit(1);

    if (!invite) {
      return NextResponse.json(
        { error: "Không tìm thấy mã mời hoặc bạn không có quyền sửa" },
        { status: 404 }
      );
    }

    const updates: Partial<typeof activityInvites.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (typeof isActive === "boolean") {
      updates.isActive = isActive;
    }

    if (maxUses !== undefined) {
      if (maxUses === null) {
        updates.maxUses = null;
      } else if (typeof maxUses === "number" && Number.isInteger(maxUses) && maxUses >= 1) {
        updates.maxUses = Math.min(maxUses, 500);
      } else {
        return NextResponse.json(
          { error: "Số lượt tham gia phải là số nguyên dương từ 1 trở lên" },
          { status: 400 }
        );
      }
    }

    if (expiresInHours !== undefined) {
      if (expiresInHours === null) {
        updates.expiresAt = null;
      } else if (
        typeof expiresInHours === "number" &&
        Number.isFinite(expiresInHours) &&
        expiresInHours > 0 &&
        expiresInHours <= 8760
      ) {
        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
        if (Number.isNaN(expiresAt.getTime())) {
          return NextResponse.json({ error: "Thời hạn hiệu lực không hợp lệ" }, { status: 400 });
        }
        updates.expiresAt = expiresAt;
      } else {
        return NextResponse.json(
          { error: "Thời hạn hiệu lực không hợp lệ" },
          { status: 400 }
        );
      }
    }

    const [updated] = await db
      .update(activityInvites)
      .set(updates)
      .where(eq(activityInvites.id, id))
      .returning();

    return NextResponse.json({ invite: updated });
  } catch (error: any) {
    console.error("PATCH /api/calendar/invites/[id] error:", error);
    return NextResponse.json({ error: "Lỗi khi cập nhật mã mời" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await props.params;
  if (!id || !isValidId(id)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  try {
    const [invite] = await db
      .select({ id: activityInvites.id })
      .from(activityInvites)
      .where(and(eq(activityInvites.id, id), eq(activityInvites.creatorId, session.id)))
      .limit(1);

    if (!invite) {
      return NextResponse.json(
        { error: "Không tìm thấy mã mời hoặc bạn không có quyền xoá" },
        { status: 404 }
      );
    }

    await db.delete(activityInvites).where(eq(activityInvites.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/calendar/invites/[id] error:", error);
    return NextResponse.json({ error: "Lỗi khi xoá mã mời" }, { status: 500 });
  }
}
