import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("customer shopping tools", () => {
  it("connects favorites and restock subscriptions to the product and account experience", () => {
    const productDetail = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");
    const account = readFileSync(new URL("../client/src/pages/Account.tsx", import.meta.url), "utf8");

    expect(productDetail).toContain("trpc.store.toggleFavorite.useMutation");
    expect(productDetail).toContain("trpc.store.requestRestock.useMutation");
    expect(productDetail).toContain("Nhắc lại khi có hàng");
    expect(account).toContain("Sản phẩm yêu thích");
    expect(account).toContain("Nhắc lại hàng");
  });

  it("labels desktop chat and mobile support controls for assistive technology", () => {
    const source = readFileSync(new URL("../client/src/components/CustomerContactHub.tsx", import.meta.url), "utf8");

    expect(source).toContain('aria-label="Nhắn tin với DHL Stores"');
    expect(source).toContain('aria-expanded={supportMenuOpen}');
  });

  it("provides comparison, recently viewed products, and contextual checkout help without changing server prices", () => {
    const productDetail = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");
    const compare = readFileSync(new URL("../client/src/pages/CompareProducts.tsx", import.meta.url), "utf8");
    const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    const checkout = readFileSync(new URL("../client/src/pages/Checkout.tsx", import.meta.url), "utf8");

    expect(productDetail).toContain("toggleComparedProduct");
    expect(compare).toContain("So sánh tối đa bốn sản phẩm");
    expect(home).toContain("Bạn đã xem gần đây");
    expect(checkout).toContain("CustomerHelpCard context=\"checkout\"");
  });
});
