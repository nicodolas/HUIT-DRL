import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  activityInvites,
  drlRecords,
  users,
  activityInviteClaims,
  semesters,
} from "@/lib/db/schema";
import { eq, and, desc, sql, or, isNull, lt } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { randomUUID } from "crypto";
import { normalizeInviteCode } from "@/lib/calendar/inviteCode";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { isValidId } from "@/lib/security/sanitizer";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  // Rate limit: 15 claims per minute per user
  const rateLimitKey = `claim_invite_${session.id}`;
  const rateCheck = checkRateLimit(rateLimitKey, 15, 60 * 1000);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: "Bạn thao tác quá nhanh. Vui lòng chờ 1 phút rồi thử lại." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { code: rawCode, semesterId } = body;

    if (!rawCode) {
      return NextResponse.json({ error: "Vui lòng nhập mã mời" }, { status: 400 });
    }

    if (typeof rawCode !== "string" || !rawCode.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập mã mời" }, { status: 400 });
    }
    const code = normalizeInviteCode(rawCode);

    // 1. Fetch invite, source record, and creator info
    const [inviteData] = await db
      .select({
        inviteId: activityInvites.id,
        code: activityInvites.code,
        creatorId: activityInvites.creatorId,
        maxUses: activityInvites.maxUses,
        usesCount: activityInvites.usesCount,
        expiresAt: activityInvites.expiresAt,
        isActive: activityInvites.isActive,
        // Source Record fields
        recordId: drlRecords.id,
        title: drlRecords.title,
        type: drlRecords.type,
        category: drlRecords.category,
        points: drlRecords.points,
        quantity: drlRecords.quantity,
        occurredAt: drlRecords.occurredAt,
        note: drlRecords.note,
        // Creator fields
        creatorUsername: users.username,
        creatorFullName: users.fullName,
      })
      .from(activityInvites)
      .innerJoin(drlRecords, eq(activityInvites.recordId, drlRecords.id))
      .innerJoin(users, eq(activityInvites.creatorId, users.id))
      .where(eq(activityInvites.code, code))
      .limit(1);

    if (!inviteData) {
      return NextResponse.json(
        { error: "Mã mời không tồn tại hoặc đã bị thu hồi" },
        { status: 404 }
      );
    }

    if (!inviteData.isActive) {
      return NextResponse.json(
        { error: "Mã mời này hiện đang bị tạm khóa bởi người tạo" },
        { status: 400 }
      );
    }

    if (inviteData.expiresAt && new Date() > new Date(inviteData.expiresAt)) {
      return NextResponse.json(
        { error: "Mã mời này đã hết thời gian hiệu lực" },
        { status: 400 }
      );
    }

    if (inviteData.maxUses !== null && inviteData.usesCount >= inviteData.maxUses) {
      return NextResponse.json(
        { error: "Mã mời này đã đủ số lượt tham gia tối đa" },
        { status: 400 }
      );
    }

    // 2. Prevent self-claiming
    if (inviteData.creatorId === session.id) {
      return NextResponse.json(
        { error: "Bạn không thể tự nhận mã mời do chính bạn tạo" },
        { status: 400 }
      );
    }

    // 3. Prevent duplicate claim by same user
    const [existingClaim] = await db
      .select({ id: activityInviteClaims.id })
      .from(activityInviteClaims)
      .where(
        and(
          eq(activityInviteClaims.inviteId, inviteData.inviteId),
          eq(activityInviteClaims.userId, session.id)
        )
      )
      .limit(1);

    if (existingClaim) {
      return NextResponse.json(
        { error: "Bạn đã thêm hoạt động này vào sổ rèn luyện trước đó rồi" },
        { status: 400 }
      );
    }

    // 4. Resolve target semester for session.id
    let targetSemesterId = semesterId;
    if (targetSemesterId && !isValidId(targetSemesterId)) {
      targetSemesterId = undefined;
    }

    if (!targetSemesterId) {
      const [currentSemester] = await db
        .select({ id: semesters.id })
        .from(semesters)
        .where(and(eq(semesters.userId, session.id), eq(semesters.isCurrent, true)))
        .limit(1);

      if (currentSemester) {
        targetSemesterId = currentSemester.id;
      } else {
        const [latestSemester] = await db
          .select({ id: semesters.id })
          .from(semesters)
          .where(eq(semesters.userId, session.id))
          .orderBy(desc(semesters.createdAt))
          .limit(1);
        targetSemesterId = latestSemester?.id;
      }
    }

    if (!targetSemesterId) {
      return NextResponse.json(
        { error: "Hệ thống chưa tìm thấy học kỳ của bạn để lưu hoạt động" },
        { status: 400 }
      );
    }

    // 5. Reserve slot atomically via atomic conditional update
    const [updatedInvite] = await db
      .update(activityInvites)
      .set({
        usesCount: sql`${activityInvites.usesCount} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(activityInvites.id, inviteData.inviteId),
          eq(activityInvites.isActive, true),
          or(
            isNull(activityInvites.maxUses),
            lt(activityInvites.usesCount, activityInvites.maxUses)
          )
        )
      )
      .returning({ id: activityInvites.id });

    if (!updatedInvite) {
      return NextResponse.json(
        { error: "Mã mời đã đủ số lượt tham gia tối đa hoặc đã bị tạm khóa" },
        { status: 400 }
      );
    }

    // 6. Insert cloned record into recipient's ledger
    const newRecordId = randomUUID();
    const [clonedRecord] = await db
      .insert(drlRecords)
      .values({
        id: newRecordId,
        userId: session.id,
        semesterId: targetSemesterId,
        category: inviteData.category,
        title: inviteData.title,
        type: inviteData.type || "add",
        points: inviteData.points,
        quantity: inviteData.quantity || 1,
        occurredAt: inviteData.occurredAt,
        note: inviteData.note,
        evidenceUrl: null, // individual submission needed
        auditStatus: "missing",
        originInviteCode: inviteData.code,
        originCreatorUsername: inviteData.creatorUsername,
      })
      .returning();

    // 7. Record the claim
    await db.insert(activityInviteClaims).values({
      id: randomUUID(),
      inviteId: inviteData.inviteId,
      userId: session.id,
      claimedRecordId: newRecordId,
    });

    return NextResponse.json({
      success: true,
      message: `Đã thêm thành công "${inviteData.title}" từ @${inviteData.creatorUsername} vào lịch trình của bạn`,
      record: clonedRecord,
    });
  } catch (error: any) {
    console.error("POST /api/calendar/invites/claim error:", error);
    return NextResponse.json({ error: "Lỗi khi nhận hoạt động từ mã mời" }, { status: 500 });
  }
}
