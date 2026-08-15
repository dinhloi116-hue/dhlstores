import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { appRouter } from "./routers";
import { confirmManualPayment, confirmSePayPayment, createProduct, createProductVariant, DOWNLOAD_ACCESS_WINDOW_MS, getInstantDownloadsForOrder, getPaidDownloadsForUser, getProductVariants, getSpxShippingFee, isDownloadAccessActive, replaceProductWholesaleTiers, saveProductDownloadLink } from "./db";
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

  it("tops up wallet through SePay once and pays an order atomically from the balance", async () => {
    const caller = appRouter.createCaller(createMockContext());
    const before = Number((await caller.store.walletSummary()).balance);
    const topup = await caller.store.createWalletTopup({ amount: 300000 });
    expect(topup.topupCode).toMatch(/^DHLW/);
    expect(topup.qrUrl).toContain(topup.topupCode);

    const webhook = { providerTransactionId: `wallet-${Date.now()}`, transferAmount: 300000, transferContent: `SEVQR ${topup.topupCode}`, gateway: "VietinBank", paymentReference: "WALLET-TEST" };
    await expect(confirmSePayPayment(webhook)).resolves.toEqual({ success: true });
    await expect(confirmSePayPayment(webhook)).resolves.toEqual({ success: true, alreadyProcessed: true });
    expect(Number((await caller.store.walletSummary()).balance)).toBe(before + 300000);

    const paidOrder = await caller.store.checkout({ totalAmount: 0, items: [{ productId: 1, quantity: 1, price: 0 }], paymentMethod: "wallet_balance" });
    expect(paidOrder).toMatchObject({ paymentFlow: "wallet_balance", paymentStatus: "paid", paymentMethod: "wallet_balance" });
    const after = await caller.store.walletSummary();
    expect(Number(after.balance)).toBe(before + 300000 - paidOrder.totalAmount);
    expect(after.topups.find(item => item.topupCode === topup.topupCode)).toMatchObject({ status: "paid", providerTransactionId: webhook.providerTransactionId });
    expect(after.movements.some(item => item.reason.includes(topup.topupCode))).toBe(true);
    expect(after.movements.some(item => item.reason.includes(paidOrder.orderCode) && Number(item.amount) < 0)).toBe(true);
  });

  it("calculates checkout from the server-side 2,000 VND product price", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const suffix = Date.now().toString(36);
    const product = await createProduct({
      name: `Sản phẩm giá kiểm thử ${suffix}`,
      slug: `gia-kiem-thu-${suffix}`,
      description: "Kiểm thử giá do máy chủ xác thực",
      price: "2000",
      categoryId: 1,
      image: "generated:price-test",
      isActive: true,
    });

    const checkout = await caller.store.checkout({
      totalAmount: 999999,
      items: [{ productId: product!.id, quantity: 1, price: 999999 }],
    });
    expect(checkout.totalAmount).toBe(2000);
  });

  it("creates a VietinBank SePay QR for a digital product and unlocks downloads after automatic reconciliation", async () => {
    const customerCtx = createMockContext();
    const customerCaller = appRouter.createCaller(customerCtx);
    const directOrder = await customerCaller.store.quickCheckout({
      item: { productId: 1, quantity: 1 },
    });
    expect(directOrder.orderCode).toMatch(/^DHL/);
    expect(directOrder.totalAmount).toBe(250000);
    expect(directOrder.paymentFlow).toBe("sepay_vietinbank");

    await saveProductDownloadLink(1, "https://drive.google.com/file/d/direct-qr-resource/view");
    await expect(confirmSePayPayment({ providerTransactionId: "sepay-digital-qr", transferAmount: directOrder.totalAmount, transferContent: `SEVQR ${directOrder.orderCode}`, gateway: "VietinBank", paymentReference: "DIGITAL-QR" })).resolves.toMatchObject({ success: true });

    const orders = await customerCaller.store.orders();
    expect(orders.find(order => order.id === directOrder.orderId)).toMatchObject({ paymentStatus: "paid", status: "completed" });
    expect(await customerCaller.store.instantDownloads({ orderId: directOrder.orderId })).toMatchObject([{ driveUrl: "https://drive.google.com/file/d/direct-qr-resource/view" }]);
  });

  it("limits in-site download access to seven days after payment", () => {
    const now = Date.UTC(2026, 7, 13, 0, 0, 0);
    expect(isDownloadAccessActive(new Date(now - 7 * 24 * 60 * 60 * 1_000 + 1), now)).toBe(true);
    expect(isDownloadAccessActive(new Date(now - 7 * 24 * 60 * 60 * 1_000), now)).toBe(false);
  });

  it("calculates SPX shipping by total weight, rounding each additional kilogram up", () => {
    expect(getSpxShippingFee(0)).toBe(20_000);
    expect(getSpxShippingFee(1_000)).toBe(20_000);
    expect(getSpxShippingFee(1_001)).toBe(30_000);
    expect(getSpxShippingFee(2_000)).toBe(30_000);
    expect(getSpxShippingFee(2_001)).toBe(40_000);
  });

  it("charges SPX only for physical items in a mixed digital and physical order", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const suffix = `mixed-spx-${Date.now().toString(36)}`;
    const physical = await createProduct({ name: `Áo SPX ${suffix}`, slug: `ao-spx-${suffix}`, description: "Kiểm thử đơn hỗn hợp", price: "100000", categoryId: 11, image: "generated:mixed-spx", stock: 5, weightGrams: "1100", featured: false, isActive: true });
    const variant = await createProductVariant({ productId: physical!.id, size: "L", color: "Đen", sku: `MIX-${suffix}`, priceAdjustment: "0", stock: 5, isActive: true });
    const digital = await createProduct({ name: `Tài nguyên số ${suffix}`, slug: `tai-nguyen-so-${suffix}`, description: "Kiểm thử đơn hỗn hợp", price: "2000", categoryId: 1, image: "generated:mixed-digital", stock: 0, featured: false, isActive: true });

    const checkout = await caller.store.checkout({
      totalAmount: 0,
      items: [{ productId: physical!.id, variantId: variant!.id, quantity: 1, price: 0 }, { productId: digital!.id, quantity: 1, price: 0 }],
      shipping: { name: "Nguyễn Văn Test", phone: "0900000000", address: "1 Đường Kiểm Thử, TP.HCM" },
    });

    expect(checkout).toMatchObject({ totalAmount: 132000, shippingFee: 30000, paymentFlow: "manual_techcombank" });
    const order = (await caller.store.orders()).find(item => item.id === checkout.orderId);
    expect(order).toMatchObject({ shippingWeightGrams: 1100, shippingFee: "30000.00", hasPhysicalItems: true });
    expect(order?.items).toEqual(expect.arrayContaining([expect.objectContaining({ productId: physical!.id, weightGrams: 1100 }), expect.objectContaining({ productId: digital!.id, weightGrams: 0 })]));
  });

  it("does not return instant download links for a digital order after seven days", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const checkout = await caller.store.checkout({ totalAmount: 0, items: [{ productId: 3, quantity: 1, price: 0 }] });
    await saveProductDownloadLink(3, "https://drive.google.com/file/d/limited-window/view");
    await confirmSePayPayment({ providerTransactionId: `sepay-window-${checkout.orderId}`, transferAmount: checkout.totalAmount, transferContent: `SEVQR ${checkout.orderCode}`, gateway: "VietinBank", paymentReference: "WINDOW-TEST" });

    expect(await getInstantDownloadsForOrder(1, checkout.orderId)).toHaveLength(1);
    expect(await caller.store.instantDownloads({ orderId: checkout.orderId })).toHaveLength(1);
    const order = (await caller.store.orders()).find(item => item.id === checkout.orderId);
    expect(await getInstantDownloadsForOrder(1, checkout.orderId, (order!.paymentConfirmedAt?.getTime() ?? 0) + DOWNLOAD_ACCESS_WINDOW_MS)).toHaveLength(0);

    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue((order!.paymentConfirmedAt?.getTime() ?? 0) + DOWNLOAD_ACCESS_WINDOW_MS);
    try {
      expect(await caller.store.instantDownloads({ orderId: checkout.orderId })).toHaveLength(0);
    } finally {
      dateNowSpy.mockRestore();
    }
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
      shipping: { name: "Nguyễn Văn Test", phone: "0900000000", address: "1 Đường Kiểm Thử, TP.HCM" },
    });

    expect(checkout.totalAmount).toBe(125000);
    expect((await getProductVariants(product!.id))[0]?.stock).toBe(2);
    expect(checkout.paymentFlow).toBe("manual_techcombank");
    await expect(confirmSePayPayment({ providerTransactionId: `sepay-reject-physical-${suffix}`, transferAmount: 125000, transferContent: `SEVQR ${checkout.orderCode}`, gateway: "VietinBank", paymentReference: `REJECT-PHYSICAL-${suffix}` })).resolves.toEqual({ success: false, reason: "No matching pending order" });
    const confirmation = await confirmManualPayment(checkout.orderId, 1);
    expect(confirmation.success).toBe(true);
    const orders = await caller.store.orders();
    expect(orders[0]).toMatchObject({ id: checkout.orderId, paymentStatus: "paid", status: "processing", hasPhysicalItems: true, shippingFee: "20000.00" });
    expect((await getProductVariants(product!.id))[0]?.stock).toBe(2);
  });

  it("applies the highest eligible wholesale tier to the server-verified unit price", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const suffix = `wholesale-${Date.now().toString(36)}`;
    const product = await createProduct({ name: `Patch giá sỉ ${suffix}`, slug: `patch-gia-si-${suffix}`, description: "Kiểm thử giá sỉ theo số lượng", price: "100000", categoryId: 12, image: "generated:wholesale-cover", stock: 20, featured: false, isActive: true });
    const variant = await createProductVariant({ productId: product!.id, size: "Chuẩn", color: "Vàng", sku: `WHOLESALE-${suffix}`, priceAdjustment: "5000", stock: 20, isActive: true });
    await replaceProductWholesaleTiers({ productId: product!.id, tiers: [{ minQuantity: 5, unitPrice: "80000" }, { minQuantity: 10, unitPrice: "70000" }] });

    await expect(caller.store.productWholesaleTiers({ productId: product!.id })).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ minQuantity: 5, unitPrice: "80000.00" }), expect.objectContaining({ minQuantity: 10, unitPrice: "70000.00" })]));
    const checkout = await caller.store.checkout({ totalAmount: 1, items: [{ productId: product!.id, variantId: variant!.id, quantity: 10, price: 1 }], shipping: { name: "Nguyễn Văn Test", phone: "0900000000", address: "1 Đường Kiểm Thử, TP.HCM" } });

    expect(checkout.totalAmount).toBe(770000);
    const order = (await caller.store.orders()).find(item => item.id === checkout.orderId);
    expect(order?.items?.[0]).toMatchObject({ quantity: 10, price: "75000" });
  });

  it("applies 10% Order discount to a physical SKU without reserving or restoring in-stock inventory", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const suffix = `preorder-${Date.now().toString(36)}`;
    const product = await createProduct({ name: `Nameset Order ${suffix}`, slug: `nameset-order-${suffix}`, description: "Kiểm thử Order 7–10 ngày", price: "100000", categoryId: 13, image: "generated:preorder-cover", stock: 0, featured: false, isActive: true });
    const variant = await createProductVariant({ productId: product!.id, size: "Chuẩn", color: "Đen", sku: `PRE-${suffix}`, priceAdjustment: "5000", stock: 0, isActive: true });

    await expect(caller.store.addToCart({ productId: product!.id, variantId: variant!.id, quantity: 1, fulfillmentMode: "preorder" })).resolves.toEqual({ success: true });
    const checkout = await caller.store.checkout({ totalAmount: 0, items: [{ productId: product!.id, variantId: variant!.id, quantity: 1, price: 0, fulfillmentMode: "preorder" }], shipping: { name: "Nguyễn Văn Test", phone: "0900000000", address: "1 Đường Kiểm Thử, TP.HCM" } });

    expect(checkout.totalAmount).toBe(114500);
    expect((await getProductVariants(product!.id))[0]?.stock).toBe(0);
    const order = (await caller.store.orders()).find(item => item.id === checkout.orderId);
    expect(order).toMatchObject({ hasPhysicalItems: true, hasPreorderItems: true, preorderDiscountAmount: "10500.00", preorderEstimatedDays: "7–10 ngày" });
    expect(order?.items?.[0]).toMatchObject({ fulfillmentMode: "preorder", price: "94500" });

    await caller.store.cancelPendingOrder({ orderId: checkout.orderId });
    expect((await getProductVariants(product!.id))[0]?.stock).toBe(0);
  });

  it("reserves physical stock while a QR order is pending and restores it when the QR expires", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const suffix = `reserve-${Date.now().toString(36)}`;
    const product = await createProduct({
      name: `Patch tồn kho ${suffix}`,
      slug: `patch-ton-kho-${suffix}`,
      description: "Kiểm thử giữ tồn kho QR",
      price: "10000",
      categoryId: 12,
      image: "generated:stock-reservation",
      stock: 1,
      featured: false,
      isActive: true,
    });
    const variant = await createProductVariant({ productId: product!.id, size: "Chuẩn", color: "Vàng", sku: `STOCK-${suffix}`, priceAdjustment: "0", stock: 1, isActive: true });
    const checkout = await caller.store.checkout({
      totalAmount: 0,
      items: [{ productId: product!.id, variantId: variant!.id, quantity: 1, price: 0 }],
      shipping: { name: "Nguyễn Văn Test", phone: "0900000000", address: "1 Đường Kiểm Thử, TP.HCM" },
    });

    expect((await getProductVariants(product!.id))[0]?.stock).toBe(0);
    await expect(caller.store.addToCart({ productId: product!.id, variantId: variant!.id, quantity: 1 })).rejects.toThrow("Biến thể đã chọn không đủ tồn kho");
    await expect(caller.store.cancelPendingOrder({ orderId: checkout.orderId })).resolves.toEqual({ success: true, cancelled: true });
    expect((await getProductVariants(product!.id))[0]?.stock).toBe(1);
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
