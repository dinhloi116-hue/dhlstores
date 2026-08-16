import { describe, expect, it } from "vitest";

describe("Resend credentials", () => {
  it("authenticates the configured API key without sending email", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    expect(apiKey, "RESEND_API_KEY chưa được cấu hình").toMatch(/^re_/);
    expect(fromEmail, "RESEND_FROM_EMAIL chưa được cấu hình").toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(8000),
    });

    // Payload rỗng phải bị validation từ chối; 401/403 mới là lỗi credential/quyền.
    expect(response.status, "Resend không chấp nhận quyền gửi của API key").toBe(422);
  }, 12000);
});
