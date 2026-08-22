import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("customer UI effects", () => {
  it("provides motion that respects reduced-motion preferences plus accessible navigation controls", () => {
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
    const layout = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");

    expect(css).toContain("prefers-reduced-motion: no-preference");
    expect(css).toContain("dhl-page-enter");
    expect(layout).toContain("pageProgress");
    expect(layout).toContain("scrollProgress");
    expect(layout).toContain("Quay lên đầu trang");
    expect(layout).toContain("getComparedProductIds");
  });

  it("keeps catalog browsing in place with Quick View and only exposes real size data on product detail", () => {
    const products = readFileSync(new URL("../client/src/pages/Products.tsx", import.meta.url), "utf8");
    const detail = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");
    const contactHub = readFileSync(new URL("../client/src/components/CustomerContactHub.tsx", import.meta.url), "utf8");

    expect(products).toContain("quickViewProduct");
    expect(products).toContain("Xem chi tiết & chọn SKU");
    expect(detail).toContain("availableSizes");
    expect(detail).toContain("không áp dụng bảng số đo chung");
    expect(detail).toContain("allPhysicalSkusOutOfStock");
    expect(detail).toContain("const canRequestRestock = Boolean(allPhysicalSkusOutOfStock)");
    expect(contactHub).toContain("supportMenuOpen");
    expect(contactHub).toContain("Nhắn cửa hàng");
    expect(contactHub).toContain("Gửi góp ý");
  });
});
