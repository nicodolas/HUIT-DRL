import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function GET() {
  const startTime = Date.now();

  try {
    // 1. Ping PostgreSQL using typed Drizzle ORM query builder (100% Parameterized)
    await db.select({ id: users.id }).from(users).limit(1);
    const dbLatencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          status: "connected",
          latencyMs: dbLatencyMs,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    const errorLatencyMs = Date.now() - startTime;
    // Log internal error on the server side only
    console.error("Health check failure:", error);

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: {
          status: "disconnected",
          latencyMs: errorLatencyMs,
        },
      },
      { status: 503 }
    );
  }
}
