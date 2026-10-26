import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, semesters } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { randomUUID } from "crypto";
import { sanitizeText } from "@/lib/security/sanitizer";
import { verifyCaptchaSubmission } from "@/lib/security/captcha";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "client";
    const limit = 100; // Allow university NAT shared IPs & E2E suites
    const rateCheck = checkRateLimit(`register_${ip}`, limit, 60 * 1000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: `Quá nhiều yêu cầu tạo tài khoản. Vui lòng chờ ${Math.ceil(rateCheck.resetMs / 1000)} giây.` },
        { status: 429, headers: { "Retry-After": Math.ceil(rateCheck.resetMs / 1000).toString() } }
      );
    }

    const body = await req.json();
    const { username, password, fullName, faculty, className, honeypot, captchaToken } = body;

    // Invisible CAPTCHA & Zero-Friction Bot Defense Verification
    const captchaCheck = verifyCaptchaSubmission({ honeypot, token: captchaToken });
    if (!captchaCheck.success) {
      return NextResponse.json(
        { error: captchaCheck.error || "Xác thực bảo vệ không thành công." },
        { status: 400 }
      );
    }

    const cleanUsername = sanitizeText(username, 32).toLowerCase();
    const displayName = sanitizeText(fullName, 100) || cleanUsername;

    if (!cleanUsername) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên đăng nhập." },
        { status: 400 }
      );
    }

    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { error: "Tên đăng nhập phải có ít nhất 3 ký tự." },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: "Tên đăng nhập chỉ bao gồm chữ cái, số, dấu gạch dưới (_), gạch nối (-) hoặc dấu chấm (.)." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, cleanUsername))
      .limit(1);

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "Tên đăng nhập đã tồn tại. Vui lòng chọn tên đăng nhập khác." },
        { status: 409 }
      );
    }

    const userId = randomUUID();
    const passwordHash = await hashPassword(password);
    
    // SECURITY & RBAC: All public user registrations are strictly provisioned as "user"
    // Administrative accounts must only be configured directly in production database credentials.
    const userRole: "user" = "user";

    await db.insert(users).values({
      id: userId,
      username: cleanUsername,
      passwordHash,
      fullName: displayName,
      faculty: faculty ? sanitizeText(faculty, 100) : null,
      className: className ? sanitizeText(className, 50) : null,
      role: userRole,
    });

    // Check existing official system semesters created by admin
    const sysSemesters = await db
      .select({
        id: semesters.id,
        name: semesters.name,
        isCurrent: semesters.isCurrent,
        submissionDeadline: semesters.submissionDeadline,
        status: semesters.status,
      })
      .from(semesters)
      .where(eq(semesters.isSystem, true));

    let activeSemesterId = randomUUID();

    if (sysSemesters.length > 0) {
      // Provision user's personal semester records cloned from official template
      for (const sysSem of sysSemesters) {
        const userSemId = randomUUID();
        if (sysSem.isCurrent) {
          activeSemesterId = userSemId;
        }
        await db.insert(semesters).values({
          id: userSemId,
          userId,
          name: sysSem.name,
          isCurrent: sysSem.isCurrent,
          targetScore: 90,
          disciplineLevel: "none",
          submissionDeadline: sysSem.submissionDeadline,
          status: sysSem.status || "active",
          isSystem: false,
        });
      }
    } else {
      // Default initial official semester
      await db.insert(semesters).values({
        id: activeSemesterId,
        userId,
        name: "Học kỳ 1 (2025 - 2026)",
        isCurrent: true,
        targetScore: 90,
        disciplineLevel: "none",
        isSystem: false,
      });
    }

    // Return strictly necessary user fields (Least Privilege / Data Minimization)
    const sessionUser = {
      id: userId,
      username: cleanUsername,
      fullName: displayName,
      faculty: faculty ? sanitizeText(faculty, 100) : null,
      className: className ? sanitizeText(className, 50) : null,
      role: userRole,
    };

    await createSession(sessionUser);

    return NextResponse.json({
      message: "Đăng ký thành công!",
      user: sessionUser,
      semesterId: activeSemesterId,
    });
  } catch (error: any) {
    // Log complete error internally on the server, never leak stack traces to client
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tạo tài khoản. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
