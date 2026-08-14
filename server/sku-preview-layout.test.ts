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
    expect(source).toContain('image.addEventListener("pointerenter", showPreview)');
    expect(source).toContain('id="sku-inventory-panel"');
    expect(source).toContain('SKU hết hàng vẫn xem được ảnh');
  });

  it("keeps SKU inventory in the purchase flow without narrowing either panel", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain('className="space-y-4">{optionGroups.map');
    expect(source).toContain('{skuInventoryPanel}');
    expect(source).toContain('id="product-purchase-actions"');
    expect(source).toContain('purchaseModes.after(purchaseActions)');
    expect(source).toContain('purchaseActions.after(panel)');
    expect(source).toContain('max-h-72 overflow-y-auto');
    expect(source).toContain('lg:col-span-7 space-y-6');
  });
});
