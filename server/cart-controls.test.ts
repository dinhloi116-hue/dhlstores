import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("cart quantity controls", () => {
  it("keeps the desktop navigation as direct links without hover-only dropdowns", () => {
    const source = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");

    expect(source).toContain("Navigation Links: keep only the four main destinations visible.");
    expect(source).toContain('href="/products?type=physical"');
    expect(source).toContain('href="/products?type=digital"');
    expect(source).toContain('href="/tools"');
    expect(source).not.toContain("aria-label={`Mở danh mục ${group.label}`}");
  });

  it("locks quantity controls while a cart update is pending", () => {
    const source = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");

    expect(source).toContain("disabled={updateCartMutation.isPending}");
    expect(source).toContain("if (updateCartMutation.isPending) return;");
    expect(source).toContain("disabled:cursor-not-allowed disabled:opacity-40");
  });
});
