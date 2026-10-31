import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drlRecords, activityInvites, activityInviteClaims, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { randomUUID } from "crypto";
import { generateInviteCode } from "@/lib/calendar/inviteCode";
import { isValidId } from "@/lib/security/sanitizer";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { recordId, maxUses, expiresInHours } = body;

    if (!recordId || !isValidId(recordId)) {
      return NextResponse.json({ error: "Mã hoạt động không hợp lệ" }, { status: 400 });
    }

    // 1. Verify that the record exists and belongs to the authenticated user
    const [record] = await db
      .select({
        id: drlRecords.id,
        userId: drlRecords.userId,
        title: drlRecords.title,
      })
      .from(drlRecords)
      .where(and(eq(drlRecords.id, recordId), eq(drlRecords.userId, session.id)))
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { error: "Không tìm thấy hoạt động hoặc bạn không có quyền chia sẻ" },
        { status: 404 }
      );
    }

    // 2. Check if an active invite code already exists for this record
    const [existingInvite] = await db
      .select()
      .from(activityInvites)
      .where(and(eq(activityInvites.recordId, recordId), eq(activityInvites.creatorId, session.id)))
      .limit(1);

    // Calculate expiration if provided
    let expiresAt: Date | null = null;
    if (expiresInHours && typeof expiresInHours === "number" && expiresInHours > 0) {
      expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    }

    const cleanMaxUses =
      maxUses && typeof maxUses === "number" && maxUses > 0 ? Math.min(Math.floor(maxUses), 500) : null;

    if (existingInvite) {
      // Re-activate or update settings of existing invite
      const [updated] = await db
        .update(activityInvites)
        .set({
          isActive: true,
          maxUses: cleanMaxUses,
          expiresAt: expiresAt ?? existingInvite.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(activityInvites.id, existingInvite.id))
        .returning();

      return NextResponse.json({
        invite: updated,
        isExisting: true,
      });
    }

    // 3. Generate unique invite code with collision fallback
    let inviteCode = generateInviteCode();
    for (let attempts = 0; attempts < 5; attempts++) {
      const [existing] = await db
        .select({ id: activityInvites.id })
        .from(activityInvites)
        .where(eq(activityInvites.code, inviteCode))
        .limit(1);
      if (!existing) break;
      inviteCode = generateInviteCode();
    }

    const inviteId = randomUUID();
    const [newInvite] = await db
      .insert(activityInvites)
      .values({
        id: inviteId,
        code: inviteCode,
        recordId: record.id,
        creatorId: session.id,
        maxUses: cleanMaxUses,
        usesCount: 0,
        expiresAt,
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      invite: newInvite,
      isExisting: false,
    });
  } catch (error: any) {
    console.error("POST /api/calendar/invites error:", error);
    return NextResponse.json({ error: "Lỗi khi tạo mã mời chia sẻ" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const recordId = searchParams.get("recordId");

  if (!recordId || !isValidId(recordId)) {
    return NextResponse.json({ error: "Mã hoạt động không hợp lệ" }, { status: 400 });
  }

  try {
    // 1. Fetch invite created for this record by this user
    const [invite] = await db
      .select()
      .from(activityInvites)
      .where(and(eq(activityInvites.recordId, recordId), eq(activityInvites.creatorId, session.id)))
      .limit(1);

    if (!invite) {
      return NextResponse.json({ invite: null, claims: [] });
    }

    // 2. Fetch all claims (peers who accepted the code)
    const claims = await db
      .select({
        id: activityInviteClaims.id,
        claimedAt: activityInviteClaims.claimedAt,
        userId: users.id,
        username: users.username,
        fullName: users.fullName,
        className: users.className,
      })
      .from(activityInviteClaims)
      .innerJoin(users, eq(activityInviteClaims.userId, users.id))
      .where(eq(activityInviteClaims.inviteId, invite.id))
      .orderBy(desc(activityInviteClaims.claimedAt));

    return NextResponse.json({ invite, claims });
  } catch (error: any) {
    console.error("GET /api/calendar/invites error:", error);
    return NextResponse.json({ error: "Lỗi khi tải thông tin mã mời" }, { status: 500 });
  }
}

