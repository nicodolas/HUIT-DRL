import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drlCriteriaPresets } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const list = await db
      .select()
      .from(drlCriteriaPresets)
      .orderBy(asc(drlCriteriaPresets.category), asc(drlCriteriaPresets.code));

    return NextResponse.json({ presets: list });
  } catch (error: any) {
    console.error("Presets error:", error);
    return NextResponse.json(
      { error: "Lỗi tải danh mục tiêu chí: " + (error?.message || "Lỗi máy chủ") },
      { status: 500 }
    );
  }
}

