import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../client/src/_core/hooks/useAuth.ts", import.meta.url),
  "utf8",
);

describe("mobile auth session resume", () => {
  it("refreshes the server session after returning to the foreground", () => {
    expect(source).toContain("refetchOnWindowFocus: true");
    expect(source).toContain("refetchOnReconnect: true");
    expect(source).toContain('window.addEventListener("pageshow", refreshOnResume)');
    expect(source).toContain('window.addEventListener("focus", refreshOnResume)');
    expect(source).toContain('document.addEventListener("visibilitychange", refreshOnResume)');
  });

  it("removes lifecycle listeners and exposes the same refresh function", () => {
    expect(source).toContain('window.removeEventListener("pageshow", refreshOnResume)');
    expect(source).toContain('window.removeEventListener("focus", refreshOnResume)');
    expect(source).toContain('document.removeEventListener("visibilitychange", refreshOnResume)');
    expect(source).toContain("refresh,\n    logout,");
  });
});
