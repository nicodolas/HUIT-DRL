import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drlCriteriaPresets } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { DEFAULT_HUIT_PRESETS, mergeWithCustomPresets } from "@/lib/presets/default-presets";

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

    const finalPresets = list && list.length > 0 ? mergeWithCustomPresets(list) : DEFAULT_HUIT_PRESETS;

    return NextResponse.json(
      { presets: finalPresets, source: "db_merged" },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error: any) {
    console.warn("Presets DB query failed, falling back to static baseline:", error?.message || error);
    // Graceful offline fallback: Never return 500 when static baseline is available
    return NextResponse.json(
      { presets: DEFAULT_HUIT_PRESETS, source: "static_fallback" },
      {
        headers: {
          "Cache-Control": "public, max-age=300",
        },
      }
    );
  }
}
