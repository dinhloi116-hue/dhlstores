import { describe, expect, it } from "vitest";

describe("email provider configuration", () => {
  it("accepts the configured sending permission without sending an email", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !fromEmail) return;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(422);
    expect(fromEmail).toMatch(/@/);
  });
});
