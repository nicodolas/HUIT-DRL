import { NextResponse } from "next/server";
import { generateCaptchaChallenge } from "@/lib/security/captcha";

export async function GET() {
  const challenge = generateCaptchaChallenge();
  return NextResponse.json(
    { token: challenge.token },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
