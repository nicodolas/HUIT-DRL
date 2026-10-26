import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { env } from "@/lib/env";

const SECRET_KEY = new TextEncoder().encode(env.AUTH_SECRET);

const COOKIE_NAME = "huit_drl_session";

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  studentId?: string | null;
  faculty?: string | null;
  className?: string | null;
  role: "user" | "admin";
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    studentId: user.studentId,
    faculty: user.faculty,
    className: user.className,
    role: user.role || "user",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET_KEY);

  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  } catch {
    // If called in contexts where cookies cannot be written, token is still returned
  }

  return token;
}

export async function getSession(req?: Request): Promise<SessionUser | null> {
  let token: string | undefined;

  // 1. Try reading from Next.js cookie store
  try {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  } catch {
    // Ignore cookieStore errors
  }

  // 2. If no cookie (e.g. Android WebView / Cross-origin mobile API call), check Authorization header
  if (!token) {
    if (req) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    } else {
      try {
        const headerStore = await headers();
        const authHeader = headerStore.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.substring(7).trim();
        }
      } catch {
        // Ignore headerStore errors
      }
    }
  }

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: payload.id as string,
      username: (payload.username as string) || (payload.fullName as string) || "user",
      fullName: (payload.fullName as string) || (payload.username as string) || "Người dùng",
      studentId: (payload.studentId as string) || null,
      faculty: payload.faculty as string | null,
      className: payload.className as string | null,
      role: (payload.role as "user" | "admin") || "user",
    };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
  } catch {
    // Ignore
  }
}
