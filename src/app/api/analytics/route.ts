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
      .select({
        id: semesters.id,
        name: semesters.name,
        isCurrent: semesters.isCurrent,
        targetScore: semesters.targetScore,
        disciplineLevel: semesters.disciplineLevel,
      })
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
      .select({
        id: drlRecords.id,
        semesterId: drlRecords.semesterId,
        category: drlRecords.category,
        type: drlRecords.type,
        points: drlRecords.points,
        quantity: drlRecords.quantity,
      })
      .from(drlRecords)
      .where(eq(drlRecords.userId, session.id));

    let sumScores = 0;
    const semesterBreakdown = userSemesters.map((sem) => {
      const recordsForSem = allRecords.filter((r) => r.semesterId === sem.id);
      const summary = calculateSemesterScore(
        recordsForSem as any,
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
    let cumulativeRating = determineRating(cumulativeAverage, "none");

    // Điều 12 QĐ 3385: Hạ 1 bậc xếp loại toàn khóa nếu từng bị kỷ luật Cảnh cáo trở lên
    const hasGraduationDisciplinePenalty = userSemesters.some(
      (s) => s.disciplineLevel === "canh_cao" || s.disciplineLevel === "dinh_chi"
    );

    if (hasGraduationDisciplinePenalty) {
      if (cumulativeRating.code === "xuat_sac") {
        cumulativeRating = {
          code: "tot",
          label: "Tốt (Hạ 1 bậc do có án kỷ luật)",
          color: "#0284c7",
          badgeBg: "bg-sky-100 text-sky-800",
          note: "Hạ từ Xuất sắc xuống Tốt theo Điều 12 QĐ 3385",
        };
      } else if (cumulativeRating.code === "tot") {
        cumulativeRating = {
          code: "kha",
          label: "Khá (Hạ 1 bậc do có án kỷ luật)",
          color: "#f59e0b",
          badgeBg: "bg-amber-100 text-amber-800",
          note: "Hạ từ Tốt xuống Khá theo Điều 12 QĐ 3385",
        };
      } else if (cumulativeRating.code === "kha") {
        cumulativeRating = {
          code: "trung_binh",
          label: "Trung bình (Hạ 1 bậc do có án kỷ luật)",
          color: "#f97316",
          badgeBg: "bg-orange-100 text-orange-800",
          note: "Hạ từ Khá xuống Trung bình theo Điều 12 QĐ 3385",
        };
      }
    }

    return NextResponse.json({
      hasData: true,
      totalSemesters: userSemesters.length,
      totalActivities: allRecords.length,
      cumulativeAverage,
      cumulativeRating,
      hasGraduationDisciplinePenalty,
      semesterBreakdown,
    });
  } catch (error: any) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Lỗi tải dữ liệu thống kê. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
