import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("SKU order save flow", () => {
  it("keeps a draft order and exposes clear save and undo actions", () => {
    const source = readFileSync(new URL("../client/src/pages/AdminOrders.tsx", import.meta.url), "utf8");

    expect(source).toContain('const [variantOrderDraft, setVariantOrderDraft] = useState<number[]>([])');
    expect(source).toContain('Thứ tự SKU đã thay đổi');
    expect(source).toContain('Lưu thứ tự SKU');
    expect(source).toContain('Hoàn tác');
  });

  it("does not persist drag and arrow movements until the save action is chosen", () => {
    const source = readFileSync(new URL("../client/src/pages/AdminOrders.tsx", import.meta.url), "utf8");

    expect(source).toContain('setVariantOrderDraft(nextOrder)');
    expect(source).toContain('reorderProductVariants.mutate({ productId: selectedVariantProductId, variantIds: variantOrderDraft })');
  });

  it("offers catalog search and an always-visible save all SKU action", () => {
    const source = readFileSync(new URL("../client/src/pages/AdminOrders.tsx", import.meta.url), "utf8");

    expect(source).toContain('const [catalogSearch, setCatalogSearch] = useState("")');
    expect(source).toContain('Tên sản phẩm, SKU, biến thể, thuộc tính…');
    expect(source).toContain('Lưu toàn bộ thứ tự SKU');
    expect(source).toContain('Tìm thấy {catalogSearchResults.length} sản phẩm');
  });

  it("turns name and price sort rules into a saveable SKU order", () => {
    const source = readFileSync(new URL("../client/src/pages/AdminOrders.tsx", import.meta.url), "utf8");

    expect(source).toContain('if (skuSortMode === "manual" || variants.length === 0) return');
    expect(source).toContain('setVariantOrderDraft(ordered)');
    expect(source).toContain('setSkuSortMode("manual")');
    expect(source).toContain('const hasPendingSkuOrder = variantOrderDraft.length === savedVariantOrder.length');
  });
});
