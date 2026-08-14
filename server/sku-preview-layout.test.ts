import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public SKU inventory presentation", () => {
  it("keeps SKU and stock in the same compact metadata group", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain("SKU + tồn kho");
    expect(source).toContain('inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-100');
  });

  it("uses a roughly 200 percent hover preview for a 44px SKU thumbnail", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain('hidden w-44 rounded-xl');
    expect(source).toContain('h-11 w-11 overflow-hidden');
    expect(source).toContain('onMouseMove={event => { if (variant.image && window.innerWidth >= 768) updateHoveredPreview');
    expect(source).toContain('SKU hết hàng vẫn xem được ảnh');
  });

  it("places SKU inventory beside the purchase controls on wide screens", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain('xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.88fr)]');
    expect(source).toContain('{skuInventoryPanel}');
    expect(source).toContain('xl:sticky xl:top-4');
  });
});
