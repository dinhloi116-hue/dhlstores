import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { bulkSetInventory, confirmSePayPayment, createDiscountCode, createLocalUser, createOrder, createProduct, getDiscountCodes, getInventoryBoard, getInventoryMovements, getUserByUsername, validateDiscountCode } from "./db";
import type { TrpcContext } from "./_core/context";

function createContext(user: TrpcContext["user"] = null) {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"],
  } as TrpcContext;
}

function ownerContext(): TrpcContext {
  return createContext({
    id: 990001,
    openId: "local:owner-test",
    username: "owner_test",
    passwordHash: null,
    name: "Chủ cửa hàng",
    email: "owner@example.com",
    emailVerified: true,
    loginMethod: "local",
    role: "owner",
    status: "active",
    balance: "0",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  });
}

describe("advanced operations", () => {
  it("limits the operations center to the owner role", async () => {
    const member = await createLocalUser({ username: `member_${Date.now()}`, passwordHash: "scrypt$test$test" });
    await expect(appRouter.createCaller(createContext(member)).operations.overview()).rejects.toMatchObject({ message: "Chỉ chủ cửa hàng mới có quyền thực hiện thao tác này" });
    await expect(appRouter.createCaller(ownerContext()).operations.overview()).resolves.toMatchObject({ members: expect.any(Number) });
  });

  it("lets only the owner create a local customer account for testing", async () => {
    const username = `customer_test_${Date.now()}`;
    const owner = appRouter.createCaller(ownerContext());
    await expect(owner.operations.createTestCustomer({ username, password: "customer-pass-123", name: "Khách thử" })).resolves.toMatchObject({ username, name: "Khách thử", role: "user", status: "active" });
    const member = await createLocalUser({ username: `member_${Date.now()}`, passwordHash: "scrypt$test$test" });
    await expect(appRouter.createCaller(createContext(member)).operations.createTestCustomer({ username: `${username}_x`, password: "customer-pass-123" })).rejects.toMatchObject({ message: "Chỉ chủ cửa hàng mới có quyền thực hiện thao tác này" });
  });

  it("rejects legacy admin accounts from every management procedure", async () => {
    const member = await createLocalUser({ username: `inventory_admin_${Date.now()}`, passwordHash: "scrypt$test$test" });
    const admin = { ...member, role: "admin" as const };
    const caller = appRouter.createCaller(createContext(admin));
    await expect(caller.operations.inventory()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.store.usersList()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.store.orders()).resolves.toEqual(expect.any(Array));
  });

  it("creates a discount, validates it server-side, and records an owner balance adjustment", async () => {
    const username = `credit_${Date.now()}`;
    const member = await createLocalUser({ username, passwordHash: "scrypt$test$test" });
    const owner = appRouter.createCaller(ownerContext());
    const code = `DHL${Date.now()}`;
    await expect(owner.operations.createDiscountCode({ code, type: "percent", value: 10, minOrderAmount: 100000, maxUses: 3, isActive: true })).resolves.toMatchObject({ success: true });
    await expect(validateDiscountCode(code, 200000)).resolves.toMatchObject({ code, amount: 20000 });
    await expect(owner.operations.adjustBalance({ userId: member.id, amount: 50000, reason: "Quà thành viên" })).resolves.toMatchObject({ success: true, balance: "50000.00" });
    expect((await getUserByUsername(username))?.balance).toBe("50000.00");
    await expect(owner.operations.adminActivity({ userId: member.id })).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ targetId: member.id, action: "balance_adjusted" })]));
  });

  it("allows the owner to adjust their own balance", async () => {
    const ownerRecord = await createLocalUser({ username: `owner_wallet_${Date.now()}`, passwordHash: "scrypt$test$test" });
    const owner = appRouter.createCaller(createContext({ ...ownerRecord, role: "owner" }));
    await expect(owner.operations.adjustBalance({ userId: ownerRecord.id, amount: 5000, reason: "Nạp thử ví chủ cửa hàng" })).resolves.toMatchObject({ success: true, balance: "5000.00" });
    expect((await getUserByUsername(ownerRecord.username!))?.balance).toBe("5000.00");
  });

  it("exposes catalog storage summary only to the owner", async () => {
    const owner = appRouter.createCaller(ownerContext());
    await expect(owner.operations.storageSummary()).resolves.toMatchObject({ fileCount: expect.any(Number), totalBytes: expect.any(Number) });
  });

  it("uses a valid discount code when calculating the QR payment total", async () => {
    const code = `QR${Date.now()}`;
    await createDiscountCode({ code, type: "percent", value: 10, minOrderAmount: 0, createdByUserId: 990001 });
    const order = await createOrder(1, { totalAmount: 0, discountCode: code, items: [{ productId: 1, quantity: 1, price: 0 }] });
    expect(order.totalAmount).toBe(225000);
    expect((await getDiscountCodes()).find(item => item.code === code)?.usedCount).toBe(0);
    await expect(confirmSePayPayment({ providerTransactionId: `discount-${order.orderId}`, transferAmount: order.totalAmount, transferContent: `SEVQR ${order.orderCode}`, gateway: "TEST" })).resolves.toEqual({ success: true });
    expect((await getDiscountCodes()).find(item => item.code === code)?.usedCount).toBe(1);
  });

  it("updates physical inventory in bulk and records an audit movement", async () => {
    const product = await createProduct({ name: "Patch kiểm thử", slug: `patch-${Date.now()}`, price: "50000", categoryId: 12, image: "generated:catalog-cover", stock: 8, featured: false, isActive: true });
    if (!product) throw new Error("Không tạo được sản phẩm kiểm thử");
    await expect(bulkSetInventory({ changes: [{ target: "product", id: product.id, stock: 21 }], reason: "Nhập kho đầu kỳ", performedByUserId: 990001 })).resolves.toMatchObject({ success: true, updated: 1 });
    expect((await getInventoryBoard()).find(row => row.id === product.id)?.stock).toBe(21);
    expect((await getInventoryMovements()).some(row => row.productId === product.id && row.quantityBefore === 8 && row.quantityAfter === 21)).toBe(true);
  });

  it("lets only the owner create an order from warehouse SKU and records the inventory deduction", async () => {
    const customer = await createLocalUser({ username: `admin_order_customer_${Date.now()}`, passwordHash: "scrypt$test$test", name: "Khách tạo đơn" });
    const product = await createProduct({ name: "Áo tạo đơn quản trị", slug: `admin-order-${Date.now()}`, price: "120000", categoryId: 12, image: "generated:catalog-cover", stock: 4, featured: false, isActive: true });
    if (!product) throw new Error("Không tạo được sản phẩm kiểm thử");
    const caller = appRouter.createCaller(ownerContext());

    await expect(caller.store.createAdminOrder({ customerId: customer.id, items: [{ productId: product.id, quantity: 2 }], shipping: { name: "Khách tạo đơn", phone: "0963888888", address: "Hà Nội" } })).resolves.toMatchObject({ success: true, hasPhysicalItems: true });
    expect((await getInventoryBoard()).find(row => row.productId === product.id && row.target === "product")?.stock).toBe(2);
    expect((await getInventoryMovements()).some(row => row.productId === product.id && row.quantityBefore === 4 && row.quantityAfter === 2 && row.performedByUserId === 990001 && row.reason.includes("Tạo đơn quản trị"))).toBe(true);
  });
});
