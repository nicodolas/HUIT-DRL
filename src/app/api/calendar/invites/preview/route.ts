import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activityInvites, drlRecords, users, activityInviteClaims } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { normalizeInviteCode } from "@/lib/calendar/inviteCode";
import { checkRateLimit } from "@/lib/security/rateLimit";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  // Rate limit: 30 preview queries per minute per user
  const rateLimitKey = `preview_invite_${session.id}`;
  const rateCheck = checkRateLimit(rateLimitKey, 30, 60 * 1000);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: "Bạn thao tác quá nhanh. Vui lòng chờ 1 phút rồi thử lại." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rateCheck.resetMs / 1000).toString(),
        },
      }
    );

  const { searchParams } = new URL(req.url);
  const rawCode = searchParams.get("code");

  if (!rawCode) {
    return NextResponse.json({ error: "Vui lòng nhập mã mời" }, { status: 400 });
  }

  const code = normalizeInviteCode(rawCode);

  try {
    // 1. Fetch invite, record, and creator info
    const [result] = await db
      .select({
        inviteId: activityInvites.id,
        code: activityInvites.code,
        creatorId: activityInvites.creatorId,
        maxUses: activityInvites.maxUses,
        usesCount: activityInvites.usesCount,
        expiresAt: activityInvites.expiresAt,
        isActive: activityInvites.isActive,
        // Record fields
        recordId: drlRecords.id,
        title: drlRecords.title,
        type: drlRecords.type,
        category: drlRecords.category,
        points: drlRecords.points,
        quantity: drlRecords.quantity,
        occurredAt: drlRecords.occurredAt,
        note: drlRecords.note,
        // Creator fields
        creatorFullName: users.fullName,
        creatorUsername: users.username,
        creatorFaculty: users.faculty,
      })
      .from(activityInvites)
      .innerJoin(drlRecords, eq(activityInvites.recordId, drlRecords.id))
      .innerJoin(users, eq(activityInvites.creatorId, users.id))
      .where(eq(activityInvites.code, code))
      .limit(1);

    if (!result) {
      return NextResponse.json(
        { error: "Mã mời không tồn tại hoặc đã bị thu hồi" },
        { status: 404 }
      );
    }

    if (!result.isActive) {
      return NextResponse.json(
        { error: "Mã mời này hiện đang bị tạm khóa bởi người tạo" },
        { status: 400 }
      );
    }

    if (result.expiresAt && new Date() > new Date(result.expiresAt)) {
      return NextResponse.json(
        { error: "Mã mời này đã hết thời gian hiệu lực" },
        { status: 400 }
      );
    }

    if (result.maxUses !== null && result.usesCount >= result.maxUses) {
      return NextResponse.json(
        { error: "Mã mời này đã đủ số lượt tham gia tối đa" },
        { status: 400 }
      );
    }

    const isCreator = result.creatorId === session.id;

    // Check if the current user already claimed this invite
    const [existingClaim] = await db
      .select({ id: activityInviteClaims.id })
      .from(activityInviteClaims)
      .where(
        and(
          eq(activityInviteClaims.inviteId, result.inviteId),
          eq(activityInviteClaims.userId, session.id)
        )
      )
      .limit(1);

    const isAlreadyClaimed = !!existingClaim;

    return NextResponse.json({
      valid: true,
      invite: {
        id: result.inviteId,
        code: result.code,
        maxUses: result.maxUses,
        usesCount: result.usesCount,
        expiresAt: result.expiresAt,
        remainingUses:
          result.maxUses !== null ? Math.max(0, result.maxUses - result.usesCount) : null,
      },
      record: {
        title: result.title,
        category: result.category,
        points: result.points,
        quantity: result.quantity,
        occurredAt: result.occurredAt,
        note: result.note,
      },
      creator: {
        fullName: result.creatorFullName,
        username: result.creatorUsername,
        faculty: result.creatorFaculty,
      },
      isCreator,
      isAlreadyClaimed,
    });
  } catch (error: any) {
    console.error("GET /api/calendar/invites/preview error:", error);
    return NextResponse.json({ error: "Lỗi khi kiểm tra mã mời" }, { status: 500 });
  }
}
