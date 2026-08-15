import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public SKU inventory presentation", () => {
  it("keeps SKU and stock in the same compact metadata group", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain("SKU + tồn kho");
    expect(source).toContain('inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-100');
  });

  it("opens a hover preview from the whole SKU row when that SKU has an image", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain('data-sku-preview-variant={variant.image ? variant.id : undefined}');
    expect(source).toContain('querySelectorAll<HTMLButtonElement>("[data-sku-preview-variant]")');
    expect(source).toContain('const variantId = Number(row.dataset.skuPreviewVariant)');
    expect(source).toContain('h-11 w-11 overflow-hidden');
    expect(source).toContain('id="sku-inventory-panel"');
    expect(source).toContain('bất kỳ vùng nào của SKU có ảnh');
    expect(source).toContain('SKU hết hàng vẫn xem được ảnh');
  });

  it("keeps SKU inventory in the purchase flow without narrowing either panel", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain('className="space-y-4">{optionGroups.map');
    expect(source).toContain('{skuInventoryPanel}');
    expect(source).toContain('id="product-purchase-actions"');
    expect(source).not.toContain('purchaseModes.after(purchaseActions)');
    expect(source).not.toContain('purchaseActions.after(panel)');
    expect(source).toContain('panel.before(purchaseActions)');
    expect(source).toContain('max-h-72 overflow-y-auto');
    expect(source).toContain('lg:col-span-7 lg:h-full lg:overflow-y-auto lg:pr-3');
  });

  it("zooms the main product image on desktop hover without changing mobile behavior", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain('md:cursor-zoom-in');
    expect(source).toContain('md:group-hover:scale-[1.65]');
    expect(source).toContain('Rê chuột để phóng to');
  });

  it("shows calculated SPX shipping and does not offer obsolete shipping methods", () => {
    const source = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

    expect(source).toContain("const estimatedSpxFee");
    expect(source).toContain("Giao hàng SPX ước tính");
    expect(source).toContain("Giao hàng SPX tự tính");
    expect(source).not.toContain("Nhận tại cửa hàng — 0 đ");
    expect(source).not.toContain("Giao nhanh — 50.000 đ");
  });
});
