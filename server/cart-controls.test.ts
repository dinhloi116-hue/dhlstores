import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("cart quantity controls", () => {
  it("keeps the large category label as a direct link and the preview trigger separate", () => {
    const source = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");

    expect(source).toContain("<Link href={group.href}");
    expect(source).toContain("aria-label={`Mở danh mục ${group.label}`}");
    expect(source).toContain("group-hover:pointer-events-auto");
  });

  it("locks quantity controls while a cart update is pending", () => {
    const source = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");

    expect(source).toContain("disabled={updateCartMutation.isPending}");
    expect(source).toContain("if (updateCartMutation.isPending) return;");
    expect(source).toContain("disabled:cursor-not-allowed disabled:opacity-40");
  });
});
