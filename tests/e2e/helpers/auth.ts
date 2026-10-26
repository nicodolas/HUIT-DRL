import { generateCaptchaChallenge } from "@/lib/security/captcha";

/**
 * Helper to generate a pre-aged valid captcha token for E2E tests
 * Elapsed time is set to 2 seconds (> 1.5s threshold) so it passes backend timing verification immediately.
 */
export function getValidTestCaptchaToken(): string {
  const challenge = generateCaptchaChallenge(Date.now() - 2000);
  return challenge.token;
}
