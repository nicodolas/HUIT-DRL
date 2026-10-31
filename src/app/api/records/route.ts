import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drlRecords, semesters } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { calculateSemesterScore, analyzeGoalGap } from "@/lib/drl/calculator";
import { DisciplineLevel } from "@/lib/drl/rules";
import { randomUUID } from "crypto";
import {
  isValidEvidenceUrl,
  isValidId,
  sanitizeTitle,
  sanitizeNote,
  validateCategory,
  validatePoints,
  validateQuantity,
} from "@/lib/security/sanitizer";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const semesterId = searchParams.get("semesterId");

  if (!semesterId || !isValidId(semesterId)) {
    return NextResponse.json({ error: "Vui lòng chọn học kỳ hợp lệ" }, { status: 400 });
  }

  try {
    // 1. Verify semester belongs to the authenticated user (Row-level isolation / IDOR prevention)
    const [semester] = await db
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
      .where(and(eq(semesters.id, semesterId), eq(semesters.userId, session.id)))
      .limit(1);

    if (!semester) {
      return NextResponse.json({ error: "Không tìm thấy học kỳ hoặc bạn không có quyền truy cập" }, { status: 404 });
    }

    // 2. Fetch records strictly scoped to this user and semester
    const records = await db
      .select({
        id: drlRecords.id,
        userId: drlRecords.userId,
        semesterId: drlRecords.semesterId,
        presetId: drlRecords.presetId,
        category: drlRecords.category,
        title: drlRecords.title,
        type: drlRecords.type,
        points: drlRecords.points,
        quantity: drlRecords.quantity,
        occurredAt: drlRecords.occurredAt,
        note: drlRecords.note,
        evidenceUrl: drlRecords.evidenceUrl,
        auditStatus: drlRecords.auditStatus,
        auditComment: drlRecords.auditComment,
        originInviteCode: drlRecords.originInviteCode,
        originCreatorUsername: drlRecords.originCreatorUsername,
        createdAt: drlRecords.createdAt,
        updatedAt: drlRecords.updatedAt,
      })
      .from(drlRecords)
      .where(and(eq(drlRecords.semesterId, semesterId), eq(drlRecords.userId, session.id)))
      .orderBy(desc(drlRecords.createdAt));

    // 3. Compute score and goal progress
    const scoreSummary = calculateSemesterScore(
      records as any,
      (semester.disciplineLevel as DisciplineLevel) || "none"
    );

    const goalAnalysis = analyzeGoalGap(
      scoreSummary.totalScore,
      semester.targetScore || 90,
      scoreSummary.categories
    );

    const auditSummary = {
      total: records.length,
      valid: records.filter((r) => r.auditStatus === "valid").length,
      pendingReview: records.filter((r) => r.auditStatus === "pending_review").length,
      missing: records.filter((r) => r.auditStatus === "missing" || (!r.evidenceUrl && r.auditStatus !== "valid")).length,
      rejected: records.filter((r) => r.auditStatus === "rejected").length,
    };

    return NextResponse.json({
      semester,
      records,
      scoreSummary,
      goalAnalysis,
      auditSummary,
    });
  } catch (error: any) {
    console.error("Records GET error:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải dữ liệu hoạt động. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { semesterId, presetId, category, title, type, points, quantity, occurredAt, note, evidenceUrl, auditStatus, auditComment } = body;

    if (!semesterId || !isValidId(semesterId)) {
      return NextResponse.json({ error: "Mã học kỳ không hợp lệ." }, { status: 400 });
    }

    if (presetId && !isValidId(presetId)) {
      return NextResponse.json({ error: "Mã tiêu chí không hợp lệ." }, { status: 400 });
    }

    const cleanTitle = sanitizeTitle(title);
    if (!cleanTitle) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên hoạt động rèn luyện." },
        { status: 400 }
      );
    }

    const validCat = validateCategory(category);
    if (!validCat) {
      return NextResponse.json(
        { error: "Tiêu chí rèn luyện không hợp lệ (phải từ Tiêu chí 1 đến 5)." },
        { status: 400 }
      );
    }

    const { valid: isPointsValid, value: validatedPoints } = validatePoints(points);
    if (!isPointsValid) {
      return NextResponse.json(
        { error: "Điểm số không hợp lệ (chỉ chấp nhận từ -100 đến 100 điểm)." },
        { status: 400 }
      );
    }

    if (evidenceUrl && !isValidEvidenceUrl(evidenceUrl)) {
      return NextResponse.json(
        { error: "Liên kết minh chứng không an toàn hoặc không đúng định dạng HTTP/HTTPS." },
        { status: 400 }
      );
    }

    // Verify semester belongs to user
    const [semester] = await db
      .select({ id: semesters.id })
      .from(semesters)
      .where(and(eq(semesters.id, semesterId), eq(semesters.userId, session.id)))
      .limit(1);

    if (!semester) {
      return NextResponse.json({ error: "Học kỳ không hợp lệ hoặc bạn không có quyền truy cập" }, { status: 403 });
    }

    const recordId = randomUUID();
    const finalQuantity = validateQuantity(quantity);
    const finalNote = sanitizeNote(note);

    const validAuditStatuses = ["missing", "pending_review", "valid", "rejected"];
    const finalAuditStatus = auditStatus && validAuditStatuses.includes(auditStatus)
      ? auditStatus
      : evidenceUrl && String(evidenceUrl).trim()
        ? "pending_review"
        : "missing";

    await db.insert(drlRecords).values({
      id: recordId,
      userId: session.id,
      semesterId,
      presetId: presetId ? String(presetId).trim() : null,
      category: validCat,
      title: cleanTitle,
      type: type || (Number(validatedPoints) >= 0 ? "add" : "deduct"),
      points: validatedPoints,
      quantity: finalQuantity,
      occurredAt: occurredAt ? String(occurredAt).trim().slice(0, 32) : null,
      note: finalNote,
      evidenceUrl: evidenceUrl ? String(evidenceUrl).trim() : null,
      auditStatus: finalAuditStatus,
      auditComment: auditComment ? sanitizeNote(auditComment) : null,
    });

    return NextResponse.json({ message: "Đã thêm hoạt động!", recordId });
  } catch (error: any) {
    console.error("Records POST error:", error);
    return NextResponse.json(
      { error: "Lỗi khi lưu hoạt động. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
