import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { getSessionCookieOptions } from "./_core/cookies";

function request(protocol: string, headers: Record<string, string> = {}) {
  return { protocol, headers } as unknown as Request;
}

describe("session cookie security behind proxies", () => {
  it("marks cookies secure for direct HTTPS requests", () => {
    expect(getSessionCookieOptions(request("https"))).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
    });
  });

  it("marks cookies secure when TLS terminates before Express", () => {
    expect(getSessionCookieOptions(request("http", { origin: "https://preview.example.com" })).secure).toBe(true);
    expect(getSessionCookieOptions(request("http", { referer: "https://preview.example.com/product/1" })).secure).toBe(true);
    expect(getSessionCookieOptions(request("http", { "x-forwarded-proto": "https" })).secure).toBe(true);
  });

  it("does not force Secure for genuine local HTTP requests", () => {
    expect(getSessionCookieOptions(request("http", { origin: "http://localhost:3000" })).secure).toBe(false);
  });
});
