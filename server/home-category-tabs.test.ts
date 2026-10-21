import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("homepage category tabs", () => {
  it("keeps the complete category rail inside the blue hero", () => {
    expect(homeSource).toContain('aria-label={lang === "vi" ? "Danh mục sản phẩm" : "Product categories"}');
    expect(homeSource).toContain('categories.filter(category => category.type === "physical").map');
    expect(homeSource).toContain('href="/products?type=digital"');
    expect(homeSource).toContain("<PackageCheck className=\"h-5 w-5\" />");
    expect(homeSource).not.toContain('className="border-b border-slate-200 bg-white shadow-sm"');
  });

  it("cycles product gallery images on hover without a Quick view button", () => {
    expect(homeSource).toContain("productImages(product)");
    expect(homeSource).toContain("setHoverPreview({ productId: product.id, index: 0 })");
    expect(homeSource).toContain("onMouseLeave={() => setHoverPreview(null)}");
    expect(homeSource).toContain("setInterval");
    expect(homeSource).not.toContain("Xem nhanh");
    expect(homeSource).not.toContain("Quick view");
  });
});
