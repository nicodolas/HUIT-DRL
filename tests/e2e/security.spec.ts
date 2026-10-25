import { test, expect } from "@playwright/test";

test.describe("Security & OWASP Hardening Suite", () => {
  test("Reject malicious javascript: evidence URLs in records", async ({ request }) => {
    // Attempt to register temporary user
    const testUser = `sec_${Date.now()}`;
    const regRes = await request.post("/api/auth/register", {
      data: {
        username: testUser,
        password: "ValidPassword123!",
        fullName: "Security Tester",
      },
    });
    expect(regRes.status()).toBe(200);

    const loginRes = await request.post("/api/auth/login", {
      data: {
        username: testUser,
        password: "ValidPassword123!",
      },
    });
    expect(loginRes.status()).toBe(200);

    // Get active semester
    const semsRes = await request.get("/api/semesters");
    const semsData = await semsRes.json();
    expect(semsData.semesters.length).toBeGreaterThan(0);
    const semesterId = semsData.semesters[0].id;

    // 1. Try injecting javascript: URI
    const xssRes = await request.post("/api/records", {
      data: {
        semesterId,
        category: 3,
        title: "XSS Attempt Record",
        type: "add",
        points: 5,
        evidenceUrl: "javascript:alert(document.cookie)",
      },
    });
    expect(xssRes.status()).toBe(400);
    const xssData = await xssRes.json();
    expect(xssData.error).toContain("không an toàn");

    // 2. Try injecting data: URI
    const dataUriRes = await request.post("/api/records", {
      data: {
        semesterId,
        category: 3,
        title: "Data URI Attempt",
        type: "add",
        points: 5,
        evidenceUrl: "data:text/html,<script>alert(1)</script>",
      },
    });
    expect(dataUriRes.status()).toBe(400);

    // 3. Valid HTTPS Google Drive URL should succeed
    const validRes = await request.post("/api/records", {
      data: {
        semesterId,
        category: 3,
        title: "Valid Evidence Activity",
        type: "add",
        points: 5,
        evidenceUrl: "https://drive.google.com/file/d/test12345/view",
      },
    });
    expect(validRes.status()).toBe(200);
  });

  test("Rate limiting blocks excessive brute force login attempts", async ({ request }) => {
    const attackerUser = `victim_${Date.now()}`;
    let blocked = false;

    for (let i = 0; i < 12; i++) {
      const res = await request.post("/api/auth/login", {
        data: {
          username: attackerUser,
          password: `wrong_pass_${i}`,
        },
      });

      if (res.status() === 429) {
        blocked = true;
        const data = await res.json();
        expect(data.error).toContain("quá nhiều lần");
        break;
      }
    }

    expect(blocked).toBe(true);
  });

  test("HTTP Security Headers are properly set", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });
});
