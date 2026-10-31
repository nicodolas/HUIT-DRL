import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drlRecords, activityInvites, activityInviteClaims, users, semesters } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
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

    if (!rawCode || typeof rawCode !== "string" || !rawCode.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập mã mời" }, { status: 400 });
    }
    const code = normalizeInviteCode(rawCode);

    // 1. Fetch invite, source record, and creator info
    const [inviteData] = await db
      .select({
        inviteId: activityInvites.id,
        code: activityInvites.code,
        creatorId: activityInvites.creatorId,
        isActive: activityInvites.isActive,
        maxUses: activityInvites.maxUses,
        usesCount: activityInvites.usesCount,
        expiresAt: activityInvites.expiresAt,
        recordId: activityInvites.recordId,
        presetId: drlRecords.presetId,
        title: drlRecords.title,
        type: drlRecords.type,
        category: drlRecords.category,
        points: drlRecords.points,
        quantity: drlRecords.quantity,
        occurredAt: drlRecords.occurredAt,
        note: drlRecords.note,
        semesterId: drlRecords.semesterId,
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
        { error: "Mã mời này hiện đang tạm đóng bởi người chia sẻ" },
        { status: 400 }
      );
    }

    if (inviteData.expiresAt && new Date(inviteData.expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Mã mời này đã hết hạn sử dụng" },
        { status: 400 }
      );
    }

    if (inviteData.maxUses !== null && inviteData.usesCount >= inviteData.maxUses) {
      return NextResponse.json(
        { error: "Mã mời đã đạt tối đa số lượt tham gia quy định" },
        { status: 400 }
      );
    }

    if (inviteData.creatorId === session.id) {
      return NextResponse.json(
        { error: "Bạn chính là người tạo mã mời này, không cần phải nhập mã của chính mình!" },
        { status: 400 }
      );
    }

    // Check duplicate claim by this user
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
        { error: "Bạn đã nhận hoạt động này từ mã mời trước đó rồi!" },
        { status: 400 }
      );
    }

    // Determine target semester ID for the claiming user
    let targetSemesterId = semesterId;
    if (targetSemesterId && isValidId(targetSemesterId)) {
      // Verify semester belongs to current user
      const [userSem] = await db
        .select({ id: semesters.id })
        .from(semesters)
        .where(and(eq(semesters.id, targetSemesterId), eq(semesters.userId, session.id)))
        .limit(1);

      if (!userSem) {
        targetSemesterId = null;
      }
    } else {
      targetSemesterId = null;
    }

    if (!targetSemesterId) {
      // Find recipient's current active semester
      const [currentSemester] = await db
        .select({ id: semesters.id })
        .from(semesters)
        .where(and(eq(semesters.userId, session.id), eq(semesters.isCurrent, true)))
        .limit(1);

      if (currentSemester) {
        targetSemesterId = currentSemester.id;
      } else {
        // Fallback to recipient's latest semester
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

    // Concurrency-safe atomic slot reservation without db.transaction (for neon-http driver compatibility)
    const updateResult = await db
      .update(activityInvites)
      .set({
        usesCount: sql`${activityInvites.usesCount} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(activityInvites.id, inviteData.inviteId),
          eq(activityInvites.isActive, true),
          sql`(${activityInvites.expiresAt} IS NULL OR ${activityInvites.expiresAt} > NOW()) AND (${activityInvites.maxUses} IS NULL OR ${activityInvites.usesCount} < ${activityInvites.maxUses})`
        )
      )
      .returning({ updatedId: activityInvites.id });

    if (!updateResult || updateResult.length === 0) {
      return NextResponse.json(
        { error: "Mã mời vừa hết lượt tham gia hoặc đã bị đóng. Vui lòng kiểm tra lại." },
        { status: 400 }
      );
    }

    const newRecordId = randomUUID();
    let clonedRecord;
    try {
      // Create new record for the current user
      const [newRec] = await db
        .insert(drlRecords)
        .values({
          id: newRecordId,
          userId: session.id,
          semesterId: targetSemesterId,
          presetId: inviteData.presetId,
          category: inviteData.category,
          title: inviteData.title,
          type: inviteData.type || "add",
          points: inviteData.points,
          quantity: inviteData.quantity || 1,
          occurredAt: inviteData.occurredAt,
          note: inviteData.note
            ? `${inviteData.note} (Được chia sẻ bởi @${inviteData.creatorUsername})`
            : `Được chia sẻ bởi @${inviteData.creatorUsername}`,
          evidenceUrl: null, // individual submission needed
          auditStatus: "missing",
          originInviteCode: inviteData.code,
          originCreatorUsername: inviteData.creatorUsername,
        })
        .returning();

      clonedRecord = newRec;

      // Record the claim
      await db.insert(activityInviteClaims).values({
        id: randomUUID(),
        inviteId: inviteData.inviteId,
        userId: session.id,
        claimedRecordId: clonedRecord.id,
      });
    } catch (insertError) {
      // Rollback slot reservation if record insertion failed
      console.error("Claim insertion failed, reverting usesCount:", insertError);
      await db
        .update(activityInvites)
        .set({
          usesCount: sql`GREATEST(${activityInvites.usesCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(activityInvites.id, inviteData.inviteId));

      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: `Đã thêm thành công hoạt động "${inviteData.title}" vào lịch rèn luyện của bạn!`,
      record: clonedRecord,
    });
  } catch (error: any) {
    console.error("POST /api/calendar/invites/claim error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi máy chủ khi nhận hoạt động" },
      { status: 500 }
    );
  }
}
