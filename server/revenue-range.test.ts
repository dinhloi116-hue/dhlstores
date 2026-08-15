import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin revenue range selector", () => {
  it("offers all requested periods and filters paid orders by their creation time", () => {
    const source = readFileSync(new URL("../client/src/pages/AdminOrders.tsx", import.meta.url), "utf8");

    expect(source).toContain('const [revenueRange, setRevenueRange]');
    expect(source).toContain('today: "Hôm nay"');
    expect(source).toContain('"7d": "7 ngày"');
    expect(source).toContain('"30d": "30 ngày"');
    expect(source).toContain('month: "Tháng này"');
    expect(source).toContain('year: "Năm nay"');
    expect(source).toContain('new Date(order.createdAt).getTime() >= revenueStart.getTime()');
  });

  it("separates paid revenue between digital and physical product lines", () => {
    const source = readFileSync(new URL("../client/src/pages/AdminOrders.tsx", import.meta.url), "utf8");

    expect(source).toContain("const revenueByType = paidOrdersInRange.reduce");
    expect(source).toContain('product.id === item.productId)?.type === "physical"');
    expect(source).toContain("Sản phẩm số");
    expect(source).toContain("Hàng vật lý");
    expect(source).toContain("formatCurrency(revenueByType.digital)");
    expect(source).toContain("formatCurrency(revenueByType.physical)");
  });
});
