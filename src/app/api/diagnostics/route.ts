import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users, semesters, drlRecords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const startTime = Date.now();

    // 1. Database latency test using typed Drizzle query builder (100% Parameterized)
    await db.select({ id: users.id }).from(users).limit(1);
    const latencyMs = Date.now() - startTime;

    // 2. Fetch User Semesters and Records Stats
    const userSemesters = await db
      .select({
        id: semesters.id,
        name: semesters.name,
        isCurrent: semesters.isCurrent,
      })
      .from(semesters)
      .where(eq(semesters.userId, user.id));

    const userRecords = await db
      .select({
        id: drlRecords.id,
        semesterId: drlRecords.semesterId,
        category: drlRecords.category,
      })
      .from(drlRecords)
      .where(eq(drlRecords.userId, user.id));

    // 3. Integrity Check: Orphan records detection
    const validSemesterIds = new Set(userSemesters.map((s) => s.id));
    const orphanedRecords = userRecords.filter((r) => !validSemesterIds.has(r.semesterId));

    // 4. Integrity Check: Categories validity (must be 1 to 5)
    const invalidCategoryRecords = userRecords.filter(
      (r) => !r.category || r.category < 1 || r.category > 5
    );

    // 5. Integrity Check: Current semester presence
    const currentSemesters = userSemesters.filter((s) => s.isCurrent);
    const hasCurrentSemester = currentSemesters.length >= 1;

    // Build diagnostic checks report
    const checks = [
      {
        name: "Kết nối cơ sở dữ liệu Neon PostgreSQL",
        status: latencyMs < 500 ? "pass" : "warning",
        message: `Phản hồi truy vấn: ${latencyMs}ms`,
      },
      {
        name: "Kiểm tra bản ghi mồ côi (Orphan records)",
        status: orphanedRecords.length === 0 ? "pass" : "fail",
        message:
          orphanedRecords.length === 0
            ? "Tất cả bản ghi đều gắn với học kỳ hợp lệ"
            : `Phát hiện ${orphanedRecords.length} bản ghi không thuộc học kỳ nào`,
      },
      {
        name: "Tính hợp lệ của 5 tiêu chí QĐ 3385",
        status: invalidCategoryRecords.length === 0 ? "pass" : "fail",
        message:
          invalidCategoryRecords.length === 0
            ? "Tất cả bản ghi thuộc Tiêu chí 1 đến 5 hợp lệ"
            : `Phát hiện ${invalidCategoryRecords.length} bản ghi sai tiêu chí`,
      },
      {
        name: "Thiết lập học kỳ hiện tại",
        status: hasCurrentSemester ? "pass" : "warning",
        message: hasCurrentSemester
          ? `Học kỳ đang chọn: ${currentSemesters[0]?.name || "Đã thiết lập"}`
          : "Chưa đánh dấu học kỳ hiện tại",
      },
    ];

    const isSystemHealthy = checks.every((c) => c.status !== "fail");

    return NextResponse.json({
      status: isSystemHealthy ? "healthy" : "issues_detected",
      timestamp: new Date().toISOString(),
      latencyMs,
      stats: {
        userId: user.id,
        username: user.username,
        totalSemesters: userSemesters.length,
        totalRecords: userRecords.length,
        orphanedCount: orphanedRecords.length,
      },
      checks,
    });
  } catch (error: any) {
    console.error("Diagnostics error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Lỗi chuẩn đoán hệ thống. Vui lòng thử lại sau.",
      },
      { status: 500 }
    );
  }
}
