import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { confirmSePayPayment, getPaidDownloadsForUser, saveProductDownloadLink } from "./db";
import type { TrpcContext } from "./_core/context";

function createMockContext(): TrpcContext {
  const user = {
    id: 1,
    openId: "test-user-123",
    email: "test@dhlstores.vn",
    name: "Test User DHL",
    loginMethod: "manus",
    role: "user" as const,
    status: "active" as const,
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
  it("fetches digital and physical categories successfully", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const categories = await caller.store.categories();
    expect(categories).toBeDefined();
    expect(categories.length).toBe(13);
    expect(categories[0]?.name).toContain("Font Chữ");
    expect(categories.map(category => category.slug)).toEqual(expect.arrayContaining([
      "quan-ao-bong-da",
      "patch-tay",
      "nameset-chong-nhiem",
    ]));
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

    // A new order must remain locked until a matching SePay payment arrives.
    expect(checkoutRes.orderCode).toMatch(/^DHL/);
    let orders = await caller.store.orders();
    expect(orders[0]?.paymentStatus).toBe("pending");
    await saveProductDownloadLink(1, "https://drive.google.com/file/d/test-resource/view");
    expect(await getPaidDownloadsForUser(1)).toHaveLength(0);

    const confirmation = await confirmSePayPayment({
      providerTransactionId: "sepay-test-001",
      transferAmount: 250000,
      transferContent: `SEVQR ${checkoutRes.orderCode}`,
      gateway: "VietinBank",
      paymentReference: "FT-TEST-001",
    });
    expect(confirmation.success).toBe(true);

    orders = await caller.store.orders();
    expect(orders[0]?.paymentStatus).toBe("paid");
    expect(orders[0]?.items?.[0]?.product?.fileUrl).toBeDefined();
    const downloads = await getPaidDownloadsForUser(1);
    expect(downloads[0]?.driveUrl).toBe("https://drive.google.com/file/d/test-resource/view");
  });
});
