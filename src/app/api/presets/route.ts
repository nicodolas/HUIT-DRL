import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drlCriteriaPresets } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const list = await db
      .select({
        id: drlCriteriaPresets.id,
        category: drlCriteriaPresets.category,
        code: drlCriteriaPresets.code,
        title: drlCriteriaPresets.title,
        type: drlCriteriaPresets.type,
        points: drlCriteriaPresets.points,
        maxPointsCategory: drlCriteriaPresets.maxPointsCategory,
        unit: drlCriteriaPresets.unit,
        description: drlCriteriaPresets.description,
      })
      .from(drlCriteriaPresets)
      .orderBy(asc(drlCriteriaPresets.category), asc(drlCriteriaPresets.code));

    return NextResponse.json({ presets: list });
  } catch (error: any) {
    console.error("Presets error:", error);
    return NextResponse.json(
      { error: "Lỗi tải danh mục tiêu chí. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
