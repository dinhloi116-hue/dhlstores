import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile commerce UX", () => {
  it("provides a four-item mobile quick navigation with safe bottom spacing", () => {
    const layout = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");
    expect(layout).toContain("Điều hướng nhanh trên điện thoại");
    expect(layout).toContain("md:hidden");
    expect(layout).toContain("pb-16");
    expect(layout).toContain("max-md:inset-x-0");
    expect(layout).toContain("max-md:h-[min(78vh,42rem)]");
  });

  it("lazy-loads repeated home catalog images for mobile performance", () => {
    const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    expect(home).toContain("loading=\"lazy\"");
    expect(home).toContain("decoding=\"async\"");
  });

  it("falls back from broken primary product images without leaving a broken image element", () => {
    const detail = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");
    expect(detail).toContain("primaryImageFailed");
    expect(detail).toContain("onError={() => setPrimaryImageFailed(true)}");
    expect(detail).toContain("<AssetVisual categoryId={product.categoryId}");
  });

  it("keeps physical purchase actions above the mobile navigation", () => {
    const detail = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");
    expect(detail).toContain("fixed inset-x-0 bottom-16");
    expect(detail).toContain("sm:static sm:bottom-auto");
  });
});
