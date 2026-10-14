import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");

describe("tools navigation", () => {
  it("opens the complete tools library from the simplified desktop menu", () => {
    expect(layout).toContain('href="/tools"');
    expect(layout).toContain("{lang === 'vi' ? 'Công cụ' : 'Tools'}");
    expect(layout).not.toContain("Chọn tiện ích nhanh");
  });
});
