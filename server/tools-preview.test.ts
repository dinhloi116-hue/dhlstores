import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");

describe("tools menu preview", () => {
  it("previews the tools library instead of a single legacy tool", () => {
    expect(layout).toContain("Chọn tiện ích nhanh");
    expect(layout).toContain("/tools/notebook-labels");
    expect(layout).toContain("Tạo Nhãn Vở Online");
    expect(layout).toContain("Xem tất cả");
    expect(layout).toContain("PET TRAM PRO X");
  });
});
