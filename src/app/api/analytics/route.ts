import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { semesters, drlRecords } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { calculateSemesterScore } from "@/lib/drl/calculator";
import { DisciplineLevel, determineRating } from "@/lib/drl/rules";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const userSemesters = await db
      .select()
      .from(semesters)
      .where(eq(semesters.userId, session.id))
      .orderBy(desc(semesters.createdAt));

    if (userSemesters.length === 0) {
      return NextResponse.json({
        hasData: false,
        totalSemesters: 0,
        cumulativeAverage: 0,
        cumulativeRating: null,
        semesterBreakdown: [],
      });
    }

    const allRecords = await db
      .select()
      .from(drlRecords)
      .where(eq(drlRecords.userId, session.id));

    let sumScores = 0;
    const semesterBreakdown = userSemesters.map((sem) => {
      const recordsForSem = allRecords.filter((r) => r.semesterId === sem.id);
      const summary = calculateSemesterScore(
        recordsForSem,
        (sem.disciplineLevel as DisciplineLevel) || "none"
      );
      sumScores += summary.totalScore;

      return {
        id: sem.id,
        name: sem.name,
        isCurrent: sem.isCurrent,
        targetScore: sem.targetScore,
        disciplineLevel: sem.disciplineLevel,
        totalScore: summary.totalScore,
        rating: summary.rating,
        recordsCount: recordsForSem.length,
        categories: summary.categories,
      };
    });

    const cumulativeAverage = Math.round((sumScores / userSemesters.length) * 10) / 10;
    const cumulativeRating = determineRating(cumulativeAverage, "none");

    return NextResponse.json({
      hasData: true,
      totalSemesters: userSemesters.length,
      totalActivities: allRecords.length,
      cumulativeAverage,
      cumulativeRating,
      semesterBreakdown,
    });
  } catch (error: any) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Lỗi tải thống kê: " + error.message }, { status: 500 });
  }
}

