import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { confirmSePayPayment, createProduct, createProductVariant, getPaidDownloadsForUser, getProductVariants, saveProductDownloadLink } from "./db";
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

  it("adds a physical variant, includes shipping, and moves the paid order to processing", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const suffix = Date.now().toString(36);
    const product = await createProduct({
      name: `Áo bóng đá ${suffix}`,
      slug: `ao-bong-da-${suffix}`,
      description: "Sản phẩm vật lý thử nghiệm",
      price: "100000",
      categoryId: 11,
      image: "generated:physical-cover",
      stock: 5,
      featured: true,
      isActive: true,
    });
    const variant = await createProductVariant({ productId: product!.id, size: "L", color: "Đỏ", sku: `TEST-${suffix}`, priceAdjustment: "5000", stock: 3, isActive: true });

    await caller.store.addToCart({ productId: product!.id, variantId: variant!.id, quantity: 1 });
    const checkout = await caller.store.checkout({
      totalAmount: 0,
      items: [{ productId: product!.id, variantId: variant!.id, quantity: 1, price: 0 }],
      shipping: { name: "Nguyễn Văn Test", phone: "0900000000", address: "1 Đường Kiểm Thử, TP.HCM", method: "standard" },
    });

    expect(checkout.totalAmount).toBe(135000);
    const confirmation = await confirmSePayPayment({ providerTransactionId: `sepay-physical-${suffix}`, transferAmount: 135000, transferContent: `SEVQR ${checkout.orderCode}`, gateway: "VietinBank", paymentReference: `PHYSICAL-${suffix}` });
    expect(confirmation.success).toBe(true);
    const orders = await caller.store.orders();
    expect(orders[0]).toMatchObject({ id: checkout.orderId, paymentStatus: "paid", status: "processing", hasPhysicalItems: true, shippingFee: "30000.00" });
    expect((await getProductVariants(product!.id))[0]?.stock).toBe(2);
  });

  it("cancels an expired QR order and rejects a later matching payment", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const checkout = await caller.store.checkout({ totalAmount: 0, items: [{ productId: 2, quantity: 1, price: 0 }] });

    const cancelled = await caller.store.cancelPendingOrder({ orderId: checkout.orderId });
    expect(cancelled).toEqual({ success: true, cancelled: true });
    const orders = await caller.store.orders();
    expect(orders[0]).toMatchObject({ id: checkout.orderId, status: "cancelled", paymentStatus: "pending" });

    const latePayment = await confirmSePayPayment({ providerTransactionId: `sepay-expired-${checkout.orderId}`, transferAmount: checkout.totalAmount, transferContent: `SEVQR ${checkout.orderCode}`, gateway: "VietinBank", paymentReference: "EXPIRED-TEST" });
    expect(latePayment).toEqual({ success: false, reason: "No matching pending order" });
  });
});
