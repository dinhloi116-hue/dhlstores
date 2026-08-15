import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("cart quantity controls", () => {
  it("locks quantity controls while a cart update is pending", () => {
    const source = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");

    expect(source).toContain("disabled={updateCartMutation.isPending}");
    expect(source).toContain("if (updateCartMutation.isPending) return;");
    expect(source).toContain("disabled:cursor-not-allowed disabled:opacity-40");
  });
});
