import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("DHL Stores responsive UX regressions", () => {
  it("keeps header actions compact and non-shrinking on narrow screens", () => {
    const layout = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");
    expect(layout).toContain("gap-2 px-2 sm:h-[4.5rem]");
    expect(layout).toContain("h-9 w-9 shrink-0");
    expect(layout).toContain("hidden text-sm leading-none sm:inline");
    expect(layout).toContain("relative h-9 shrink-0");
  });

  it("does not label an owner as a generic customer when the profile name is missing", () => {
    const account = readFileSync(new URL("../client/src/pages/Account.tsx", import.meta.url), "utf8");
    expect(account).toContain("user?.role === 'owner'");
    expect(account).toContain("DHL Stores Owner");
    expect(account).toContain("Chủ cửa hàng DHL Stores");
  });
});
