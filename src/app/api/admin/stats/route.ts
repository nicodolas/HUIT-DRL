import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users, semesters, drlRecords } from "@/lib/db/schema";
import { sql, eq, and, isNotNull, ne } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Quyền truy cập bị từ chối: Chỉ dành cho Quản trị viên" }, { status: 403 });
  }

  try {
    // 1. User stats
    const [userCounts] = await db
      .select({
        totalUsers: sql<number>`count(*)::int`,
        totalStudents: sql<number>`count(case when ${users.role} = 'user' then 1 end)::int`,
        totalAdmins: sql<number>`count(case when ${users.role} = 'admin' then 1 end)::int`,
      })
      .from(users);

    // 2. Semester stats
    const [semesterCounts] = await db
      .select({
        totalSemesters: sql<number>`count(*)::int`,
        totalSystemSemesters: sql<number>`count(case when ${semesters.isSystem} = true then 1 end)::int`,
      })
      .from(semesters);

    // 3. DRL Records & Evidence stats
    const [recordCounts] = await db
      .select({
        totalRecords: sql<number>`count(*)::int`,
        totalEvidence: sql<number>`count(case when ${drlRecords.evidenceUrl} is not null and ${drlRecords.evidenceUrl} != '' then 1 end)::int`,
        evidencePending: sql<number>`count(case when ${drlRecords.auditStatus} = 'pending_review' and ${drlRecords.evidenceUrl} is not null and ${drlRecords.evidenceUrl} != '' then 1 end)::int`,
        evidenceValid: sql<number>`count(case when ${drlRecords.auditStatus} = 'valid' then 1 end)::int`,
        evidenceRejected: sql<number>`count(case when ${drlRecords.auditStatus} = 'rejected' then 1 end)::int`,
      })
      .from(drlRecords);

    // 4. Faculty distribution
    const facultyDistribution = await db
      .select({
        faculty: sql<string>`coalesce(${users.faculty}, 'Chưa phân khoa')`,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .groupBy(sql`coalesce(${users.faculty}, 'Chưa phân khoa')`)
      .orderBy(sql`count(*) desc`);

    return NextResponse.json({
      success: true,
      stats: {
        users: userCounts || { totalUsers: 0, totalStudents: 0, totalAdmins: 0 },
        semesters: semesterCounts || { totalSemesters: 0, totalSystemSemesters: 0 },
        records: recordCounts || {
          totalRecords: 0,
          totalEvidence: 0,
          evidencePending: 0,
          evidenceValid: 0,
          evidenceRejected: 0,
        },
        facultyDistribution: facultyDistribution || [],
      },
    });
  } catch (error) {
    console.error("GET /api/admin/stats error:", error);
    return NextResponse.json({ error: "Lỗi khi lấy số liệu thống kê hệ thống" }, { status: 500 });
  }
}

