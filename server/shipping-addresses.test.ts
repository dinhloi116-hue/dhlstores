import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(user: TrpcContext["user"] = null) {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"],
  } as TrpcContext;
}

describe("shipping addresses", () => {
  it("lưu địa chỉ mặc định, chuyển mặc định an toàn và chỉ cho chủ sở hữu chỉnh sửa", async () => {
    const username = `address_${Date.now()}`;
    const registration = await appRouter.createCaller(createContext()).auth.register({ username, password: "ShippingAddress#2026", email: `${username}@example.com`, name: "Khách giao hàng" });
    const caller = appRouter.createCaller(createContext(registration.user as TrpcContext["user"]));

    const first = await caller.store.createShippingAddress({ recipientName: "Nguyễn Minh", phone: "0901234567", address: "12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh" });
    const second = await caller.store.createShippingAddress({ recipientName: "Nguyễn Minh", phone: "0901234567", address: "88 Lê Lợi, Quận 1, TP. Hồ Chí Minh", isDefault: true });
    const afterSecond = await caller.store.shippingAddresses();

    expect(afterSecond).toEqual(expect.arrayContaining([expect.objectContaining({ id: first.id, isDefault: false }), expect.objectContaining({ id: second.id, isDefault: true })]));
    const otherUsername = `other_${Date.now()}`;
    const otherRegistration = await appRouter.createCaller(createContext()).auth.register({ username: otherUsername, password: "OtherShipping#2026", email: `${otherUsername}@example.com`, name: "Khách khác" });
    await expect(appRouter.createCaller(createContext(otherRegistration.user as TrpcContext["user"])).store.updateShippingAddress({ id: second.id, data: { recipientName: "Không được sửa", phone: "0912345678", address: "Địa chỉ không thuộc sở hữu" } })).rejects.toMatchObject({ code: "NOT_FOUND" });

    await caller.store.deleteShippingAddress({ id: second.id });
    await expect(caller.store.shippingAddresses()).resolves.toEqual([expect.objectContaining({ id: first.id, isDefault: true })]);
  });

  it("owner có thể tìm qua dữ liệu và sửa/xóa địa chỉ của khách với thay thế mặc định an toàn", async () => {
    const username = `owner_address_${Date.now()}`;
    const registration = await appRouter.createCaller(createContext()).auth.register({ username, password: "OwnerAddress#2026", email: `${username}@example.com`, name: "Khách quản trị" });
    const customer = registration.user as TrpcContext["user"];
    const owner = { ...customer, id: 999999, role: "owner" as const, name: "Chủ cửa hàng" };
    const ownerCaller = appRouter.createCaller(createContext(owner));
    const first = await ownerCaller.store.createCustomerShippingAddress({ customerId: customer.id, data: { recipientName: "Người nhận A", phone: "0900000001", address: "Hà Nội", isDefault: true } });
    const second = await ownerCaller.store.createCustomerShippingAddress({ customerId: customer.id, data: { recipientName: "Người nhận B", phone: "0900000002", address: "Đà Nẵng" } });
    const updated = await ownerCaller.store.updateCustomerShippingAddress({ customerId: customer.id, id: second.id, data: { recipientName: "Người nhận B đã sửa", phone: "0900000003", address: "TP. Hồ Chí Minh", isDefault: true } });
    expect(updated).toMatchObject({ id: second.id, recipientName: "Người nhận B đã sửa", isDefault: true });
    await ownerCaller.store.deleteCustomerShippingAddress({ customerId: customer.id, id: second.id });
    await expect(ownerCaller.store.customerShippingAddresses({ customerId: customer.id })).resolves.toEqual([expect.objectContaining({ id: first.id, isDefault: true })]);
  });
});
