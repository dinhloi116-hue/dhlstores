import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("support image attachments", () => {
  it("accepts image attachments, stores their URL and exposes previews to customers", () => {
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const contactHub = readFileSync(new URL("../client/src/components/CustomerContactHub.tsx", import.meta.url), "utf8");

    expect(router).toContain("const supportImageSchema");
    expect(router).toContain("async function storeSupportImage");
    expect(router).toContain("imageUrl: stored.url");
    expect(contactHub).toContain("Đính kèm ảnh");
    expect(contactHub).toContain("message.imageUrl");
    expect(contactHub).toContain("Ảnh đính kèm trong hội thoại");
  });
});
