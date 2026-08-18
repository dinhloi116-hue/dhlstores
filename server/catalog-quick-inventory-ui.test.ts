import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("catalog quick inventory controls", () => {
  it("offers inventory-status filters, priority sorting, and clear warning states", () => {
    const source = readFileSync(new URL("../client/src/pages/AdminOrders.tsx", import.meta.url), "utf8");

    expect(source).toContain('const [catalogInventoryFilter, setCatalogInventoryFilter]');
    expect(source).toContain('const [catalogInventorySort, setCatalogInventorySort]');
    expect(source).toContain('catalogInventoryFilter === "low"');
    expect(source).toContain('catalogInventoryFilter === "out"');
    expect(source).toContain("Ưu tiên hàng cần xử lý");
    expect(source).toContain("SKU sắp hết");
    expect(source).toContain('<AlertTriangle className="mr-1 h-3 w-3" />');
  });

  it("supports safe inline stock changes and keeps using the audited inventory mutation", () => {
    const source = readFileSync(new URL("../client/src/pages/AdminOrders.tsx", import.meta.url), "utf8");

    expect(source).toContain("Chỉnh tồn kho nhanh");
    expect(source).toContain("Điều chỉnh nhanh từ Catalog");
    expect(source).toContain("aria-label={`Tồn kho mới ${row.variantLabel || product.name}`}");
    expect(source).toContain("changes: [{ target: row.target, id: row.id, stock: numericDraftStock }]");
    expect(source).toContain("utils.operations.inventory.invalidate()");
  });
});
