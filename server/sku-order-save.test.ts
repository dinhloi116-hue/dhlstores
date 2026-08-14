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
});
