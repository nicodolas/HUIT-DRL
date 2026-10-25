/**
 * Server Environment Validation
 * Validates critical environment variables early with helpful error diagnostics.
 */

function validateEnv() {
  const databaseUrl = process.env.DATABASE_URL;
  const authSecret = process.env.AUTH_SECRET;

  const errors: string[] = [];

  if (!databaseUrl) {
    errors.push("Missing DATABASE_URL (Neon PostgreSQL connection string)");
  }

  if (!authSecret) {
    errors.push("Missing AUTH_SECRET (Required for JWT session signing)");
  } else if (authSecret.length < 32) {
    errors.push("AUTH_SECRET is too short (Must be at least 32 characters for production security)");
  }

  if (errors.length > 0 && process.env.NODE_ENV === "production") {
    console.error("❌ CRITICAL CONFIGURATION ERROR:", errors.join(", "));
  }

  return {
    DATABASE_URL: databaseUrl || "",
    DATABASE_URL_OWNER: process.env.DATABASE_URL_OWNER || databaseUrl || "",
    AUTH_SECRET: authSecret || "fallback-secret-for-development-mode-only-min32chars",
    NODE_ENV: process.env.NODE_ENV || "development",
  };
}

export const env = validateEnv();
