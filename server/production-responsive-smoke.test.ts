import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production responsive smoke checker", () => {
  it("covers cache headers, production bundle markers, primary storefront routes and all target viewports", () => {
    const script = readFileSync(new URL("../scripts/production-responsive-smoke.mjs", import.meta.url), "utf8");

    expect(script).toContain("no-cache|no-store|must-revalidate");
    expect(script).toContain('bundle.includes("lg:hidden")');
    expect(script).toContain('bundle.includes("lg:block")');
    expect(script).toContain('bundle.includes("max-lg:inset-x-0")');
    expect(script).toContain('"/products?type=physical"');
    expect(script).toContain('"/product/fifa-asean-cup-2026-patch-tay?from_webdev=1"');
    expect(script).toContain('"/wholesale"');
    expect(script).toContain('["mobile", [390, 844]]');
    expect(script).toContain('["tablet", [863, 1013]]');
    expect(script).toContain('["desktop", [1280, 900]]');
    expect(script).toContain("scrollWidth > window.innerWidth + 1");
  });
});
