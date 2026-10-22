import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("admin product image and category controls", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/pages/AdminOrders.tsx"), "utf8");

  it("exposes a dedicated representative-image control with upload, preview and URL input", () => {
    expect(source).toContain("Ảnh đại diện sản phẩm");
    expect(source).toContain("Đổi ảnh đại diện");
    expect(source).toContain("URL ảnh đại diện sản phẩm");
    expect(source).toContain("Xem trước ảnh đại diện");
    expect(source).toContain('selectFile("image")');
  });

  it("filters the admin catalog by the existing product category", () => {
    expect(source).toContain("catalogCategoryFilter");
    expect(source).toContain("catalog-category-filter");
    expect(source).toContain("product.categoryId !== catalogCategoryFilter");
    expect(source).toContain("selectedCategoryName(product.categoryId)");
  });

  it("lets the owner choose one existing gallery image as the cover", () => {
    expect(source).toContain("galleryImageUrls");
    expect(source).toContain("Chọn ảnh trong gallery/SKU làm ảnh đại diện");
    expect(source).toContain("Dùng ảnh này làm ảnh đại diện");
    expect(source).toContain("setProductDraft(prev => ({ ...prev, image: url }))");
    expect(source).toContain("Ảnh đại diện hiện tại");
    expect(source).toContain("variants.map(variant => variant.image || \"\")");
    expect(source).toContain("Đã chọn ảnh đại diện mới");
  });
});
