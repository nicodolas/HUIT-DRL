import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const startTime = Date.now();

  try {
    // 1. Ping PostgreSQL
    await db.execute(sql`SELECT 1`);
    const dbLatencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        database: {
          status: "connected",
          latencyMs: dbLatencyMs,
          engine: "Neon Serverless PostgreSQL",
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    const errorLatencyMs = Date.now() - startTime;
    console.error("Health check failure:", error);

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        database: {
          status: "disconnected",
          latencyMs: errorLatencyMs,
          error: error.message,
        },
      },
      { status: 503 }
    );
  }
}
