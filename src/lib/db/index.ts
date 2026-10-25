import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "";

if (!connectionString) {
  console.warn("WARNING: DATABASE_URL is not set. Please check .env.local");
}

const client = neon(connectionString);
export const db = drizzle(client, { schema });
