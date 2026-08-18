import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const catalogPagePath = path.resolve(process.cwd(), "client/src/pages/Products.tsx");

describe("catalog quick filters", () => {
  it("keeps quick filters for product type and purchasable stock", async () => {
    const source = await readFile(catalogPagePath, "utf8");

    expect(source).toContain('const [catalogQuickFilter, setCatalogQuickFilter]');
    expect(source).toContain('product.type === "digital" || Number(product.stock) > 0');
    expect(source).toContain('Tài nguyên số');
    expect(source).toContain('Hàng vật lý');
    expect(source).toContain('Có thể mua ngay');
    expect(source).toContain('Hiển thị <span className="font-black text-slate-900">{products.length}</span> sản phẩm phù hợp');
    expect(source).toContain('Xóa tất cả bộ lọc');
    expect(source).toContain('const clearCatalogFilters = () =>');
  });
});
