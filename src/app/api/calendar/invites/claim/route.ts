import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drlRecords, activityInvites, activityInviteClaims, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { normalizeInviteCode } from "@/lib/calendar/inviteCode";
import { isValidId } from "@/lib/security/sanitizer";

// In-memory rate limiting map for claim attempts (max 10 claims per IP/User per 5 minutes)
const claimRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number = 10, windowMs: number = 5 * 60 * 1000): boolean {
  const now = Date.now();
  const record = claimRateLimit.get(key);
  if (!record || now > record.resetAt) {
    claimRateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count += 1;
  return true;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  // Rate limit by user session
  if (!checkRateLimit(`claim_${session.id}`)) {
    return NextResponse.json(
      { error: "Thao tác quá nhanh. Vui lòng thử lại sau 5 phút." },
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
        title: drlRecords.title,
        criteriaId: drlRecords.criteriaId,
        category: drlRecords.category,
        points: drlRecords.points,
        date: drlRecords.date,
        description: drlRecords.description,
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

    // Determine target semester ID
    const targetSemesterId = (semesterId && isValidId(semesterId))
      ? semesterId
      : inviteData.semesterId;

    // Concurrency-safe atomic slot reservation without db.transaction (for neon-http driver compatibility)
    // Decrement slot / increment uses_count with conditional WHERE:
    // WHERE is_active = true AND (max_uses IS NULL OR uses_count < max_uses)
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
          sql`(${activityInvites.maxUses} IS NULL OR ${activityInvites.usesCount} < ${activityInvites.maxUses})`
        )
      )
      .returning({ updatedId: activityInvites.id });

    if (!updateResult || updateResult.length === 0) {
      return NextResponse.json(
        { error: "Mã mời vừa hết lượt tham gia hoặc đã bị đóng. Vui lòng kiểm tra lại." },
        { status: 400 }
      );
    }

    let clonedRecord;
    try {
      // Create new record for the current user
      const [newRec] = await db
        .insert(drlRecords)
        .values({
          userId: session.id,
          semesterId: targetSemesterId,
          criteriaId: inviteData.criteriaId,
          title: inviteData.title,
          category: inviteData.category,
          points: inviteData.points,
          date: inviteData.date,
          description: inviteData.description
            ? `${inviteData.description} (Được chia sẻ bởi @${inviteData.creatorUsername})`
            : `Được chia sẻ bởi @${inviteData.creatorUsername}`,
          auditStatus: "missing", // Claimed activity starts with missing evidence until the user uploads
          originInviteCode: inviteData.code,
          originCreatorUsername: inviteData.creatorUsername,
        })
        .returning();

      clonedRecord = newRec;

      // Record the claim
      await db.insert(activityInviteClaims).values({
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
