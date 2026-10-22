import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildProductImageUrls, selectRepresentativeImage } from "../client/src/lib/product-image-selection";

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
    expect(source).toContain("selectRepresentativeImage(prev, url)");
    expect(source).toContain("buildProductImageUrls(productDraft.image, productDraft.gallery, variants)");
    expect(source).toContain("Ảnh đại diện hiện tại");
    expect(source).toContain("Đã chọn ảnh đại diện mới");
  });

  it("automatically selects a different gallery image as cover without changing gallery contents", () => {
    const draft = {
      image: "https://cdn.test/cover.jpg",
      gallery: "https://cdn.test/cover.jpg\nhttps://cdn.test/detail.jpg",
    };
    const candidates = buildProductImageUrls(draft.image, draft.gallery, [
      { image: "https://cdn.test/sku.jpg" },
      { image: "generated:catalog-cover" },
    ]);
    const nextDraft = selectRepresentativeImage(draft, candidates[1]);

    expect(candidates).toEqual([
      "https://cdn.test/cover.jpg",
      "https://cdn.test/detail.jpg",
      "https://cdn.test/sku.jpg",
    ]);
    expect(nextDraft.image).toBe("https://cdn.test/detail.jpg");
    expect(nextDraft.gallery).toBe(draft.gallery);
  });
});
