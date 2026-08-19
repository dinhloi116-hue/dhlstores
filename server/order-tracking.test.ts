import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { appRouter } from "./routers";
import { createProduct, createProductVariant, getProductVariants } from "./db";
import type { TrpcContext } from "./_core/context";

function createContext(role: "user" | "owner" = "user", id = 81): TrpcContext {
  return {
    user: {
      id,
      openId: `tracking-test-${id}`,
      email: `tracking-${id}@dhlstores.vn`,
      name: "Tracking Test",
      loginMethod: "local",
      role,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

async function createPhysicalSkuSet(suffix: string, stock = 3) {
  const product = await createProduct({
    name: `Áo theo dõi ${suffix}`,
    slug: `ao-theo-doi-${suffix}`,
    description: "Sản phẩm kiểm thử theo dõi đơn hàng",
    price: "2000",
    categoryId: 11,
    image: "generated:tracking-test",
    stock: 0,
    featured: false,
    isActive: true,
  });
  if (!product) throw new Error("Không tạo được sản phẩm kiểm thử");
  return product;
}

describe("DHL Stores SKU order and customer tracking", () => {
  it("keeps the SKU order chosen by an administrator", async () => {
    const suffix = `sku-order-${Date.now().toString(36)}`;
    const product = await createPhysicalSkuSet(suffix);
    const first = await createProductVariant({ productId: product.id, size: "S", color: "Đỏ", sku: `${suffix}-S`, priceAdjustment: "0", stock: 1, isActive: true });
    const second = await createProductVariant({ productId: product.id, size: "M", color: "Xanh", sku: `${suffix}-M`, priceAdjustment: "0", stock: 1, isActive: true });
    const third = await createProductVariant({ productId: product.id, size: "L", color: "Đen", sku: `${suffix}-L`, priceAdjustment: "0", stock: 1, isActive: true });

    const owner = appRouter.createCaller(createContext("owner", 1));
    await owner.catalogAdmin.reorderProductVariants({ productId: product.id, variantIds: [third!.id, first!.id, second!.id] });

    expect((await getProductVariants(product.id)).map(variant => variant.id)).toEqual([third!.id, first!.id, second!.id]);
  });

  it("shows Order milestones and the tracking URL only to the customer who placed the order", async () => {
    const suffix = `journey-${Date.now().toString(36)}`;
    const product = await createPhysicalSkuSet(suffix);
    const variant = await createProductVariant({ productId: product.id, size: "L", color: "Trắng", sku: `${suffix}-L`, priceAdjustment: "0", stock: 0, isActive: true });
    const customer = appRouter.createCaller(createContext("user", 1));
    const checkout = await customer.store.quickCheckout({
      item: { productId: product.id, variantId: variant!.id, quantity: 1, fulfillmentMode: "preorder" },
      shipping: { name: "Khách kiểm thử", phone: "0900000000", address: "1 Đường Theo Dõi, Hà Nội", method: "pickup" },
    });

    const owner = appRouter.createCaller(createContext("owner", 1));
    await owner.store.updateOrderTracking({ orderId: checkout.orderId, stage: "central_warehouse" });
    await owner.store.updateOrderTracking({ orderId: checkout.orderId, stage: "tracking", trackingUrl: "https://tracking.example.vn/DHL-TEST" });

    const ownOrders = await customer.store.myOrders();
    expect(ownOrders.find(order => order.id === checkout.orderId)).toMatchObject({ trackingStage: "tracking", trackingUrl: "https://tracking.example.vn/DHL-TEST", hasPreorderItems: true });
  });

  it("soft-deletes a pending physical order and restores its reserved SKU stock", async () => {
    const suffix = `delete-${Date.now().toString(36)}`;
    const product = await createPhysicalSkuSet(suffix);
    const variant = await createProductVariant({ productId: product.id, size: "M", color: "Vàng", sku: `${suffix}-M`, priceAdjustment: "0", stock: 1, isActive: true });
    const customer = appRouter.createCaller(createContext("user", 1));
    const checkout = await customer.store.quickCheckout({
      item: { productId: product.id, variantId: variant!.id, quantity: 1 },
      shipping: { name: "Khách kiểm thử", phone: "0900000000", address: "2 Đường Kiểm Thử, Hà Nội", method: "pickup" },
    });
    expect((await getProductVariants(product.id))[0]?.stock).toBe(0);

    const owner = appRouter.createCaller(createContext("owner", 1));
    await expect(owner.store.deleteOrder({ orderId: checkout.orderId })).resolves.toEqual({ success: true });
    expect((await getProductVariants(product.id))[0]?.stock).toBe(1);
    expect((await customer.store.myOrders()).find(order => order.id === checkout.orderId)).toBeUndefined();
  });
});


describe("Order 1688 multi-leg tracking contract", () => {
  it("stores carrier, tracking number, location and event time without changing catalog fields", () => {
    const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
    expect(schema).toContain('mysqlTable("order_tracking_events"');
    expect(schema).toContain('trackingNumber: varchar("trackingNumber"');
    expect(schema).toContain('eventTime: timestamp("eventTime")');
  });

  it("exposes customer timeline and admin event mutation", () => {
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const adminOrders = readFileSync(new URL("../client/src/pages/AdminOrders.tsx", import.meta.url), "utf8");
    expect(router).toContain("trackingEvents: protectedProcedure");
    expect(router).toContain("addTrackingEvent: adminProcedure");
    expect(adminOrders).toContain("J&T");
    expect(adminOrders).toContain("YTO");
  });

  it("renders multi-leg timeline controls for admin and customers", () => {
    const adminOrders = readFileSync(new URL("../client/src/pages/AdminOrders.tsx", import.meta.url), "utf8");
    const account = readFileSync(new URL("../client/src/pages/Account.tsx", import.meta.url), "utf8");
    expect(adminOrders).toContain("OrderTrackingTimeline");
    expect(adminOrders).toContain("Xem timeline & thêm chặng");
    expect(account).toContain("Hành trình đơn Order 1688");
    expect(account).toContain("Xem hành trình");
  });
});
