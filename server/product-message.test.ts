import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const detailSource = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");
const hubSource = readFileSync(new URL("../client/src/components/CustomerContactHub.tsx", import.meta.url), "utf8");

describe("product messaging CTA", () => {
  it("offers the internal shop message CTA on every product detail", () => {
    expect(detailSource).toContain("Để lại lời nhắn cho shop");
    expect(detailSource).toContain("dhlstores-open-product-chat");
    expect(detailSource).toContain("productName: catalogName(product, lang)");
    expect(detailSource).toContain("productSlug: product.slug");
    expect(detailSource).toContain('https://wa.me/84963898871');
    expect(detailSource).toContain('Message on WhatsApp');
  });

  it("opens the existing internal conversation with product context", () => {
    expect(hubSource).toContain("dhlstores-open-product-chat");
    expect(hubSource).toContain("Tôi muốn hỏi về sản phẩm:");
    expect(hubSource).toContain("trpc.support.send.useMutation");
    expect(hubSource).not.toContain("zalo.me");
  });

  it("localizes the inline checkout modal for English visitors", () => {
    expect(detailSource).toContain('lang === "vi" ? "Thanh toán ngay tại trang sản phẩm" : "Checkout on product page"');
    expect(detailSource).toContain('lang === "vi" ? "Phương thức thanh toán" : "Payment method"');
    expect(detailSource).toContain('lang === "vi" ? "Thanh toán bằng số dư ví" : "Pay with wallet balance"');
    expect(detailSource).toContain('lang === "vi" ? "HIỆN QR THANH TOÁN" : "SHOW PAYMENT QR"');
  });

  it("localizes storefront actions and supporting labels for English visitors", () => {
    expect(detailSource).toContain("lang === 'vi' ? 'Yêu thích' : 'Favorite'");
    expect(detailSource).toContain("lang === 'vi' ? 'So sánh' : 'Compare'");
    expect(detailSource).toContain("lang === 'vi' ? 'Sản phẩm thường được mua kèm' : 'Frequently bought together'");
    expect(detailSource).toContain("lang === 'vi' ? 'Dung lượng tệp' : 'File size'");
    expect(detailSource).not.toMatch(/>Yêu thích<|>So sánh<|>Sản phẩm thường được mua kèm<|>Đánh giá sản phẩm</);
  });
});
