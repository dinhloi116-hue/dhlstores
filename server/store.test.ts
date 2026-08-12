import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createMockContext(): TrpcContext {
  const user = {
    id: 1,
    openId: "test-user-123",
    email: "test@dhlstores.vn",
    name: "Test User DHL",
    loginMethod: "manus",
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("DHL Stores Digital Hub API & Checkout Flow", () => {
  it("fetches 10 digital categories successfully", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const categories = await caller.store.categories();
    expect(categories).toBeDefined();
    expect(categories.length).toBe(10);
    expect(categories[0]?.name).toContain("Font Chữ");
  });

  it("handles cart and checkout successfully without physical shipping", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // Add to cart
    const addRes = await caller.store.addToCart({
      productId: 1,
      quantity: 1,
    });
    expect(addRes.success).toBe(true);

    // Get cart
    const cart = await caller.store.cart();
    expect(cart.length).toBe(1);
    expect(cart[0]?.productId).toBe(1);

    // Checkout
    const checkoutRes = await caller.store.checkout({
      totalAmount: 250000,
      items: [
        {
          productId: 1,
          quantity: 1,
          price: 250000,
        }
      ]
    });
    expect(checkoutRes.success).toBe(true);
    expect(checkoutRes.orderId).toBeDefined();

    // Verify orders & digital download link unlocked
    const orders = await caller.store.orders();
    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0]?.paymentStatus).toBe("paid");
    expect(orders[0]?.items?.[0]?.product?.fileUrl).toBeDefined();
  });
});
